import { Router } from "express";
import {
  createArtistProfile,
  getArtistById,
  getArtists,
  updateArtistProfile,
} from "../controllers/artistController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = Router();

router.get("/", getArtists);
router.get("/:id", getArtistById);
router.post("/profile", authMiddleware, createArtistProfile);
router.put("/profile", authMiddleware, updateArtistProfile);

export default router;
