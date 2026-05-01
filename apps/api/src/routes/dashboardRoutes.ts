import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { buildDashboardData } from "../services/dashboardService";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.use(authenticate);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const dashboard = await buildDashboardData(req.user!.id);
    res.json(dashboard);
  }),
);

export default router;
