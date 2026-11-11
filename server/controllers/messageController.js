import mongoose from "mongoose";
import Message from "../models/Message.js";
import User from "../models/User.js";
import ApiResponse from "../utils/ApiResponse.js";

const getLimit = (query) => {
  const limit = Number(query.limit ?? 20);
  return Number.isInteger(limit) && limit >= 1 && limit <= 50 ? limit : null;
};

const sendInvalidPagination = (res) =>
  res.status(400).json({
    success: false,
    message: "Invalid page, limit, or message cursor",
  });

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
      return res.status(400).json({
        success: false,
        message: "Invalid message request",
      });
    }
    return next(error);
  }
};

export const getConversations = async (req, res, next) => {
  const isLegacyRequest =
    req.query.limit === undefined &&
    req.query.beforeCreatedAt === undefined &&
    req.query.beforeUserId === undefined;
  if (isLegacyRequest) {
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
  }

  const limit = getLimit(req.query);
  if (!limit) return sendInvalidPagination(res);

  const { beforeCreatedAt, beforeUserId } = req.query;
  let cursorDate;
  if (
    (beforeCreatedAt === undefined) !== (beforeUserId === undefined) ||
    (beforeCreatedAt !== undefined &&
      (typeof beforeCreatedAt !== "string" ||
        Number.isNaN(Date.parse(beforeCreatedAt)) ||
        typeof beforeUserId !== "string" ||
        !mongoose.isObjectIdOrHexString(beforeUserId)))
  ) {
    return sendInvalidPagination(res);
  }
  if (beforeCreatedAt !== undefined) cursorDate = new Date(beforeCreatedAt);

  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const [result] = await Message.aggregate([
      {
        $match: {
          $or: [{ sender: userId }, { receiver: userId }],
        },
      },
      { $sort: { createdAt: -1, _id: -1 } },
      {
        $addFields: {
          conversationUser: {
            $cond: [{ $eq: ["$sender", userId] }, "$receiver", "$sender"],
          },
          isUnreadInbound: {
            $and: [
              { $eq: ["$receiver", userId] },
              { $eq: ["$read", false] },
            ],
          },
        },
      },
      {
        $group: {
          _id: "$conversationUser",
          latestMessage: { $first: "$$ROOT" },
          lastActivity: { $first: "$createdAt" },
          unreadCount: {
            $sum: { $cond: ["$isUnreadInbound", 1, 0] },
          },
        },
      },
      {
        $facet: {
          metadata: [{ $count: "total" }],
          conversations: [
            ...(cursorDate
              ? [{
                  $match: {
                    $or: [
                      { lastActivity: { $lt: cursorDate } },
                      {
                        lastActivity: cursorDate,
                        _id: { $lt: new mongoose.Types.ObjectId(beforeUserId) },
                      },
                    ],
                  },
                }]
              : []),
            { $sort: { lastActivity: -1, _id: -1 } },
            { $limit: limit + 1 },
            {
              $lookup: {
                from: User.collection.name,
                localField: "_id",
                foreignField: "_id",
                as: "user",
              },
            },
            { $unwind: "$user" },
            {
              $project: {
                _id: 0,
                user: {
                  _id: "$user._id",
                  name: "$user.name",
                  role: "$user.role",
                },
                latestMessage: {
                  _id: "$latestMessage._id",
                  sender: "$latestMessage.sender",
                  receiver: "$latestMessage.receiver",
                  content: "$latestMessage.content",
                  createdAt: "$latestMessage.createdAt",
                  read: "$latestMessage.read",
                },
                lastActivity: 1,
                unreadCount: 1,
              },
            },
          ],
        },
      },
    ]);

    const fetchedConversations = result?.conversations || [];
    const hasMore = fetchedConversations.length > limit;
    const conversations = fetchedConversations.slice(0, limit);
    const total = result?.metadata[0]?.total || 0;
    const lastConversation = conversations[conversations.length - 1];
    const nextCursor = hasMore && lastConversation
      ? {
          beforeCreatedAt: lastConversation.lastActivity.toISOString(),
          beforeUserId: lastConversation.user._id.toString(),
        }
      : null;
    return res.status(200).json(
      new ApiResponse(
        200,
        {
          conversations,
          pagination: {
            limit,
            total,
            hasMore,
            nextCursor,
          },
        },
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

  const isLegacyRequest =
    req.query.limit === undefined &&
    req.query.beforeCreatedAt === undefined &&
    req.query.beforeId === undefined;
  const limit = isLegacyRequest ? null : getLimit(req.query);
  if (!isLegacyRequest && !limit) return sendInvalidPagination(res);

  const { beforeCreatedAt, beforeId } = req.query;
  let cursorDate;
  if (
    (beforeCreatedAt === undefined) !== (beforeId === undefined) ||
    (beforeCreatedAt !== undefined &&
      (typeof beforeCreatedAt !== "string" ||
        Number.isNaN(Date.parse(beforeCreatedAt)) ||
        typeof beforeId !== "string" ||
        !mongoose.isObjectIdOrHexString(beforeId)))
  ) {
    return sendInvalidPagination(res);
  }
  if (beforeCreatedAt !== undefined) cursorDate = new Date(beforeCreatedAt);

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

    const filter = {
      $or: [
        { sender: req.user.id, receiver: otherUser._id },
        { sender: otherUser._id, receiver: req.user.id },
      ],
    };
    if (cursorDate) {
      filter.$and = [{
        $or: [
          { createdAt: { $lt: cursorDate } },
          {
            createdAt: cursorDate,
            _id: { $lt: new mongoose.Types.ObjectId(beforeId) },
          },
        ],
      }];
    }

    const messageQuery = Message.find(filter)
      .populate("sender", "name role")
      .populate("receiver", "name role")
      .sort(isLegacyRequest ? { createdAt: 1 } : { createdAt: -1, _id: -1 });

    if (isLegacyRequest) {
      const messages = await messageQuery;
      return res.status(200).json(
        new ApiResponse(
          200,
          { messages },
          "Conversation retrieved successfully",
        ),
      );
    }

    const fetchedMessages = await messageQuery.limit(limit + 1);
    const hasMore = fetchedMessages.length > limit;
    const messages = fetchedMessages
      .slice(0, limit)
      .reverse();
    const oldestMessage = messages[0];
    const nextCursor = hasMore && oldestMessage
      ? {
          beforeCreatedAt: oldestMessage.createdAt.toISOString(),
          beforeId: oldestMessage._id.toString(),
        }
      : null;

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          messages,
          pagination: {
            limit,
            hasMore,
            nextCursor,
          },
        },
        "Conversation retrieved successfully",
      ),
    );
  } catch (error) {
    return next(error);
  }
};
