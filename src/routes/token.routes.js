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
  getMyTokenHistory,
} from "../controllers/token.controller.js";

const router = Router();

// ===== PUBLIC ENDPOINTS =====
// Get token status (anyone can check their token status without auth)
router.get("/:id/status", asyncHandler(getTokenStatus));

// ===== AUTHENTICATED USER ENDPOINTS =====
// Issue/join a token via QR scan (requires authentication)
router.post("/issue", protect, asyncHandler(issueToken));
router.get("/history", protect, asyncHandler(getMyTokenHistory));

// ===== STAFF/ADMIN ENDPOINTS =====
// List all tokens (staff can see their department's tokens)
router.get("/", protect, authorize("admin", "staff"), asyncHandler(listTokens));

// Serve next token in queue
router.post("/serve-next", protect, authorize("admin", "staff"), asyncHandler(serveNext));

// Call next token (change status to "called")
router.patch("/:id/call", protect, authorize("admin", "staff"), asyncHandler(callToken));

// Mark token as being served
router.patch("/:id/serve", protect, authorize("admin", "staff"), asyncHandler(serveToken));

// Mark token as completed
router.patch("/:id/complete", protect, authorize("admin", "staff"), asyncHandler(completeToken));

// Mark token as missed
router.patch("/:id/miss", protect, authorize("admin", "staff"), asyncHandler(missToken));

// Cancel a token
router.patch("/:id/cancel", protect, authorize("admin", "staff"), asyncHandler(cancelToken));

export default router;
