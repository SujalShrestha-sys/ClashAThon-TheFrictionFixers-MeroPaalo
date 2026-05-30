import jwt from "jsonwebtoken";
import User from "../model/user.model.js";

const getTokenFromRequest = (req) => {
  const auth = req.headers.authorization;
  const bearerToken = auth && auth.startsWith("Bearer ") ? auth.split(" ")[1] : null;
  const cookieToken = req.cookies?.token;

  return bearerToken || cookieToken || null;
};

export const getAuthenticatedUserFromRequest = async (req) => {
  try {
    const token = getTokenFromRequest(req);

    if (!token) {
      return null;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id || decoded._id;

    if (!userId) {
      return null;
    }

    return User.findById(userId).select("-password").exec();
  } catch (error) {
    return null;
  }
};

/**
 * Middleware to verify JWT token and attach user to request
 * Accepts token from:
 * 1. Authorization header: "Bearer <token>"
 * 2. HTTP cookie: token=<token>
 * Throws 401 error if token is missing or invalid
 */
export const protect = async (req, res, next) => {
  try {
    const token = getTokenFromRequest(req);

    // If no token found, reject request
    if (!token) {
      res.status(401);
      throw new Error("Not authorized. Please log in first.");
    }

    // Verify JWT signature and expiry
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id || decoded._id;

    // Validate token payload contains user ID
    if (!userId) {
      res.status(401);
      throw new Error("Not authorized. Invalid token payload.");
    }

    // Find user in database and attach to request
    const user = await User.findById(userId).select("-password");
    if (!user) {
      res.status(401);
      throw new Error("Not authorized. User not found.");
    }

    // Attach user to request for downstream handlers
    req.user = user;
    next();
  } catch (e) {
    res.status(401);
    next(new Error("Not authorized. Invalid or expired token."));
  }
};

/**
 * Middleware to check if user has required role(s)
 * Must be used after protect middleware
 * Example: authorize("admin", "staff")
 */
export const authorize =
  (...roles) =>
    (req, res, next) => {
      // Ensure user was authenticated by protect middleware
      if (!req.user) {
        res.status(401);
        throw new Error("Not authorized. Please log in first.");
      }

      // Check if user's role is in the allowed roles
      if (!roles.includes(req.user.role)) {
        res.status(403);
        throw new Error(`Forbidden. This action requires one of these roles: ${roles.join(", ")}`);
      }

      next();
    };
