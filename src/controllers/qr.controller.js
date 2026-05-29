import QRCode from "qrcode";
import Department from "../model/department.model.js";
import QueueDay from "../model/queueDay.model.js";
import { getTodayDateOnly } from "../utils/dateOnly.js";

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
            message: "department query parameter is required",
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
            message: "Failed to generate QR code. Please try again.",
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
        throw new Error("department query parameter is required");
    }

    // Verify department exists and is active
    const dept = await Department.findById(department).select("_id name description isActive");
    if (!dept || !dept.isActive) {
        res.status(404);
        throw new Error("Department not found or is inactive");
    }

    // Check if queue is active for today
    const today = getTodayDateOnly();
    const queueDay = await QueueDay.findOne({
        department: dept._id,
        date: today,
        status: "active"
    }).select("_id status");

    if (!queueDay) {
        res.status(400);
        throw new Error("Queue is closed for today. Please try again during business hours.");
    }

    // Check if user is authenticated (optional)
    const isAuthenticated = !!req.user;
    const userName = req.user?.name || null;

    // Return validation result with helpful guidance message for frontend
    res.status(200).json({
        success: true,
        data: {
            department: {
                _id: dept._id,
                name: dept.name,
                description: dept.description
            },
            queueStatus: queueDay.status,
            isAuthenticated,
            userName,
            message: isAuthenticated
                ? `Welcome ${userName}! Ready to join queue: ${dept.name}`
                : "Please log in to join the queue"
        }
    });
};
