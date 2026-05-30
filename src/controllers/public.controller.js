import Department from "../model/department.model.js";
import QueueDay from "../model/queueDay.model.js";
import { getTodayDateOnly } from "../utils/dateOnly.js";
import { getMessage } from "../config/messages.js";

const successMessage = (key) => getMessage("success", key);
const errorMessage = (key) => getMessage("error", key);

// public API to get all active departments
export const getDepartmentsPublic = async (req, res) => {
  const departments = await Department.find({ isActive: true })
    .select("_id name description")
    .sort({ createdAt: -1 });
  res.json({ success: true, message: successMessage("operationCompleted"), data: departments });
};

// public API to get queue info for a department
export const getQueueInfo = async (req, res) => {
  const { departmentId } = req.params;

  const dept = await Department.findById(departmentId).select("name isActive");
  if (!dept || !dept.isActive) {
    res.status(404);
    throw new Error(errorMessage("submissionFailed"));
  }

  const today = getTodayDateOnly();

  const qd = await QueueDay.findOne({
    department: dept._id,
    date: today,
    status: { $in: ["active", "paused"] },
  }).select("status startTime endTime");

  res.json({
    success: true,
    message: successMessage("operationCompleted"),
    data: {
      institutionId: null,
      institutionName: null,
      queueName: dept.name,
      queueStatus: qd?.status || "closed",
      startTime: qd?.startTime || null,
      endTime: qd?.endTime || null,
    },
  });
};
