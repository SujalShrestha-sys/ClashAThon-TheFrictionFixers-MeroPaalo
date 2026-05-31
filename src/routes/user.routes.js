import { Router } from "express";
import { asyncHandler } from "../middlewares/async.middleware.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";
import {
  assignRole,
  assignDepartment,
  listUsers,
  updateUser,
} from "../controllers/user.controller.js";

const router = Router();

router.get("/", protect, authorize("admin"), asyncHandler(listUsers));
router.patch("/:userId", protect, authorize("admin"), asyncHandler(updateUser));
router.patch("/:userId/role", protect, authorize("admin"), asyncHandler(assignRole));
router.patch("/:userId/department", protect, authorize("admin"), asyncHandler(assignDepartment));

export default router;
