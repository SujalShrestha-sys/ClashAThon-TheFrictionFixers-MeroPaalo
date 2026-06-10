import QRCode from "qrcode";
import Department from "../model/department.model.js";
import QueueDay from "../model/queueDay.model.js";
import Token from "../model/token.model.js";
import { getTodayDateOnly } from "../utils/dateOnly.js";
import { getAuthenticatedUserFromRequest } from "../middlewares/auth.middleware.js";
import { getMessage } from "../config/messages.js";

const successMessage = (key) => getMessage("success", key);
const errorMessage = (key) => getMessage("error", key);

/**
 * Generates a QR code that encodes a URL for joining a queue
 * The QR code links to the frontend's join page with department parameter
 * @param {Request} req - HTTP request with department query parameter
 * @param {Response} res - HTTP response (sends PNG image)
 */
export const generateQR = async (req, res) => {
    const { department } = req.query;

    // Validate required parameter
    if (!department) {
        return res.status(400).json({
            success: false,
            message: errorMessage("submissionFailed"),
        });
    }

    // Build the join URL that will be encoded in the QR code
    const clientBaseUrl = (process.env.CLIENT_URL || "http://localhost:5173").replace(/\/$/, "");
    const joinUrl = `${clientBaseUrl}/join?department=${department}`;

    try {
        // Generate QR code as PNG buffer
        const qrBuffer = await QRCode.toBuffer(joinUrl);

        // Send PNG image to client with appropriate headers
        res.writeHead(200, {
            "Content-Type": "image/png",
            "Content-Disposition": "inline; filename=queue-qr.png",
        });
        res.end(qrBuffer);
    } catch (err) {
        console.error("QR code generation error:", err);
        res.status(500).json({
            success: false,
            message: errorMessage("unableToProcess"),
        });
    }
};

/**
 * Validates QR scan and returns queue status with auth information
 * Called by frontend after user scans QR code to determine next action:
 * - If user not authenticated: frontend shows login prompt
 * - If queue closed: frontend shows queue closed message
 * - If all conditions met: frontend can proceed to issue token
 * @param {Request} req - HTTP request (auth is optional, handled gracefully)
 * @param {Response} res - HTTP response with validation result
 */
export const validateQRCode = async (req, res) => {
    const { department } = req.query;

    // Validate required query parameter
    if (!department) {
        res.status(400);
        throw new Error(errorMessage("submissionFailed"));
    }

    // Verify department exists and is active
    const dept = await Department.findById(department).select("_id name description isActive avgServiceTime");
    if (!dept || !dept.isActive) {
        res.status(404);
        throw new Error(errorMessage("submissionFailed"));
    }

    // Check if queue is active for today
    const today = getTodayDateOnly();
    const queueDay = await QueueDay.findOne({
        department: dept._id,
        date: today
    }).select("_id status");

    const queueStatus = queueDay ? queueDay.status : "closed";

    let aheadCount = 0;
    let estimatedWaitMinutes = 0;

    if (queueDay && queueStatus === "active") {
        aheadCount = await Token.countDocuments({
            queueDay: queueDay._id,
            status: "waiting"
        });

        const avgServiceMinutes = dept.avgServiceTime ?? 5;
        const recentCompleted = await Token.find({
            queueDay: queueDay._id,
            status: "completed",
            calledAt: { $ne: null },
            completedAt: { $ne: null },
        })
            .sort({ completedAt: -1 })
            .limit(30)
            .select("calledAt completedAt");

        let computedAvg = avgServiceMinutes;
        if (recentCompleted.length) {
            const totalMs = recentCompleted.reduce((sum, t) => sum + (t.completedAt - t.calledAt), 0);
            computedAvg = Math.max(1, Math.round(totalMs / recentCompleted.length / 60000));
        }

        estimatedWaitMinutes = aheadCount * computedAvg;
    }

    // Resolve the signed session or bearer token if present.
    const user = await getAuthenticatedUserFromRequest(req);
    const isAuthenticated = !!user;
    const userName = user?.name || null;

    // Return validation result with helpful guidance message for frontend
    res.status(200).json({
        success: true,
        data: {
            department: {
                _id: dept._id,
                name: dept.name,
                description: dept.description
            },
            queueStatus,
            aheadCount,
            estimatedWaitMinutes,
            isAuthenticated,
            userName,
            message: successMessage("operationCompleted"),
        }
    });
};
