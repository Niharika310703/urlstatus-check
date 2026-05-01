import type { NextFunction, Request, Response } from "express";
import { logger } from "../lib/logger";

export class AppError extends Error {
  statusCode: number;
  details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(new AppError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

export function errorHandler(error: unknown, req: Request, res: Response, _next: NextFunction) {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      message: error.message,
      details: error.details,
      requestId: req.requestId,
    });
    return;
  }

  if (error instanceof Error) {
    logger.error(
      {
        requestId: req.requestId,
        path: req.originalUrl,
        stack: error.stack,
      },
      error.message,
    );
  } else {
    logger.error({ requestId: req.requestId, path: req.originalUrl, error }, "Unhandled error");
  }

  res.status(500).json({
    message: "Internal server error",
    requestId: req.requestId,
  });
}
