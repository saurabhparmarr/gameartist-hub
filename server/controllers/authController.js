import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Studio from "../models/Studio.js";
import ApiResponse from "../utils/ApiResponse.js";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getSafeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  createdAt: user.createdAt,
});

export const register = async (req, res, next) => {
  const { name, email, password, role = "artist" } = req.body || {};

  if (
    typeof name !== "string" ||
    !name.trim() ||
    typeof email !== "string" ||
    !email.trim() ||
    !password
  ) {
    return res.status(400).json({
      success: false,
      message: "Name, email, and password are required",
    });
  }

  if (!emailPattern.test(email.trim())) {
    return res.status(400).json({
      success: false,
      message: "Please provide a valid email address",
    });
  }

  if (typeof password !== "string" || password.length < 8) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 8 characters long",
    });
  }

  if (!["artist", "studio"].includes(role)) {
    return res.status(400).json({
      success: false,
      message: "Role must be artist or studio",
    });
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role,
    });

    if (role === "studio") {
      try {
        await Studio.create({ user: user._id, studioName: name.trim() });
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

  if (typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({
      success: false,
      message: "Email and password are required",
    });
  }

  try {
    const user = await User.findOne({ email: email.trim().toLowerCase() }).select(
      "+password",
    );

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
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
