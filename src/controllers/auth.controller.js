import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../model/user.model.js";
import sendEmail from "../utils/sendEmail.js";
import crypto from "crypto";
import { getMessage } from "../config/messages.js";

const successMessage = (key) => getMessage("success", key);
const errorMessage = (key) => getMessage("error", key);

const signToken = (id, role) =>
  jwt.sign({ _id: id, role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "7d" });

const buildJoinQueueNextStep = (department) => {
  if (!department) {
    return null;
  }

  const clientUrl = (process.env.CLIENT_URL || "http://localhost:5173").replace(/\/$/, "");

  return {
    type: "joinQueue",
    redirectUrl: `${clientUrl}/join?department=${encodeURIComponent(department)}&takeToken=1`,
    department,
    takeTokenEnabled: true,
  };
};

const getCookieOptions = () => {
  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
  const isProd = process.env.NODE_ENV === "production";
  const isHttpsClient = clientUrl.startsWith("https://");
  const sameSite = isProd || isHttpsClient ? "None" : "Lax";

  return {
    httpOnly: true,
    secure: sameSite === "None",
    sameSite,
    path: "/",
  };
};

export const register = async (req, res) => {
  const { name, email, password } = req.body;
  const department = req.body.department || req.query.department || null;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error(errorMessage("submissionFailed"));
  }

  const existing = await User.findOne({
    email: email.toLowerCase(),
  });

  if (existing) {
    res.status(409);
    throw new Error(errorMessage("submissionFailed"));
  }

  const hashed = await bcrypt.hash(password, 10);
  
// at registration, the role is always set to customer.
  const user = await User.create({
    name,
    email: email.toLowerCase(),
    password: hashed,
    role: "customer",
    department: null,
  });

  res.cookie("token", signToken(user._id, user.role), getCookieOptions());

  res.status(201).json({
    success: true,
    message: successMessage("submissionSuccessful"),
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: null,
      },
      next: buildJoinQueueNextStep(department),
    },
  });
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  const department = req.body.department || req.query.department || null;

  if (!email || !password) {
    res.status(400);
    throw new Error(errorMessage("submissionFailed"));
  }

  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    res.status(401);
    throw new Error(errorMessage("authenticationFailed"));
  }

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) {
    res.status(401);
    throw new Error(errorMessage("authenticationFailed"));
  }

  res.cookie("token", signToken(user._id, user.role), getCookieOptions());

  res.status(200).json({
    success: true,
    message: successMessage("requestAuthorized"),
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
      },
      next: buildJoinQueueNextStep(department),
    },
  });
};
export const logout = async (req, res) => {
  res.clearCookie("token", getCookieOptions());

  return res.status(200).json({
    success: true,
    message: successMessage("actionExecuted"),
  });
};
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(200).json({
        success: true,
        message: successMessage("operationCompleted"),
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); 
    await user.save({ validateBeforeSave: false });

    const baseUrl = (process.env.CLIENT_URL || "http://localhost:5173").replace(/\/$/, "");
    const resetUrl = `${baseUrl}/reset-password/${resetToken}`;

    await sendEmail({
      to: user.email,
      subject: "Reset your password",
      text: `You requested a password reset. Use this link: ${resetUrl}\nThis link expires in 1 hour.`,
      html: `
        <p>You requested a password reset.</p>
        <p><a href="${resetUrl}">Reset Password</a></p>
        <p>This link expires in 1 hour.</p>
      `,
    });

    return res.status(200).json({
      success: true,
      message: successMessage("operationCompleted"),
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return res.status(500).json({
      success: false,
      message: errorMessage("unableToProcess"),
    });
  }
};

export const validateResetToken = async (req, res) => {
  try {
    const { token } = req.params;

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: errorMessage("submissionFailed"),
      });
    }

    return res.status(200).json({
      success: true,
      message: successMessage("requestAuthorized"),
    });
  } catch (error) {
    console.error("Validate reset token error:", error);
    return res.status(500).json({
      success: false,
      message: errorMessage("unableToProcess"),
    });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ success: false, message: errorMessage("submissionFailed") });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: errorMessage("submissionFailed"),
      });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    return res.status(200).json({
      success: true,
      message: successMessage("submissionSuccessful"),
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).json({
      success: false,
      message: errorMessage("unableToProcess"),
    });
  }
};
