import jwt from "jsonwebtoken";
import User from "../model/user.model.js";

export const protect = async (req, res, next) => {
  try {
    const auth = req.headers.authorization;
    const bearerToken = auth && auth.startsWith("Bearer ") ? auth.split(" ")[1] : null;
    const cookieToken = req.cookies?.token;
    const token = bearerToken || cookieToken;

    if (!token) {
      res.status(401);
      throw new Error("Not authorized, missing token");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id || decoded._id;
    if (!userId) {
      res.status(401);
      throw new Error("Not authorized, invalid token payload");
    }

    const user = await User.findById(userId).select("-password");
    if (!user) {
      res.status(401);
      throw new Error("Not authorized, user not found");
    }

    req.user = user;
    next();
  } catch (e) {
    res.status(401);
    next(new Error("Not authorized, invalid token"));
  }
};

export const authorize =
  (...roles) =>
  (req, res, next) => {
    if (!req.user) {
      res.status(401);
      throw new Error("Not authorized");
    }
    if (!roles.includes(req.user.role)) {
      res.status(403);
      throw new Error("Forbidden: insufficient role");
    }
    next();
  };
