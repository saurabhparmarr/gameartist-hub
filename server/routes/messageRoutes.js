import { Router } from "express";
import {
  getConversations,
  getConversation,
  sendMessage,
} from "../controllers/messageController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = Router();

router.use(authMiddleware);
router.get("/", getConversations);
router.post("/:receiverId", sendMessage);
router.get("/:userId", getConversation);

export default router;
