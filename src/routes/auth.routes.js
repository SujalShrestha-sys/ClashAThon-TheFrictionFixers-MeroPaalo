import { Router } from "express";
import { asyncHandler } from "../middlewares/async.middleware.js";
import { register, login, logout, forgotPassword, validateResetToken, resetPassword } from "../controllers/auth.controller.js";

const router = Router();

router.post("/register", asyncHandler(register));
router.post("/login", asyncHandler(login));
router.post("/logout", asyncHandler(logout));
router.post("/forgot-password", asyncHandler(forgotPassword));
router.get("/reset-password/:token", validateResetToken);
router.post("/reset-password/:token", resetPassword);

export default router;
