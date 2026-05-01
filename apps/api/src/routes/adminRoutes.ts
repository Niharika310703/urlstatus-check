import { Role } from "@prisma/client";
import { Router } from "express";
import { authenticate, authorizeRoles } from "../middleware/auth";
import { getAdminOverview } from "../services/dashboardService";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.use(authenticate, authorizeRoles(Role.ADMIN));

router.get(
  "/overview",
  asyncHandler(async (_req, res) => {
    const overview = await getAdminOverview();
    res.json(overview);
  }),
);

export default router;
