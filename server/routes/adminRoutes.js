import { Router } from "express";
import {
  deleteProject,
  getArtists,
  getDashboard,
  getProjects,
  getStudios,
  getUsers,
  setUserStatus,
} from "../controllers/adminController.js";
import adminMiddleware from "../middleware/adminMiddleware.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = Router();

router.use(authMiddleware, adminMiddleware);
router.get("/dashboard", getDashboard);
router.get("/users", getUsers);
router.patch("/users/:id/status", setUserStatus);
router.get("/artists", getArtists);
router.get("/studios", getStudios);
router.get("/projects", getProjects);
router.delete("/projects/:id", deleteProject);

export default router;
