import mongoose from "mongoose";

const tokenSchema = new mongoose.Schema(
    {
        department: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Department",
            required: true,
            index: true,
        },

        queueDay: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "QueueDay",
            required: true,
            index: true,
        },

        customer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },

        tokenNumber: {
            type: String,
            required: true
        },

        status: {
            type: String,
            enum: ["waiting", "called", "serving", "completed", "missed", "cancelled"],
            default: "waiting",
            index: true,
        },

        issuedAt: {
            type: Date,
            default: Date.now
        },

        calledAt: {
            type: Date
        },
        servingAt: {
            type: Date
        },
        completedAt: {
            type: Date
        },
    },
    { timestamps: true }
);

tokenSchema.index({ queueDay: 1, tokenNumber: 1 }, { unique: true });

const Token = mongoose.model("Token", tokenSchema);
export default Token;
