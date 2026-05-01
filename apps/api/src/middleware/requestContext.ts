import { AsyncLocalStorage } from "node:async_hooks";
import type { NextFunction, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";

type RequestContext = {
  requestId: string;
  userId?: string;
};

const storage = new AsyncLocalStorage<RequestContext>();

export function requestContextMiddleware(req: Request, res: Response, next: NextFunction) {
  const requestId = req.header("x-correlation-id") ?? uuidv4();
  req.requestId = requestId;
  res.setHeader("x-correlation-id", requestId);

  storage.run({ requestId }, () => next());
}

export function updateRequestContext(patch: Partial<RequestContext>) {
  const current = storage.getStore();

  if (current) {
    Object.assign(current, patch);
  }
}

export function getRequestContext() {
  return storage.getStore();
}
