import { performance } from "node:perf_hooks";
import {
  FailureReason,
  MonitorStatus,
  type MonitoredUrl,
} from "@prisma/client";
import pLimit from "p-limit";
import { v4 as uuidv4 } from "uuid";
import { env } from "../config/env";
import { logger } from "../lib/logger";
import { prisma } from "../lib/prisma";
import { emitToUser } from "../lib/socket";
import { buildDashboardData } from "./dashboardService";

type CheckResultPayload = {
  status: MonitorStatus;
  httpStatus: number | null;
  responseTimeMs: number | null;
  checkedAt: Date;
  errorMessage: string | null;
  failureReason: FailureReason | null;
  correlationId: string;
};

function getStartOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function classifyFailure(error: unknown) {
  if (error instanceof Error && error.message.startsWith("Invalid URL")) {
    return FailureReason.INVALID_URL;
  }

  const typedError = error as Error & { cause?: { code?: string } };
  const code = typedError.cause?.code;

  if (typedError.name === "TimeoutError" || typedError.name === "AbortError") {
    return FailureReason.TIMEOUT;
  }

  if (code === "ENOTFOUND" || code === "EAI_AGAIN") {
    return FailureReason.DNS;
  }

  return FailureReason.UNKNOWN_ERROR;
}

async function persistCheck(monitoredUrl: MonitoredUrl, payload: CheckResultPayload) {
  const reportDate = getStartOfDay(payload.checkedAt);

  await prisma.$transaction(async (tx) => {
    await tx.checkResult.create({
      data: {
        monitoredUrlId: monitoredUrl.id,
        status: payload.status,
        httpStatus: payload.httpStatus,
        responseTimeMs: payload.responseTimeMs,
        checkedAt: payload.checkedAt,
        errorMessage: payload.errorMessage,
        failureReason: payload.failureReason,
        correlationId: payload.correlationId,
      },
    });

    await tx.monitoredUrl.update({
      where: { id: monitoredUrl.id },
      data: {
        lastStatus: payload.status,
        lastResponseTimeMs: payload.responseTimeMs,
        lastCheckedAt: payload.checkedAt,
        nextCheckAt: monitoredUrl.scheduleEnabled
          ? new Date(payload.checkedAt.getTime() + monitoredUrl.intervalMinutes * 60_000)
          : monitoredUrl.nextCheckAt,
      },
    });

    const existing = await tx.aggregatedReport.findUnique({
      where: {
        monitoredUrlId_reportDate: {
          monitoredUrlId: monitoredUrl.id,
          reportDate,
        },
      },
    });

    const responseSamples = (existing?.responseSamples ?? 0) + (payload.responseTimeMs != null ? 1 : 0);
    const totalChecks = (existing?.totalChecks ?? 0) + 1;
    const successfulChecks =
      (existing?.successfulChecks ?? 0) + (payload.status === MonitorStatus.UP ? 1 : 0);
    const failureCount = totalChecks - successfulChecks;
    const responseSum =
      (existing?.avgResponseTimeMs ?? 0) * (existing?.responseSamples ?? 0) +
      (payload.responseTimeMs ?? 0);
    const avgResponseTimeMs = responseSamples > 0 ? responseSum / responseSamples : 0;
    const uptimePercentage = totalChecks > 0 ? (successfulChecks / totalChecks) * 100 : 0;

    if (existing) {
      await tx.aggregatedReport.update({
        where: {
          monitoredUrlId_reportDate: {
            monitoredUrlId: monitoredUrl.id,
            reportDate,
          },
        },
        data: {
          totalChecks,
          successfulChecks,
          failureCount,
          responseSamples,
          avgResponseTimeMs,
          uptimePercentage,
        },
      });
      return;
    }

    await tx.aggregatedReport.create({
      data: {
        monitoredUrlId: monitoredUrl.id,
        reportDate,
        totalChecks,
        successfulChecks,
        failureCount,
        responseSamples,
        avgResponseTimeMs,
        uptimePercentage,
      },
    });
  });
}

async function executeHealthCheck(monitoredUrl: MonitoredUrl) {
  const correlationId = uuidv4();
  const checkedAt = new Date();

  try {
    const parsed = new URL(monitoredUrl.address);

    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error(`Invalid URL protocol: ${monitoredUrl.address}`);
    }

    const startedAt = performance.now();
    const response = await fetch(parsed.toString(), {
      signal: AbortSignal.timeout(env.CHECK_TIMEOUT_MS),
      redirect: "follow",
    });
    const responseTimeMs = Math.round(performance.now() - startedAt);

    const payload: CheckResultPayload = {
      status: response.ok ? MonitorStatus.UP : MonitorStatus.DOWN,
      httpStatus: response.status,
      responseTimeMs,
      checkedAt,
      errorMessage: response.ok ? null : `HTTP ${response.status}`,
      failureReason: response.ok ? null : FailureReason.HTTP_ERROR,
      correlationId,
    };

    await persistCheck(monitoredUrl, payload);
    logger.info(
      {
        correlationId,
        userId: monitoredUrl.userId,
        urlId: monitoredUrl.id,
        address: monitoredUrl.address,
        status: payload.status,
        httpStatus: payload.httpStatus,
        responseTimeMs,
      },
      "health check completed",
    );

    return payload;
  } catch (error) {
    const payload: CheckResultPayload = {
      status: MonitorStatus.DOWN,
      httpStatus: null,
      responseTimeMs: null,
      checkedAt,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      failureReason: classifyFailure(error),
      correlationId,
    };

    await persistCheck(monitoredUrl, payload);
    logger.warn(
      {
        correlationId,
        userId: monitoredUrl.userId,
        urlId: monitoredUrl.id,
        address: monitoredUrl.address,
        error: payload.errorMessage,
        failureReason: payload.failureReason,
      },
      "health check failed",
    );

    return payload;
  }
}

async function publishUserUpdates(userIds: Iterable<string>) {
  const uniqueUserIds = Array.from(new Set(userIds));

  await Promise.all(
    uniqueUserIds.map(async (userId) => {
      const snapshot = await buildDashboardData(userId);
      emitToUser(userId, "monitor:update", snapshot);
    }),
  );
}

export async function runChecksForUser(userId: string, urlIds?: string[]) {
  const monitoredUrls = await prisma.monitoredUrl.findMany({
    where: {
      userId,
      ...(urlIds && urlIds.length > 0 ? { id: { in: urlIds } } : {}),
    },
  });

  const limit = pLimit(env.CHECK_CONCURRENCY);
  const settled = await Promise.allSettled(
    monitoredUrls.map((monitoredUrl) => limit(() => executeHealthCheck(monitoredUrl))),
  );

  await publishUserUpdates([userId]);

  return {
    requested: monitoredUrls.length,
    completed: settled.filter((entry) => entry.status === "fulfilled").length,
    failed: settled.filter((entry) => entry.status === "rejected").length,
  };
}

export async function runScheduledChecks() {
  const dueUrls = await prisma.monitoredUrl.findMany({
    where: {
      scheduleEnabled: true,
      nextCheckAt: {
        lte: new Date(),
      },
    },
  });

  if (dueUrls.length === 0) {
    return {
      scheduled: 0,
      completed: 0,
    };
  }

  const limit = pLimit(env.CHECK_CONCURRENCY);
  const settled = await Promise.allSettled(dueUrls.map((url) => limit(() => executeHealthCheck(url))));

  await publishUserUpdates(dueUrls.map((url) => url.userId));

  return {
    scheduled: dueUrls.length,
    completed: settled.filter((entry) => entry.status === "fulfilled").length,
  };
}
