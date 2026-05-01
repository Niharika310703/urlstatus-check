import { Role } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";
import { hashPassword, serializeUser, signToken, verifyPassword } from "../services/authService";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

router.post(
  "/signup",
  asyncHandler(async (req, res) => {
    const input = credentialsSchema.parse(req.body);
    const email = input.email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing) {
      throw new AppError(409, "Email is already registered");
    }

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: await hashPassword(input.password),
        role: Role.USER,
      },
    });

    res.status(201).json({
      token: signToken(user),
      user: serializeUser(user),
    });
  }),
);

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const input = credentialsSchema.parse(req.body);
    const email = input.email.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
      throw new AppError(401, "Invalid email or password");
    }

    res.json({
      token: signToken(user),
      user: serializeUser(user),
    });
  }),
);

router.get(
  "/me",
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new AppError(404, "User not found");
    }

    res.json({ user: serializeUser(user) });
  }),
);

export default router;
