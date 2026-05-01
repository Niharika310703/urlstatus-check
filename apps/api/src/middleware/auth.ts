import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { Role } from "@prisma/client";
import { env } from "../config/env";
import { updateRequestContext } from "./requestContext";
import { AppError } from "./errorHandler";

type TokenPayload = {
  sub: string;
  email: string;
  role: Role;
};

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const authorization = req.header("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    next(new AppError(401, "Missing bearer token"));
    return;
  }

  const token = authorization.slice("Bearer ".length);

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as TokenPayload;
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
    updateRequestContext({ userId: payload.sub });
    next();
  } catch (error) {
    next(new AppError(401, "Invalid or expired token"));
  }
}

export function authorizeRoles(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next(new AppError(401, "Unauthorized"));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(new AppError(403, "Forbidden"));
      return;
    }

    next();
  };
}
