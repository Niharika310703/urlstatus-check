import cors from "cors";
import express from "express";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { env } from "./config/env";
import { logger } from "./lib/logger";
import adminRoutes from "./routes/adminRoutes";
import authRoutes from "./routes/authRoutes";
import checkRoutes from "./routes/checkRoutes";
import dashboardRoutes from "./routes/dashboardRoutes";
import urlRoutes from "./routes/urlRoutes";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { requestContextMiddleware } from "./middleware/requestContext";

const app = express();

app.use(requestContextMiddleware);
app.use(
  pinoHttp({
    logger,
    genReqId: (req) => req.requestId,
    customProps: (req) => ({
      correlationId: req.requestId,
      userId: req.user?.id,
    }),
  }),
);
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow tools and same-process requests with no browser origin.
      if (!origin) {
        callback(null, true);
        return;
      }

      const isConfiguredOrigin = origin === env.CLIENT_ORIGIN;
      const isLocalhostOrigin = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

      if (isConfiguredOrigin || isLocalhostOrigin) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  }),
);
app.use(helmet());
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "url-health-api" });
});

app.use("/api/auth", authRoutes);
app.use("/api/urls", urlRoutes);
app.use("/api/checks", checkRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/admin", adminRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
