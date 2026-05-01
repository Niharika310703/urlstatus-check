import { createServer } from "node:http";
import app from "./app";
import { env } from "./config/env";
import { logger } from "./lib/logger";
import { prisma } from "./lib/prisma";
import { initializeSocket } from "./lib/socket";
import { startScheduler, stopScheduler } from "./services/schedulerService";

async function bootstrap() {
  await prisma.$connect();

  const server = createServer(app);
  initializeSocket(server);
  startScheduler();

  server.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, "API server listening");
  });

  const shutdown = async () => {
    stopScheduler();
    await prisma.$disconnect();
    server.close(() => {
      logger.info("API server stopped");
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

bootstrap().catch(async (error) => {
  logger.error({ error }, "Failed to start server");
  await prisma.$disconnect();
  process.exit(1);
});
