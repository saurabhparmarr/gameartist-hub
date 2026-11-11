import { Router } from "express";
import mongoose from "mongoose";
import ApiResponse from "../utils/ApiResponse.js";

const router = Router();

router.get("/", (req, res) => {
  res.status(200).json(
    new ApiResponse(200, { status: "UP" }, "GameArtist Hub API is running"),
  );
});

router.get("/ready", async (_req, res) => {
  if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
    return res.status(503).json(
      new ApiResponse(503, { status: "NOT_READY" }, "Database is not ready"),
    );
  }

  try {
    await mongoose.connection.db.admin().ping();
    return res.status(200).json(
      new ApiResponse(200, { status: "READY" }, "Database is ready"),
    );
  } catch {
    console.error("Database readiness probe failed");
    return res.status(503).json(
      new ApiResponse(503, { status: "NOT_READY" }, "Database is not ready"),
    );
  }
});

export default router;
