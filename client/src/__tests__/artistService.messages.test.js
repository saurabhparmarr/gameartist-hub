import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("../services/api.js", () => ({ default: api }));

import {
  getConversation,
  getMessageConversations,
} from "../services/artistService.js";

describe("message API response compatibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("accepts legacy backend arrays without pagination metadata", async () => {
    const conversations = Array.from({ length: 21 }, (_, index) => ({
      user: { _id: `contact-${index}`, name: `Contact ${index}` },
    }));
    const messages = Array.from({ length: 35 }, (_, index) => ({
      _id: `message-${index}`,
      content: `Message ${index}`,
    }));
    api.get
      .mockResolvedValueOnce({
        data: { success: true, data: { conversations } },
      })
      .mockResolvedValueOnce({
        data: { success: true, data: { messages } },
      });

    const summaryResult = await getMessageConversations({ limit: 20 });
    const historyResult = await getConversation("peer-id");

    expect(summaryResult.conversations).toHaveLength(21);
    expect(summaryResult.pagination).toBeNull();
    expect(historyResult.messages).toHaveLength(35);
    expect(historyResult.messages.at(-1).content).toBe("Message 34");
    expect(historyResult.pagination).toBeNull();
  });

  it("retains cursor metadata from the paginated backend", async () => {
    const nextCursor = {
      beforeCreatedAt: "2025-01-01T00:00:00.000Z",
      beforeId: "507f1f77bcf86cd799439011",
    };
    api.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          messages: [{ _id: nextCursor.beforeId, content: "Latest page" }],
          pagination: { limit: 30, hasMore: true, nextCursor },
        },
      },
    });

    const result = await getConversation("peer-id");

    expect(result.messages).toHaveLength(1);
    expect(result.pagination).toEqual({ limit: 30, hasMore: true, nextCursor });
  });

  it("preserves the existing AbortSignal call form", async () => {
    const controller = new AbortController();
    api.get
      .mockResolvedValueOnce({
        data: { success: true, data: { messages: [] } },
      })
      .mockResolvedValueOnce({
        data: { success: true, data: { conversations: [] } },
      });

    await getConversation("peer-id", controller.signal);
    await getMessageConversations(controller.signal);

    expect(api.get).toHaveBeenCalledWith(
      "/messages/peer-id",
      expect.objectContaining({ signal: controller.signal }),
    );
    expect(api.get).toHaveBeenCalledWith(
      "/messages",
      expect.objectContaining({ signal: controller.signal }),
    );
  });

  it("does not suppress API errors or malformed message responses", async () => {
    api.get.mockRejectedValueOnce(new Error("network unavailable"));
    await expect(getMessageConversations()).rejects.toThrow("network unavailable");

    api.get.mockResolvedValueOnce({
      data: { success: false, message: "Not authorized" },
    });
    await expect(getConversation("peer-id")).rejects.toThrow("Not authorized");

    api.get.mockResolvedValueOnce({
      data: { success: true, data: { conversations: null } },
    });
    await expect(getMessageConversations()).rejects.toThrow(
      "unexpected conversation list",
    );
  });
});
