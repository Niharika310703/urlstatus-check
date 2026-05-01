import { MonitorStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/errorHandler";

function round(value: number) {
  return Number(value.toFixed(2));
}

export async function buildDashboardData(userId: string) {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const [urls, reports, recentActivity] = await Promise.all([
    prisma.monitoredUrl.findMany({
      where: { userId },
      orderBy: [{ updatedAt: "desc" }],
    }),
    prisma.aggregatedReport.findMany({
      where: {
        monitoredUrl: { userId },
        reportDate: { gte: sevenDaysAgo },
      },
      orderBy: { reportDate: "asc" },
      include: {
        monitoredUrl: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
    }),
    prisma.checkResult.findMany({
      where: { monitoredUrl: { userId } },
      orderBy: { checkedAt: "desc" },
      take: 12,
      include: {
        monitoredUrl: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
    }),
  ]);

  const totalUrls = urls.length;
  const failures = urls.filter((url) => url.lastStatus === MonitorStatus.DOWN).length;
  const activeSchedules = urls.filter((url) => url.scheduleEnabled).length;
  const responseTimes = urls.flatMap((url) => (url.lastResponseTimeMs != null ? [url.lastResponseTimeMs] : []));
  const averageResponseTimeMs =
    responseTimes.length > 0
      ? round(responseTimes.reduce((sum, current) => sum + current, 0) / responseTimes.length)
      : 0;

  const totals = reports.reduce(
    (accumulator, report) => {
      accumulator.totalChecks += report.totalChecks;
      accumulator.successfulChecks += report.successfulChecks;
      accumulator.responseSum += report.avgResponseTimeMs * report.responseSamples;
      accumulator.responseSamples += report.responseSamples;
      return accumulator;
    },
    { totalChecks: 0, successfulChecks: 0, responseSum: 0, responseSamples: 0 },
  );

  const uptimePercentage =
    totals.totalChecks > 0 ? round((totals.successfulChecks / totals.totalChecks) * 100) : 0;

  const trendMap = new Map<
    string,
    {
      date: string;
      totalChecks: number;
      successfulChecks: number;
      failureCount: number;
      responseSum: number;
      responseSamples: number;
    }
  >();

  for (const report of reports) {
    const dateKey = report.reportDate.toISOString().slice(0, 10);
    const current = trendMap.get(dateKey) ?? {
      date: dateKey,
      totalChecks: 0,
      successfulChecks: 0,
      failureCount: 0,
      responseSum: 0,
      responseSamples: 0,
    };

    current.totalChecks += report.totalChecks;
    current.successfulChecks += report.successfulChecks;
    current.failureCount += report.failureCount;
    current.responseSum += report.avgResponseTimeMs * report.responseSamples;
    current.responseSamples += report.responseSamples;
    trendMap.set(dateKey, current);
  }

  const dailyTrend = Array.from(trendMap.values()).map((entry) => ({
    date: entry.date,
    uptimePercentage: entry.totalChecks > 0 ? round((entry.successfulChecks / entry.totalChecks) * 100) : 0,
    avgResponseTimeMs:
      entry.responseSamples > 0 ? round(entry.responseSum / entry.responseSamples) : 0,
    failureCount: entry.failureCount,
    totalChecks: entry.totalChecks,
  }));

  return {
    summary: {
      totalUrls,
      failures,
      activeSchedules,
      uptimePercentage,
      averageResponseTimeMs,
    },
    urls: urls.map((url) => ({
      id: url.id,
      name: url.name,
      address: url.address,
      scheduleEnabled: url.scheduleEnabled,
      intervalMinutes: url.intervalMinutes,
      nextCheckAt: url.nextCheckAt,
      lastStatus: url.lastStatus,
      lastResponseTimeMs: url.lastResponseTimeMs,
      lastCheckedAt: url.lastCheckedAt,
      createdAt: url.createdAt,
    })),
    dailyTrend,
    recentActivity: recentActivity.map((activity) => ({
      id: activity.id,
      urlId: activity.monitoredUrlId,
      urlName: activity.monitoredUrl.name,
      address: activity.monitoredUrl.address,
      status: activity.status,
      httpStatus: activity.httpStatus,
      responseTimeMs: activity.responseTimeMs,
      checkedAt: activity.checkedAt,
      errorMessage: activity.errorMessage,
      failureReason: activity.failureReason,
    })),
  };
}

export async function getUrlHistory(userId: string, urlId: string, limit = 40) {
  const url = await prisma.monitoredUrl.findFirst({
    where: {
      id: urlId,
      userId,
    },
  });

  if (!url) {
    throw new AppError(404, "Monitored URL not found");
  }

  const history = await prisma.checkResult.findMany({
    where: {
      monitoredUrlId: urlId,
      monitoredUrl: { userId },
    },
    orderBy: { checkedAt: "desc" },
    take: limit,
  });

  return history
    .map((entry) => ({
      id: entry.id,
      status: entry.status,
      httpStatus: entry.httpStatus,
      responseTimeMs: entry.responseTimeMs,
      checkedAt: entry.checkedAt,
      errorMessage: entry.errorMessage,
      failureReason: entry.failureReason,
      correlationId: entry.correlationId,
    }))
    .reverse();
}

export async function getAdminOverview() {
  const [userCount, urlCount, checkCount] = await Promise.all([
    prisma.user.count(),
    prisma.monitoredUrl.count(),
    prisma.checkResult.count(),
  ]);

  return {
    users: userCount,
    monitoredUrls: urlCount,
    checks: checkCount,
  };
}
