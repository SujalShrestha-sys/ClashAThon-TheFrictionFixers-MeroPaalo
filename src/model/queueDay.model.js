import mongoose from "mongoose";

const queueDaySchema = new mongoose.Schema(
    {
        department: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Department",
            required: true,
            index: true,
        },

        date: {
            type: Date,
            required: true
        },

        startTime: {
            type: String
        },
        endTime: {
            type: String
        },

        status: {
            type: String,
            enum: ["active", "paused", "closed"],
            default: "active"
        },
    },
    { timestamps: true }
);

queueDaySchema.index({ department: 1, date: 1 }, { unique: true });

const QueueDay = mongoose.model("QueueDay", queueDaySchema);
export default QueueDay;
