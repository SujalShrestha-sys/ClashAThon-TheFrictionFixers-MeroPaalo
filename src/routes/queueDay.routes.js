import { Router } from "express";
import { asyncHandler } from "../middlewares/async.middleware.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";
import {
  getQueueDays,
  openQueueDay,
  closeQueueDay,
  pauseQueueDay,
  resumeQueueDay,
  resetQueueDay,
} from "../controllers/queueDay.controller.js";

const router = Router();

router.get("/", protect, authorize("admin", "staff"), asyncHandler(getQueueDays));
router.post("/open", protect, authorize("admin"), asyncHandler(openQueueDay));
router.patch("/:id/close", protect, authorize("admin"), asyncHandler(closeQueueDay));
router.patch("/:id/pause", protect, authorize("admin"), asyncHandler(pauseQueueDay));
router.patch("/:id/resume", protect, authorize("admin"), asyncHandler(resumeQueueDay));
router.post("/:id/reset", protect, authorize("admin"), asyncHandler(resetQueueDay));

export default router;
