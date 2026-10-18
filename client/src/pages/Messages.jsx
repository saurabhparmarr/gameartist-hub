import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Mail, RefreshCw, Send, UserRound } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import EmptyState from "../components/EmptyState.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import {
  getAllOpenProjects,
  getAllArtists,
  getConversation,
  getMessageConversations,
  getRequestErrorMessage,
  sendArtistMessage,
} from "../services/artistService.js";

function getMessageId(user) {
  return user?._id || user;
}

function Messages() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeUserId = searchParams.get("userId");
  const activeName = searchParams.get("name");
  const recentStorageKey = `gameartist-hub-recent-contacts-${user.id}`;
  const [contacts, setContacts] = useState([]);
  const [messages, setMessages] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [conversationLoading, setConversationLoading] = useState(false);
  const [contactsError, setContactsError] = useState("");
  const [conversationError, setConversationError] = useState("");
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState("");

  const addContact = useCallback((contact) => {
    if (!contact?.id) return;
    setContacts((current) => {
      if (current[0]?.id === contact.id && current[0]?.name === contact.name) return current;
      const updated = [contact, ...current.filter((item) => item.id !== contact.id)];
      localStorage.setItem(recentStorageKey, JSON.stringify(updated.slice(0, 30)));
      return updated;
    });
  }, [recentStorageKey]);

  useEffect(() => {
    let isActive = true;
    const loadContacts = async () => {
      setContactsLoading(true);
      setContactsError("");
      let knownContacts = [];
      let conversations = [];
      try {
        if (user.role === "studio") {
          const artists = await getAllArtists();
          knownContacts = artists.map((artist) => ({
            id: String(getMessageId(artist.user)),
            name: artist.user?.name || "Artist",
            role: "artist",
          })).filter((contact) => contact.id && contact.id !== "undefined");
        } else {
          const projects = await getAllOpenProjects();
          const studioContacts = new Map();
          for (const project of projects) {
            const studio = project.studio;
            const id = String(getMessageId(studio));
            if (id && id !== "undefined") {
              studioContacts.set(id, { id, name: studio?.name || "Studio", role: "studio" });
            }
          }
          knownContacts = [...studioContacts.values()];
        }
      } catch (requestError) {
        if (isActive) setContactsError(getRequestErrorMessage(requestError));
      }

      if (isActive) {
        try {
          conversations = await getMessageConversations();
        } catch (requestError) {
          if (isActive) setContactsError(getRequestErrorMessage(requestError));
        }
      }

      if (isActive) {
        try {
          const savedContacts = JSON.parse(localStorage.getItem(recentStorageKey) || "[]");
          const conversationContacts = conversations.map((conversation) => ({
            id: String(getMessageId(conversation.user)),
            name: conversation.user?.name || "GameArtist Hub member",
            role: conversation.user?.role || "member",
            latestMessage: conversation.latestMessage,
            unreadCount: conversation.unreadCount,
          })).filter((contact) => contact.id && contact.id !== "undefined");
          const saved = Array.isArray(savedContacts) ? savedContacts : [];
          const suggestedContacts = [...new Map(
            [...saved, ...knownContacts].map((contact) => [contact.id, contact]),
          ).values()];
          const conversationIds = new Set(conversationContacts.map((contact) => contact.id));
          setContacts([
            ...conversationContacts,
            ...suggestedContacts.filter((contact) => !conversationIds.has(contact.id)),
          ]);
        } catch {
          setContacts(knownContacts);
          localStorage.removeItem(recentStorageKey);
        }
        setContactsLoading(false);
      }
    };

    loadContacts();
    return () => { isActive = false; };
  }, [recentStorageKey, user.role]);

  const activeContact = useMemo(() => {
    if (!activeUserId) return null;
    return contacts.find((contact) => contact.id === activeUserId)
      || { id: activeUserId, name: activeName || "GameArtist Hub member", role: "contact" };
  }, [activeName, activeUserId, contacts]);

  const loadConversation = useCallback(async (contact) => {
    if (!contact?.id) return;
    setConversationLoading(true);
    setConversationError("");
    try {
      const result = await getConversation(contact.id);
      setMessages(result);
      setContacts((current) => current.map((item) =>
        item.id === contact.id ? { ...item, unreadCount: 0 } : item,
      ));
      addContact(contact);
    } catch (requestError) {
      setConversationError(getRequestErrorMessage(requestError));
      setMessages([]);
    } finally {
      setConversationLoading(false);
    }
  }, [addContact]);

  useEffect(() => {
    if (activeContact) loadConversation(activeContact);
    else {
      setMessages([]);
      setConversationError("");
    }
  }, [activeContact, loadConversation]);

  async function handleSend(event) {
    event.preventDefault();
    const content = messageText.trim();
    if (!content || !activeContact) return;

    setSending(true);
    setConversationError("");
    setNotice("");
    try {
      const sentMessage = await sendArtistMessage(activeContact.id, content);
      setContacts((current) => current.map((contact) =>
        contact.id === activeContact.id
          ? { ...contact, latestMessage: sentMessage, unreadCount: 0 }
          : contact,
      ));
      setMessageText("");
      await loadConversation(activeContact);
      setNotice("Message sent.");
    } catch (sendError) {
      setConversationError(getRequestErrorMessage(sendError));
    } finally {
      setSending(false);
    }
  }

  function selectContact(contact) {
    addContact(contact);
    setSearchParams({ userId: contact.id, name: contact.name });
    setNotice("");
  }

  function formatTime(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? "Time unavailable"
      : date.toLocaleString([], { dateStyle: "short", timeStyle: "short" });
  }

  return (
    <section className="messages-page">
      <div className="container">
        <header className="dashboard-page-heading messages-heading">
          <div><span className="eyebrow"><span className="eyebrow-dot" /> COLLABORATION</span><h1>Messages</h1><p>Talk directly with artists and studios about your next collaboration.</p></div>
        </header>
        <div className="messages-info-note">Your previous conversations appear alongside suggested artists and studios. Conversation history is private to its participants.</div>
        <div className="messages-workspace">
          <aside className="conversation-sidebar">
            <div className="conversation-sidebar-heading"><h2>People</h2><span>{contacts.length}</span></div>
            {contactsError && <ErrorMessage message={contactsError} compact />}
            {contactsLoading ? <p className="conversation-loading">Finding available contacts…</p> : contacts.length ? (
              <div className="conversation-contact-list">
                {contacts.map((contact) => (
                  <button className={`conversation-contact${activeContact?.id === contact.id ? " conversation-contact-active" : ""}`} type="button" key={contact.id} onClick={() => selectContact(contact)}>
                    <span className="conversation-avatar"><UserRound size={17} /></span>
                    <span>
                      <span className="conversation-contact-title">
                        <strong>{contact.name}</strong>
                        {contact.unreadCount > 0 && (
                          <span className="conversation-unread-count" aria-label={`${contact.unreadCount} unread messages`}>
                            {contact.unreadCount > 99 ? "99+" : contact.unreadCount}
                          </span>
                        )}
                      </span>
                      <small>{contact.role === "contact" ? "Recent contact" : contact.role}</small>
                      {contact.latestMessage?.content && <small>{contact.latestMessage.content}</small>}
                    </span>
                    <ArrowRight size={14} />
                  </button>
                ))}
              </div>
            ) : !contactsError ? (
              <EmptyState
                title="No contacts available"
                message={user.role === "artist" ? "Studios appear here when they have an open project." : "Artists appear here after publishing a public profile."}
              />
            ) : null}
          </aside>

          <section className="conversation-panel" aria-label="Conversation">
            {activeContact ? (
              <>
                <header className="conversation-header">
                  <span className="conversation-avatar"><UserRound size={18} /></span>
                  <div><h2>{activeContact.name}</h2><span>{activeContact.role === "contact" ? "GameArtist Hub member" : activeContact.role}</span></div>
                  <button className="icon-button" type="button" aria-label="Refresh conversation" onClick={() => loadConversation(activeContact)} disabled={conversationLoading}><RefreshCw size={16} /></button>
                </header>
                {conversationError && <ErrorMessage message={conversationError} compact />}
                {notice && <p className="dashboard-success message-notice" role="status">{notice}</p>}
                <div className="conversation-messages" aria-live="polite">
                  {conversationLoading ? <p className="conversation-loading">Loading conversation…</p> : messages.length ? messages.map((message) => {
                    const senderId = String(getMessageId(message.sender));
                    const isMine = senderId === String(user.id);
                    const senderName = isMine ? "You" : message.sender?.name || activeContact.name;
                    return (
                      <article className={`message-bubble${isMine ? " message-bubble-mine" : ""}`} key={message._id}>
                        <div><strong>{senderName}</strong><time dateTime={message.createdAt}>{formatTime(message.createdAt)}</time></div>
                        <p>{message.content}</p>
                      </article>
                    );
                  }) : !conversationError ? (
                    <div className="conversation-empty"><Mail size={22} /><strong>No messages yet</strong><span>Start the conversation with a short introduction.</span></div>
                  ) : null}
                </div>
                <form className="message-compose" onSubmit={handleSend}>
                  <label className="sr-only" htmlFor="conversation-message">Write a message</label>
                  <textarea id="conversation-message" rows="2" maxLength="5000" value={messageText} onChange={(event) => setMessageText(event.target.value)} placeholder="Write a message…" required />
                  <button className="button button-primary" type="submit" disabled={sending || !messageText.trim()}><Send size={15} /> {sending ? "Sending…" : "Send"}</button>
                </form>
                <span className="message-character-count">{messageText.length}/5000 characters</span>
              </>
            ) : (
              <div className="conversation-prompt"><span><Mail size={24} /></span><h2>Select someone to message</h2><p>Choose a person from your contacts to read or send messages.</p></div>
            )}
          </section>
        </div>
      </div>
    </section>
  );
}

export default Messages;
