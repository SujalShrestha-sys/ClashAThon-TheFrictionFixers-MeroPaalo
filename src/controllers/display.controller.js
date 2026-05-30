import Display from "../model/tokenDisplay.model.js";
import Token from "../model/token.model.js";
import QueueDay from "../model/queueDay.model.js";
import { getTodayDateOnly } from "../utils/dateOnly.js";
import { getMessage } from "../config/messages.js";

const successMessage = (key) => getMessage("success", key);
const errorMessage = (key) => getMessage("error", key);

// public display
export const getDisplay = async (req, res) => {
  const { department, counter } = req.query;

  if (!department) {
    res.status(400);
    throw new Error(errorMessage("submissionFailed"));
  }

  let displayRow = null;
  if (counter) {
    displayRow = await Display.findOne({ department, counter }).populate({
      path: "currentToken",
      select: "tokenNumber status calledAt issuedAt",
    });
  }

  const today = getTodayDateOnly();

  const queueDay = await QueueDay.findOne({
    department,
    date: today,
    status: { $in: ["active", "paused"] },
  }).select("_id status");

  let nowServing = displayRow?.currentToken ?? null;

  if (!nowServing && queueDay) {
    nowServing = await Token.findOne({
      queueDay: queueDay._id,
      status: { $in: ["called", "serving"] },
    })
      .sort({ calledAt: -1, issuedAt: -1 })
      .select("tokenNumber status calledAt issuedAt");
  }

  let nextTwo = [];
  if (queueDay) {
    nextTwo = await Token.find({ queueDay: queueDay._id, status: "waiting" })
      .sort({ issuedAt: 1 })
      .limit(2)
      .select("tokenNumber status issuedAt");
  }

  res.json({
    success: true,
    message: successMessage("operationCompleted"),
    data: {
      department,
      queueStatus: queueDay?.status || "closed",
      nowServing,
      nextTwo,
    },
  });
};

// staff/admin display
export const listDisplayRows = async (req, res) => {
  const { department, counter } = req.query;

  const filter = {};
  if (department) filter.department = department;
  if (counter) filter.counter = counter;

  const rows = await Display.find(filter)
    .populate("department")
    .populate("counter")
    .populate({
      path: "currentToken",
      populate: [{ path: "department" }, { path: "queueDay" }],
    })
    .sort({ updatedAt: -1 });

  res.json({ success: true, message: successMessage("requestAuthorized"), data: rows });
};
