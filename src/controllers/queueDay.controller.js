import QueueDay from "../model/queueDay.model.js";
import Token from "../model/token.model.js";
import Display from "../model/tokenDisplay.model.js";
import { parseDateOnly } from "../utils/dateOnly.js";
import { getMessage } from "../config/messages.js";

const successMessage = (key) => getMessage("success", key);
const errorMessage = (key) => getMessage("error", key);

const emitDept = (req, departmentId, event, payload) => {
  const io = req.app.get("io");
  if (io) io.to(`dept:${departmentId}`).emit(event, payload);
};

export const getQueueDays = async (req, res) => {
  const { department } = req.query;
  const filter = {};
  if (department) filter.department = department;

  const list = await QueueDay.find(filter).populate("department").sort({ date: -1 });
  res.json({ success: true, message: successMessage("requestAuthorized"), data: list });
};

export const openQueueDay = async (req, res) => {
  const { department, date, startTime, endTime } = req.body;

  if (!department || !date) {
    res.status(400);
    throw new Error(errorMessage("submissionFailed"));
  }

  const d = parseDateOnly(date);
  if (!d) {
    res.status(400);
    throw new Error(errorMessage("submissionFailed"));
  }

  const qd = await QueueDay.findOneAndUpdate(
    { department, date: d },
    { department, date: d, startTime, endTime, status: "active" },
    { upsert: true, new: true, runValidators: true }
  );

  emitDept(req, department, "queue:statusChanged", { queueDayId: qd._id, status: qd.status });
  res.status(201).json({ success: true, message: successMessage("dataSaved"), data: qd });
};

export const closeQueueDay = async (req, res) => {
  const qd = await QueueDay.findById(req.params.id);

  if (!qd) {
    res.status(404);
    throw new Error(errorMessage("submissionFailed"));
  }

  qd.status = "closed";
  await qd.save();

  emitDept(req, qd.department, "queue:statusChanged", { queueDayId: qd._id, status: qd.status });
  res.json({ success: true, message: successMessage("actionExecuted"), data: qd });
};

export const pauseQueueDay = async (req, res) => {
  const qd = await QueueDay.findById(req.params.id);

  if (!qd) {
    res.status(404);
    throw new Error(errorMessage("submissionFailed"));
  }
  if (qd.status === "closed") {
    res.status(400);
    throw new Error(errorMessage("unableToProcess"));
  }

  qd.status = "paused";
  await qd.save();

  emitDept(req, qd.department, "queue:statusChanged", { queueDayId: qd._id, status: qd.status });
  res.json({ success: true, message: successMessage("actionExecuted"), data: qd });
};

export const resumeQueueDay = async (req, res) => {
  const qd = await QueueDay.findById(req.params.id);

  if (!qd) {
    res.status(404);
    throw new Error(errorMessage("submissionFailed"));
  }
  if (qd.status === "closed") {
    res.status(400);
    throw new Error(errorMessage("unableToProcess"));
  }

  qd.status = "active";
  await qd.save();

  emitDept(req, qd.department, "queue:statusChanged", { queueDayId: qd._id, status: qd.status });
  res.json({ success: true, message: successMessage("actionExecuted"), data: qd });
};

export const resetQueueDay = async (req, res) => {
  const qd = await QueueDay.findById(req.params.id);

  if (!qd) {
    res.status(404);
    throw new Error(errorMessage("submissionFailed"));
  }

  const upd = await Token.updateMany(
    { queueDay: qd._id, status: { $in: ["waiting", "called", "serving"] } },
    { $set: { status: "cancelled" } }
  );

  // clear display for department
  await Display.updateMany(
    { department: qd.department },
    { $set: { currentToken: null, updatedAt: new Date() } }
  );

  emitDept(req, qd.department, "queue:reset", { queueDayId: qd._id });
  emitDept(req, qd.department, "display:updated", { department: qd.department });
  emitDept(req, qd.department, "dashboard:changed", { department: qd.department });

  res.json({
    success: true,
    message: successMessage("actionExecuted"),
    data: { queueDayId: qd._id, cancelledCount: upd.modifiedCount ?? upd.nModified ?? 0 },
  });
};
