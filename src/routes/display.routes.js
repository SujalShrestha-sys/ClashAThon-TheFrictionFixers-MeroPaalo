import { Router } from "express";
import { asyncHandler } from "../middlewares/async.middleware.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";
import { getDisplay, listDisplayRows } from "../controllers/display.controller.js";

const router = Router();

router.get("/", asyncHandler(getDisplay));

router.get("/rows", protect, authorize("admin", "staff"), asyncHandler(listDisplayRows));

export default router;
