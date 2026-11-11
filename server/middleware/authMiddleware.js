import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/User.js";

const authMiddleware = async (req, res, next) => {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Authentication token is required",
    });
  }

  const token = authorization.slice(7).trim();
  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Authentication token is required",
    });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token",
    });
  }

  if (
    typeof decoded === "string" ||
    !mongoose.isObjectIdOrHexString(decoded.id) ||
    !["artist", "studio", "admin"].includes(decoded.role)
  ) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token",
    });
  }

  try {
    const user = await User.findById(decoded.id).select("_id name email role isActive");
    if (!user || user.role !== decoded.role) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired authentication token",
      });
    }
    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: "This account has been disabled",
      });
    }

    req.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive !== false,
    };
    return next();
  } catch (error) {
    return next(error);
  }
};

export default authMiddleware;
