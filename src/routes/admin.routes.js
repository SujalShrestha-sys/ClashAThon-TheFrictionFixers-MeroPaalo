import { Router } from "express";
import { asyncHandler } from "../middlewares/async.middleware.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";
import { getAdminDashboard } from "../controllers/admin.controller.js";

const router = Router();

router.get("/dashboard", protect, authorize("admin"), asyncHandler(getAdminDashboard));

export default router;
