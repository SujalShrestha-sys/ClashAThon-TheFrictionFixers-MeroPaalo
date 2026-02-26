import { Router } from "express";
import { asyncHandler } from "../middlewares/async.middleware.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";
import { createCounter, getCounters, updateCounter, assignStaff } from "../controllers/counter.controller.js";

const router = Router();

router.get("/", protect, authorize("admin", "staff"), asyncHandler(getCounters));
router.post("/", protect, authorize("admin"), asyncHandler(createCounter));
router.patch("/:id", protect, authorize("admin"), asyncHandler(updateCounter));
router.patch("/:id/assign-staff", protect, authorize("admin"), asyncHandler(assignStaff));

export default router;
