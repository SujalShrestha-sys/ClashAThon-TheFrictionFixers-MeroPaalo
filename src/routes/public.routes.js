import { Router } from "express";
import { asyncHandler } from "../middlewares/async.middleware.js";
import {
  getQueueInfo,
  getDepartmentsPublic,
} from "../controllers/public.controller.js";

const router = Router();

router.get("/departments", asyncHandler(getDepartmentsPublic));
router.get("/queue/:departmentId/info", asyncHandler(getQueueInfo));

export default router;
