import mongoose from "mongoose";
import Message from "../models/Message.js";
import User from "../models/User.js";
import ApiResponse from "../utils/ApiResponse.js";

export const sendMessage = async (req, res, next) => {
  if (!mongoose.isObjectIdOrHexString(req.params.receiverId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid receiver ID",
    });
  }

  const { content } = req.body || {};
  if (typeof content !== "string" || !content.trim()) {
    return res.status(400).json({
      success: false,
      message: "Message content is required",
    });
  }
  if (content.trim().length > 5000) {
    return res.status(400).json({
      success: false,
      message: "Message content cannot exceed 5000 characters",
    });
  }
  if (req.params.receiverId === req.user.id) {
    return res.status(400).json({
      success: false,
      message: "You cannot send a message to yourself",
    });
  }

  try {
    const receiver = await User.findById(req.params.receiverId).select("_id");
    if (!receiver) {
      return res
        .status(404)
        .json({ success: false, message: "Message receiver not found" });
    }

    const message = await Message.create({
      sender: req.user.id,
      receiver: receiver._id,
      content: content.trim(),
    });
    return res
      .status(201)
      .json(new ApiResponse(201, { message }, "Message sent successfully"));
  } catch (error) {
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({ success: false, message: error.message });
    }
    return next(error);
  }
};

export const getConversations = async (req, res, next) => {
  try {
    const messages = await Message.find({
      $or: [{ sender: req.user.id }, { receiver: req.user.id }],
    })
      .populate("sender", "name role")
      .populate("receiver", "name role")
      .sort({ createdAt: -1 });

    const conversations = new Map();
    for (const message of messages) {
      const isSender = String(message.sender?._id) === req.user.id;
      const otherUser = isSender ? message.receiver : message.sender;
      if (!otherUser?._id) continue;

      const otherUserId = String(otherUser._id);
      const conversation = conversations.get(otherUserId) || {
        user: otherUser,
        latestMessage: message,
        unreadCount: 0,
      };

      if (!isSender && !message.read) conversation.unreadCount += 1;
      conversations.set(otherUserId, conversation);
    }

    return res.status(200).json(
      new ApiResponse(
        200,
        { conversations: [...conversations.values()] },
        "Conversations retrieved successfully",
      ),
    );
  } catch (error) {
    return next(error);
  }
};

export const getConversation = async (req, res, next) => {
  if (!mongoose.isObjectIdOrHexString(req.params.userId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid user ID",
    });
  }
  if (req.params.userId === req.user.id) {
    return res.status(400).json({
      success: false,
      message: "Conversation user must be someone else",
    });
  }

  try {
    const otherUser = await User.findById(req.params.userId).select("_id");
    if (!otherUser) {
      return res
        .status(404)
        .json({ success: false, message: "Conversation user not found" });
    }

    await Message.updateMany(
      { sender: otherUser._id, receiver: req.user.id, read: false },
      { $set: { read: true } },
    );

    const messages = await Message.find({
      $or: [
        { sender: req.user.id, receiver: otherUser._id },
        { sender: otherUser._id, receiver: req.user.id },
      ],
    })
      .populate("sender", "name role")
      .populate("receiver", "name role")
      .sort({ createdAt: 1 });

    return res
      .status(200)
      .json(new ApiResponse(200, { messages }, "Conversation retrieved successfully"));
  } catch (error) {
    return next(error);
  }
};
