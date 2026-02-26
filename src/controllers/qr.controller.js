import QRCode from "qrcode";

export const generateQR = async (req, res) => {
    const { department } = req.query;

    if (!department) {
        return res.status(400).json({
            success: false,
            message: "department is required",
        });
    }

    const clientBaseUrl = (process.env.CLIENT_URL || "http://localhost:5173").replace(/\/$/, "");
    const joinUrl = `${clientBaseUrl}/join?department=${department}`;

    try {
        // Generate QR as buffer (binary PNG)
        const qrBuffer = await QRCode.toBuffer(joinUrl);

        // Send as PNG image
        res.writeHead(200, {
            "Content-Type": "image/png",
            "Content-Disposition": "inline; filename=qr.png",
        });
        res.end(qrBuffer);
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Failed to generate QR",
        });
    }
};
