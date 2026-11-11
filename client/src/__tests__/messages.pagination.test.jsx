import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Messages from "../pages/Messages.jsx";

const mocks = vi.hoisted(() => ({
  getAllOpenProjects: vi.fn(),
  getAllArtists: vi.fn(),
  getConversation: vi.fn(),
  getMessageConversations: vi.fn(),
  getRequestErrorMessage: vi.fn((error) => error.message),
  sendArtistMessage: vi.fn(),
}));

vi.mock("../context/AuthContext.jsx", () => ({
  useAuth: () => ({ user: { id: "current-user", role: "artist" } }),
}));

vi.mock("../services/artistService.js", () => mocks);

describe("Message history pagination", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
    mocks.getAllOpenProjects.mockResolvedValue([]);
    mocks.getMessageConversations
      .mockResolvedValueOnce({
        conversations: [{
          user: { _id: "contact-id", name: "Test Studio", role: "studio" },
          latestMessage: { content: "Latest message" },
          unreadCount: 0,
        }],
        pagination: {
          limit: 20,
          total: 2,
          hasMore: true,
          nextCursor: {
            beforeCreatedAt: "2025-01-02T00:00:00.000Z",
            beforeUserId: "507f1f77bcf86cd799439012",
          },
        },
      })
      .mockResolvedValueOnce({
        conversations: [],
        pagination: { limit: 20, total: 2, hasMore: false, nextCursor: null },
      });
    mocks.getConversation
      .mockResolvedValueOnce({
        messages: [{ _id: "message-2", content: "Newer message", sender: "current-user" }],
        pagination: {
          limit: 30,
          hasMore: true,
          nextCursor: {
            beforeCreatedAt: "2025-01-01T00:00:00.000Z",
            beforeId: "507f1f77bcf86cd799439011",
          },
        },
      })
      .mockResolvedValueOnce({
        messages: [{ _id: "message-1", content: "Older message", sender: "contact-id" }],
        pagination: { limit: 30, hasMore: false, nextCursor: null },
      });
  });

  it("loads older history and additional conversation summaries", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/messages?userId=contact-id"]}>
        <Messages />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Newer message")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Load older messages" }));
    expect(await screen.findByText("Older message")).toBeInTheDocument();
    await waitFor(() => {
      expect(mocks.getConversation).toHaveBeenLastCalledWith("contact-id", {
        beforeCreatedAt: "2025-01-01T00:00:00.000Z",
        beforeId: "507f1f77bcf86cd799439011",
      });
    });

    await user.click(screen.getByRole("button", { name: "Load more conversations" }));
    await waitFor(() => {
      expect(mocks.getMessageConversations).toHaveBeenLastCalledWith({
        limit: 20,
        beforeCreatedAt: "2025-01-02T00:00:00.000Z",
        beforeUserId: "507f1f77bcf86cd799439012",
      });
    });
    expect(screen.queryByRole("button", { name: "Load more conversations" }))
      .not.toBeInTheDocument();
  });

  it("shows all legacy results without pagination controls when metadata is absent", async () => {
    const user = userEvent.setup();
    const legacyContacts = Array.from({ length: 22 }, (_, index) => ({
      user: { _id: `legacy-contact-${index}`, name: `Legacy Contact ${index}`, role: "studio" },
      latestMessage: { content: `Summary ${index}` },
      unreadCount: 0,
    }));
    const legacyMessages = Array.from({ length: 35 }, (_, index) => ({
      _id: `legacy-message-${index}`,
      content: `Legacy Message ${index}`,
      sender: "current-user",
      createdAt: "2025-01-01T00:00:00.000Z",
    }));
    mocks.getMessageConversations.mockReset().mockResolvedValue({
      conversations: legacyContacts,
    });
    mocks.getConversation.mockReset().mockImplementation((contactId) => Promise.resolve({
      messages: contactId === "legacy-contact-21"
        ? [{ _id: "switched-message", content: "Switched legacy conversation" }]
        : legacyMessages,
    }));

    render(
      <MemoryRouter initialEntries={["/messages?userId=legacy-contact-0"]}>
        <Messages />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Legacy Message 34")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Legacy Contact 21/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Load older messages" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Load more conversations" })).not.toBeInTheDocument();
    expect(mocks.getConversation).toHaveBeenCalledWith("legacy-contact-0");
    await user.click(screen.getByRole("button", { name: /^Legacy Contact 21/ }));
    expect(await screen.findByText("Switched legacy conversation")).toBeInTheDocument();
    expect(mocks.getConversation).toHaveBeenLastCalledWith("legacy-contact-21");
  });
});
