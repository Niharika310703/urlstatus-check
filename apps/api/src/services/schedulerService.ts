import cron, { type ScheduledTask } from "node-cron";
import { logger } from "../lib/logger";
import { runScheduledChecks } from "./monitorService";

let schedulerTask: ScheduledTask | null = null;
let isTickRunning = false;

export function startScheduler() {
  if (schedulerTask) {
    return;
  }

  schedulerTask = cron.schedule("* * * * *", async () => {
    if (isTickRunning) {
      logger.warn("scheduler tick skipped because the previous run is still active");
      return;
    }

    isTickRunning = true;

    try {
      const result = await runScheduledChecks();
      if (result.scheduled > 0) {
        logger.info(result, "scheduled checks executed");
      }
    } catch (error) {
      logger.error({ error }, "scheduler tick failed");
    } finally {
      isTickRunning = false;
    }
  });

  logger.info("scheduler started");
}

export function stopScheduler() {
  schedulerTask?.stop();
  schedulerTask = null;
}
