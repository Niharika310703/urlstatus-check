import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/auth";
import { runChecksForUser } from "../services/monitorService";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

const runChecksSchema = z.object({
  urlIds: z.array(z.string()).optional(),
});

router.use(authenticate);

router.post(
  "/run",
  asyncHandler(async (req, res) => {
    const input = runChecksSchema.parse(req.body ?? {});
    const result = await runChecksForUser(req.user!.id, input.urlIds);
    res.json(result);
  }),
);

export default router;
