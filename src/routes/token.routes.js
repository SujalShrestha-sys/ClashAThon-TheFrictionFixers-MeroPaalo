import { Router } from "express";
import { asyncHandler } from "../middlewares/async.middleware.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";
import {
  issueToken,
  listTokens,
  serveNext,
  callToken,
  serveToken,
  completeToken,
  missToken,
  cancelToken,
  getTokenStatus,
} from "../controllers/token.controller.js";

const router = Router();

// PUBLIC
router.post("/issue", asyncHandler(issueToken));
router.get("/:id/status", asyncHandler(getTokenStatus));

// STAFF/ADMIN
router.get("/", protect, authorize("admin", "staff"), asyncHandler(listTokens));
router.post("/serve-next", protect, authorize("admin", "staff"), asyncHandler(serveNext));

router.patch("/:id/call", protect, authorize("admin", "staff"), asyncHandler(callToken));
router.patch("/:id/serve", protect, authorize("admin", "staff"), asyncHandler(serveToken));
router.patch("/:id/complete", protect, authorize("admin", "staff"), asyncHandler(completeToken));
router.patch("/:id/miss", protect, authorize("admin", "staff"), asyncHandler(missToken));
router.patch("/:id/cancel", protect, authorize("admin", "staff"), asyncHandler(cancelToken));

export default router;
