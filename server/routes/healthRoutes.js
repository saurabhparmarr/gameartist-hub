import { Router } from "express";
import ApiResponse from "../utils/ApiResponse.js";

const router = Router();

router.get("/", (req, res) => {
  res.status(200).json(
    new ApiResponse(200, { status: "UP" }, "GameArtist Hub API is running"),
  );
});

export default router;
