import { Router } from "express";
import { asyncHandler } from "../middlewares/async.middleware.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";
import {
  createDepartment,
  getDepartments,
  getDepartment,
  updateDepartment,
  deleteDepartment,
} from "../controllers/department.controller.js";

const router = Router();

// admin/staff can read; admin can mutate
router.get("/", protect, authorize("admin", "staff"), asyncHandler(getDepartments));
router.post("/", protect, authorize("admin"), asyncHandler(createDepartment));
router.get("/:id", protect, authorize("admin", "staff"), asyncHandler(getDepartment));
router.patch("/:id", protect, authorize("admin"), asyncHandler(updateDepartment));
router.delete("/:id", protect, authorize("admin"), asyncHandler(deleteDepartment));

export default router;
