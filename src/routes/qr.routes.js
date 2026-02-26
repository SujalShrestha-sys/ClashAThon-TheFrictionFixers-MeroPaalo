import { Router } from "express";
import { asyncHandler } from "../middlewares/async.middleware.js";
import { generateQR } from "../controllers/qr.controller.js";

const qrRouter = Router();

qrRouter.get("/", asyncHandler(generateQR));

export default qrRouter