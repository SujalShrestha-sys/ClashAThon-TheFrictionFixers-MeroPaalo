import mongoose from "mongoose";

const departmentSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true
        },

        description: {
            type: String
        },

        avgServiceTime: {
            type: Number,
            default: 5
        },

        isActive: {
            type: Boolean,
            default: true
        },
    },
    { timestamps: true }
);

departmentSchema.index({ name: 1 }, { unique: true });

const Department = mongoose.model("Department", departmentSchema);
export default Department;
