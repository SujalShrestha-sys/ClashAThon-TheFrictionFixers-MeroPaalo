import authRoutes from "./auth.routes.js"
import departmentRoutes from "./department.routes.js";
import counterRoutes from "./counter.routes.js";
import queueDayRoutes from "./queueDay.routes.js";
import tokenRoutes from "./token.routes.js";
import displayRoutes from "./display.routes.js";
import adminRoutes from "./admin.routes.js";
import publicRoutes from "./public.routes.js";
import userRoutes from "./user.routes.js";
import qrRouter from "./qr.routes.js";
import express from 'express';

const router = express.Router()

router.use("/auth", authRoutes);
router.use("/departments", departmentRoutes);
router.use("/counters", counterRoutes);
router.use("/queue-days", queueDayRoutes);
router.use("/tokens", tokenRoutes);
router.use("/display", displayRoutes);
router.use("/admin", adminRoutes);
router.use("/public", publicRoutes);
router.use("/users", userRoutes);
router.use("/qr", qrRouter);


export default router