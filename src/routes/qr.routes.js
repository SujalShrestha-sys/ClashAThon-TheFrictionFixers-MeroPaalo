import { Router } from "express";
import { asyncHandler } from "../middlewares/async.middleware.js";
import { generateQR, validateQRCode } from "../controllers/qr.controller.js";

const qrRouter = Router();

// Generate QR code image (public - no auth required)
// Returns PNG image that can be printed and displayed
qrRouter.get("/", asyncHandler(generateQR));

// Validate QR scan and check queue status (public - no auth required)
// Called by frontend to determine if user needs to login before joining queue
qrRouter.get("/validate", asyncHandler(validateQRCode));

export default qrRouter;