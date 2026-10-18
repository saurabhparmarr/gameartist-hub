import { Router } from "express";
import {
  createPortfolioItem,
  deletePortfolioItem,
  getPortfolioItemById,
  getPortfolioItems,
  updatePortfolioItem,
} from "../controllers/portfolioController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = Router();

router
  .route("/")
  .get(getPortfolioItems)
  .post(authMiddleware, createPortfolioItem);
router
  .route("/:id")
  .get(getPortfolioItemById)
  .put(authMiddleware, updatePortfolioItem)
  .delete(authMiddleware, deletePortfolioItem);

export default router;
