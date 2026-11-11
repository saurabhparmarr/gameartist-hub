import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Studio from "../models/Studio.js";
import ApiResponse from "../utils/ApiResponse.js";
import { sanitizeEmail, normalizeString } from "../utils/security.js";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getSafeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  isActive: user.isActive !== false,
  createdAt: user.createdAt,
});

export const register = async (req, res, next) => {
  const { name, email, password, role = "artist" } = req.body || {};

  const sanitizedName = normalizeString(name);
  const sanitizedEmail = sanitizeEmail(email);
  const sanitizedRole = normalizeString(role);

  if (
    typeof sanitizedName !== "string" ||
    !sanitizedName ||
    typeof sanitizedEmail !== "string" ||
    !sanitizedEmail ||
    typeof password !== "string" ||
    !password
  ) {
    return res.status(400).json({
      success: false,
      message: "Name, email, and password are required",
    });
  }

  if (!emailPattern.test(sanitizedEmail)) {
    return res.status(400).json({
      success: false,
      message: "Please provide a valid email address",
    });
  }

  if (password.length < 8 || password.length > 128) {
    return res.status(400).json({
      success: false,
      message: "Password must be between 8 and 128 characters long",
    });
  }

  if (!["artist", "studio"].includes(sanitizedRole)) {
    return res.status(400).json({
      success: false,
      message: "Role must be artist or studio",
    });
  }

  try {
    const existingUser = await User.findOne({ email: sanitizedEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({
      name: sanitizedName,
      email: sanitizedEmail,
      password: hashedPassword,
      role: sanitizedRole,
    });

    if (sanitizedRole === "studio") {
      try {
        await Studio.create({ user: user._id, studioName: sanitizedName });
      } catch (error) {
        await User.findByIdAndDelete(user._id);
        throw error;
      }
    }

    return res
      .status(201)
      .json(new ApiResponse(201, { user: getSafeUser(user) }, "Registration successful"));
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    return next(error);
  }
};

export const login = async (req, res, next) => {
  const { email, password } = req.body || {};

  const sanitizedEmail = sanitizeEmail(email);

  if (typeof sanitizedEmail !== "string" || !sanitizedEmail || typeof password !== "string" || !password) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required",
    });
  }

  try {
    const user = await User.findOne({ email: sanitizedEmail }).select("+password");

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: "This account has been disabled",
      });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" },
    );

    return res.status(200).json(
      new ApiResponse(
        200,
        { token, user: getSafeUser(user) },
        "Login successful",
      ),
    );
  } catch (error) {
    return next(error);
  }
};
