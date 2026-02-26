import QueueDay from "../model/queueDay.model.js";
import Token from "../model/token.model.js";
import { getTodayDateOnly, parseDateOnly } from "../utils/dateOnly.js";

export const getAdminDashboard = async (req, res) => {
  const { department, date } = req.query;

  if (!department) {
    res.status(400);
    throw new Error("department is required");
  }

  const targetDate = date ? parseDateOnly(date) : getTodayDateOnly();
  if (date && !targetDate) {
    res.status(400);
    throw new Error("date must be in YYYY-MM-DD format");
  }

  const queueDay = await QueueDay.findOne({
    department,
    date: targetDate,
    status: { $in: ["active", "paused"] },
  }).select("_id status");

  const queueStatus = queueDay?.status || "closed";

  if (!queueDay) {
    return res.json({
      success: true,
      data: {
        department,
        queueStatus,
        currentServingNumber: null,
        totalWaitingTokens: 0,
        tokensToday: 0,
        averageWaitTimeMinutes: 0,
        totalCompletedToday: 0,
      },
    });
  }

  const [waitingCount, tokensToday, completedToday] = await Promise.all([
    Token.countDocuments({
      queueDay: queueDay._id,
      status: "waiting",
    }),
    Token.countDocuments({ queueDay: queueDay._id }),
    Token.countDocuments({
      queueDay: queueDay._id,
      status: "completed",
    }),
  ]);

  const currentServing = await Token.findOne({
    queueDay: queueDay._id,
    status: { $in: ["called", "serving"] },
  })
    .sort({ calledAt: -1, issuedAt: -1 })
    .select("tokenNumber status");

  const recentCompleted = await Token.find({
    queueDay: queueDay._id,
    status: "completed",
    issuedAt: { $ne: null },
    calledAt: { $ne: null },
  })
    .sort({ completedAt: -1 })
    .limit(50)
    .select("issuedAt calledAt");

  let averageWaitTimeMinutes = 0;
  if (recentCompleted.length) {
    const totalMs = recentCompleted.reduce(
      (sum, t) => sum + (t.calledAt - t.issuedAt),
      0,
    );
    averageWaitTimeMinutes = Math.max(
      0,
      Math.round(totalMs / recentCompleted.length / 60000),
    );
  }

  res.json({
    success: true,
    data: {
      department,
      queueStatus,
      currentServingNumber: currentServing?.tokenNumber || null,
      totalWaitingTokens: waitingCount,
      tokensToday,
      averageWaitTimeMinutes,
      totalCompletedToday: completedToday,
    },
  });
};
