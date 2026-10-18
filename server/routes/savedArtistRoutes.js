import { Router } from "express";
import {
  getSavedArtists,
  removeSavedArtist,
  saveArtist,
} from "../controllers/savedArtistController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = Router();

router.use(authMiddleware);
router.get("/", getSavedArtists);
router.post("/:artistId", saveArtist);
router.delete("/:artistId", removeSavedArtist);

export default router;
