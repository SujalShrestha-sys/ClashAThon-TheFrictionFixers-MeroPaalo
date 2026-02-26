import { Router } from "express";
import { asyncHandler } from "../middlewares/async.middleware.js";
import { getQueueInfo } from "../controllers/public.controller.js";

const router = Router();

router.get("/queue/:departmentId/info", asyncHandler(getQueueInfo));

export default router;
