import mongoose from "mongoose";

const tokenHistorySchema = new mongoose.Schema(
    {
        token: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Token",
            required: true,
            index: true
        },

        counter: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Counter"
        },

        status: {
            type: String,
            required: true
        },

        note: {
            type: String
        },

        changedAt: {
            type: Date,
            default: Date.now
        }

    },
    { timestamps: true }
);

const TokenHistory = mongoose.model("TokenHistory", tokenHistorySchema);

export default TokenHistory