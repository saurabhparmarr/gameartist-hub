import { Router } from "express";
import {
  createProject,
  deleteProject,
  getProjectById,
  getMyProjects,
  getProjects,
  updateProject,
} from "../controllers/projectController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = Router();

router
  .route("/")
  .get(getProjects)
  .post(authMiddleware, createProject);
router.get("/mine", authMiddleware, getMyProjects);
router
  .route("/:id")
  .get(getProjectById)
  .put(authMiddleware, updateProject)
  .delete(authMiddleware, deleteProject);

export default router;
