import Token from "../model/token.model.js";
import QueueDay from "../model/queueDay.model.js";
import Department from "../model/department.model.js";
import TokenHistory from "../model/tokenHistory.model.js";
import Display from "../model/tokenDisplay.model.js";
import { getTodayDateOnly, parseDateOnly } from "../utils/dateOnly.js";
import { getMessage } from "../config/messages.js";

const successMessage = (key) => getMessage("success", key);
const errorMessage = (key) => getMessage("error", key);

const pad = (n, width = 3) => String(n).padStart(width, "0");

const emitDept = (req, departmentId, event, payload) => {
  const io = req.app.get("io");
  if (io) io.to(`dept:${departmentId}`).emit(event, payload);
};

const emitTokenRoom = (req, tokenId, event, payload) => {
  const io = req.app.get("io");
  if (io) io.to(`token:${tokenId}`).emit(event, payload);
};

const createTokenWithRetry = async ({ department, queueDay, customer }) => {
  for (let i = 0; i < 5; i++) {
    const count = await Token.countDocuments({ queueDay });
    const tokenNumber = pad(count + 1);

    try {
      return await Token.create({ tokenNumber, department, queueDay, customer: customer || null });
    } catch (e) {
      if (String(e?.message || "").includes("E11000")) continue;
      throw e;
    }
  }
  const error = new Error(errorMessage("unableToProcess"));
  error.statusCode = 500;
  throw error;
};

export const issueToken = async (req, res) => {
  const { department, date } = req.body;

  // Validate required field
  if (!department) {
    res.status(400);
    throw new Error(errorMessage("submissionFailed"));
  }

  // Ensure user is authenticated (required for QR scanning flow)
  // Frontend must have called GET /api/qr/validate first to check auth status
  if (!req.user || !req.user._id) {
    res.status(401);
    throw new Error(errorMessage("authenticationRequired"));
  }

  // Parse date or use today
  const targetDate = date ? parseDateOnly(date) : getTodayDateOnly();
  if (!targetDate) {
    res.status(400);
    throw new Error(errorMessage("submissionFailed"));
  }

  // Check if queue is active for the department on the target date
  const queueDay = await QueueDay.findOne({
    department,
    date: targetDate,
    status: "active"
  });

  if (!queueDay) {
    res.status(400);
    throw new Error(errorMessage("unableToProcess"));
  }

  // Create token with authenticated user as customer
  const customerId = req.user._id;
  const token = await createTokenWithRetry({
    department,
    queueDay: queueDay._id,
    customer: customerId
  });

  // Record token issuance in history
  await TokenHistory.create({
    token: token._id,
    status: "waiting",
    note: "Token issued"
  });

  // Notify dashboard and token room about new token
  emitDept(req, department, "token:issued", {
    tokenId: token._id,
    tokenNumber: token.tokenNumber
  });
  emitDept(req, department, "dashboard:changed", { department });

  // Return newly created token
  res.status(201).json({
    success: true,
    message: successMessage("submissionSuccessful"),
    data: token
  });
};

export const getMyTokenHistory = async (req, res) => {
  const tokens = await Token.find({ customer: req.user._id })
    .populate("department", "name description")
    .populate("queueDay", "date status")
    .sort({ issuedAt: -1 });

  res.json({
    success: true,
    message: successMessage("requestAuthorized"),
    data: tokens,
  });
};

export const listTokens = async (req, res) => {
  const { department, queueDay, status } = req.query;

  const filter = {};
  if (department) filter.department = department;
  if (queueDay) filter.queueDay = queueDay;
  if (status) filter.status = status;

  const tokens = await Token.find(filter)
    .populate("department")
    .populate("queueDay")
    .populate("customer", "-password")
    .sort({ issuedAt: 1 });

  res.json({ success: true, message: successMessage("requestAuthorized"), data: tokens });
};

const setStatus = async ({ req, tokenId, status, counterId, note }) => {
  const token = await Token.findById(tokenId);
  if (!token) {
    const err = new Error(errorMessage("submissionFailed"));
    err.statusCode = 404;
    throw err;
  }

  token.status = status;
  if (status === "called") token.calledAt = new Date();
  if (status === "serving") token.servingAt = new Date();
  if (status === "completed") token.completedAt = new Date();

  await token.save();

  await TokenHistory.create({
    token: token._id,
    counter: counterId || null,
    status,
    note,
  });

  if (counterId) {
    await Display.findOneAndUpdate(
      { department: token.department, counter: counterId },
      {
        department: token.department,
        counter: counterId,
        currentToken: token._id,
        updatedAt: new Date(),
      },
      { upsert: true, new: true, runValidators: true }
    );
  }

  emitDept(req, token.department, "token:updated", {
    tokenId: token._id,
    status,
    counterId: counterId || null,
  });
  emitDept(req, token.department, "display:updated", {
    department: token.department,
    counterId: counterId || null,
  });
  emitDept(req, token.department, "dashboard:changed", { department: token.department });

  emitTokenRoom(req, token._id, "token:selfUpdated", { tokenId: token._id, status });

  if (status === "called") {
    emitTokenRoom(req, token._id, "token:turnArrived", { tokenId: token._id, tokenNumber: token.tokenNumber });
  }

  return token;
};

export const serveNext = async (req, res) => {
  const { department, counterId } = req.body;

  if (!department || !counterId) {
    res.status(400);
    throw new Error(errorMessage("submissionFailed"));
  }

  const today = getTodayDateOnly();

  const queueDay = await QueueDay.findOne({ department, date: today, status: "active" });
  if (!queueDay) {
    res.status(400);
    throw new Error(errorMessage("unableToProcess"));
  }

  const nextToken = await Token.findOne({ queueDay: queueDay._id, status: "waiting" }).sort({ issuedAt: 1 });
  if (!nextToken) {
    res.status(404);
    throw new Error(errorMessage("unableToProcess"));
  }

  const updated = await setStatus({ req, tokenId: nextToken._id, status: "called", counterId, note: "Serve Next" });
  res.json({ success: true, message: successMessage("actionExecuted"), data: updated });
};

export const callToken = async (req, res) => {
  const { counterId } = req.body;
  const token = await setStatus({ req, tokenId: req.params.id, status: "called", counterId, note: "Called to counter" });
  res.json({ success: true, message: successMessage("actionExecuted"), data: token });
};

export const serveToken = async (req, res) => {
  const { counterId } = req.body;
  const token = await setStatus({ req, tokenId: req.params.id, status: "serving", counterId, note: "Service started" });
  res.json({ success: true, message: successMessage("actionExecuted"), data: token });
};

export const completeToken = async (req, res) => {
  const { counterId } = req.body;
  const token = await setStatus({ req, tokenId: req.params.id, status: "completed", counterId, note: "Service completed" });
  res.json({ success: true, message: successMessage("actionExecuted"), data: token });
};

export const missToken = async (req, res) => {
  const { counterId } = req.body;
  const token = await setStatus({ req, tokenId: req.params.id, status: "missed", counterId, note: "Customer missed" });
  res.json({ success: true, message: successMessage("actionExecuted"), data: token });
};

export const cancelToken = async (req, res) => {
  const token = await setStatus({ req, tokenId: req.params.id, status: "cancelled", note: "Cancelled" });
  res.json({ success: true, message: successMessage("actionExecuted"), data: token });
};

export const getTokenStatus = async (req, res) => {
  const token = await Token.findById(req.params.id).select(
    "department queueDay tokenNumber status issuedAt calledAt servingAt completedAt"
  );

  if (!token) {
    res.status(404);
    throw new Error(errorMessage("submissionFailed"));
  }

  let positionInLine = 0;
  if (token.status === "waiting") {
    const ahead = await Token.countDocuments({
      queueDay: token.queueDay,
      status: "waiting",
      issuedAt: { $lt: token.issuedAt },
    });
    positionInLine = ahead + 1;
  }

  const dept = await Department.findById(token.department).select("avgServiceTime");
  let avgServiceMinutes = dept?.avgServiceTime ?? 5;

  const recentCompleted = await Token.find({
    queueDay: token.queueDay,
    status: "completed",
    calledAt: { $ne: null },
    completedAt: { $ne: null },
  })
    .sort({ completedAt: -1 })
    .limit(30)
    .select("calledAt completedAt");

  if (recentCompleted.length) {
    const totalMs = recentCompleted.reduce((sum, t) => sum + (t.completedAt - t.calledAt), 0);
    avgServiceMinutes = Math.max(1, Math.round(totalMs / recentCompleted.length / 60000));
  }

  const estimatedWaitTimeMinutes = token.status === "waiting" ? positionInLine * avgServiceMinutes : 0;

  const nowServing = await Token.findOne({
    queueDay: token.queueDay,
    status: { $in: ["called", "serving"] },
  })
    .sort({ calledAt: -1, issuedAt: -1 })
    .select("tokenNumber status");

  res.json({
    success: true,
    message: successMessage("operationCompleted"),
    data: {
      tokenId: token._id,
      tokenNumber: token.tokenNumber,
      status: token.status,
      currentServing: nowServing || null,
      positionInLine,
      avgServiceMinutes,
      estimatedWaitTimeMinutes,
    },
  });
};
