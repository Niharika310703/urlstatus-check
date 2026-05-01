import { Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";
import { getUrlHistory } from "../services/dashboardService";
import { asyncHandler } from "../utils/asyncHandler";
import { deriveNameFromUrl, normalizeUrl } from "../utils/url";

const router = Router();

const createUrlsSchema = z.object({
  urls: z
    .array(
      z.union([
        z.string().min(1),
        z.object({
          name: z.string().trim().min(1).optional(),
          address: z.string().min(1),
          scheduleEnabled: z.boolean().optional(),
          intervalMinutes: z.number().int().min(1).max(1440).optional(),
        }),
      ]),
    )
    .min(1),
});

const scheduleSchema = z.object({
  scheduleEnabled: z.boolean(),
  intervalMinutes: z.number().int().min(1).max(1440),
});

router.use(authenticate);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const urls = await prisma.monitoredUrl.findMany({
      where: { userId: req.user!.id },
      orderBy: [{ updatedAt: "desc" }],
    });

    res.json({ urls });
  }),
);

router.post(
  "/bulk",
  asyncHandler(async (req, res) => {
    const input = createUrlsSchema.parse(req.body);
    const created: unknown[] = [];
    const skipped: string[] = [];

    for (const entry of input.urls) {
      const rawAddress = typeof entry === "string" ? entry : entry.address;
      const address = normalizeUrl(rawAddress);
      const name = typeof entry === "string" ? deriveNameFromUrl(address) : entry.name?.trim() || deriveNameFromUrl(address);
      const intervalMinutes = typeof entry === "string" ? 5 : entry.intervalMinutes ?? 5;
      const scheduleEnabled = typeof entry === "string" ? false : entry.scheduleEnabled ?? false;

      try {
        const monitoredUrl = await prisma.monitoredUrl.create({
          data: {
            name,
            address,
            intervalMinutes,
            scheduleEnabled,
            nextCheckAt: scheduleEnabled ? new Date(Date.now() + intervalMinutes * 60_000) : null,
            userId: req.user!.id,
          },
        });

        created.push(monitoredUrl);
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          skipped.push(address);
          continue;
        }

        throw error;
      }
    }

    res.status(201).json({ created, skipped });
  }),
);

router.patch(
  "/:id/schedule",
  asyncHandler(async (req, res) => {
    const urlId = String(req.params.id);
    const input = scheduleSchema.parse(req.body);
    const existing = await prisma.monitoredUrl.findFirst({
      where: {
        id: urlId,
        userId: req.user!.id,
      },
    });

    if (!existing) {
      throw new AppError(404, "Monitored URL not found");
    }

    const updated = await prisma.monitoredUrl.update({
      where: { id: existing.id },
      data: {
        scheduleEnabled: input.scheduleEnabled,
        intervalMinutes: input.intervalMinutes,
        nextCheckAt: input.scheduleEnabled ? new Date(Date.now() + input.intervalMinutes * 60_000) : null,
      },
    });

    res.json({ url: updated });
  }),
);

router.get(
  "/:id/history",
  asyncHandler(async (req, res) => {
    const urlId = String(req.params.id);
    const limit = Number.parseInt((req.query.limit as string | undefined) ?? "40", 10);
    const history = await getUrlHistory(req.user!.id, urlId, Number.isNaN(limit) ? 40 : limit);
    res.json({ history });
  }),
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const urlId = String(req.params.id);
    const existing = await prisma.monitoredUrl.findFirst({
      where: {
        id: urlId,
        userId: req.user!.id,
      },
    });

    if (!existing) {
      throw new AppError(404, "Monitored URL not found");
    }

    await prisma.monitoredUrl.delete({ where: { id: existing.id } });
    res.status(204).send();
  }),
);

export default router;
