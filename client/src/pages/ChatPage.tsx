import { useEffect, useState } from "react";
import { FaPencil, FaRegUser } from "react-icons/fa6";
import { MdDelete } from "react-icons/md";
import { PiNotePencilBold } from "react-icons/pi";

type Conversation = {
  _id: string;
  title?: string;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
  message_count?: number;
};

type Message = {
  _id?: string;
  conversation_id?: string;
  role: string;
  content: string;
  timestamp?: string;
  tokens_used?: number;
};

type ChatPageProps = {
  accessToken: string;
  userName: string;
  onLogout: () => void;
};

const CHAT_BASE = "http://localhost:5000/api/chat";

export default function ChatPage({ accessToken, userName, onLogout }: ChatPageProps) {
  const [chatTitle, setChatTitle] = useState("Welcome to AI Chatbot");
  const [titleInp, setTitleInp] = useState({ editing: false, title: "" });
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const loadMessages = async (conversationId: string) => {
    try {
      const response = await fetch(`${CHAT_BASE}/history/${conversationId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        throw new Error("Unable to fetch messages");
      }

      const data = await response.json();
      setMessages(data.messages ?? []);
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  };

  const loadConversations = async () => {
    if (!accessToken) return;

    try {
      const response = await fetch(`${CHAT_BASE}/conversations`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }

      const data = await response.json();
      const list = data.conversations ?? [];
      setConversations(list);

      if (list.length === 0) {
        setCurrentConversationId(null);
        setMessages([]);
        return;
      }

      if (!currentConversationId) {
        const nextConversationId = list[0]._id;
        setCurrentConversationId(nextConversationId);
        await loadMessages(nextConversationId);
      }
    } catch (error) {
      console.error("Error loading conversations:", error);
    }
  };

  const deleteConversation = async (conversationId: string) => {
    if (!accessToken) return;

    try {
      await fetch(`${CHAT_BASE}/conversation/${conversationId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      await loadConversations();
    } catch (error) {
      console.error("Error deleting conversation:", error);
    }
  };

  const handleNewChat = async () => {
    if (!accessToken) return;

    try {
      const response = await fetch(`${CHAT_BASE}/new-conversation`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const data = await response.json();
      if (!data || !data.conversation_id) {
        throw new Error("Missing conversation ID");
      }

      setCurrentConversationId(data.conversation_id);
      setMessages([]);
      await loadConversations();
    } catch (error) {
      console.error("Error creating new conversation:", error);
    }
  };

  const selectConversation = async (conversationId: string) => {
    setCurrentConversationId(conversationId);
    await loadMessages(conversationId);
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || isLoading || !accessToken) return;

    const trimmedMessage = messageInput.trim();

    let targetConversationId = currentConversationId;

    if (!targetConversationId) {
      const createdConversation = await fetch(`${CHAT_BASE}/new-conversation`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const createdData = await createdConversation.json();
      targetConversationId = createdData.conversation_id;
      setCurrentConversationId(targetConversationId);
    }

    const nextMessage = { role: "user", content: trimmedMessage };
    setMessages((previous) => [...previous, nextMessage]);
    setMessageInput("");
    setIsLoading(true);
    setIsTyping(true);

    try {
      const response = await fetch(`${CHAT_BASE}/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          message: trimmedMessage,
          conversation_id: targetConversationId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to get AI response");
      }

      await loadMessages(targetConversationId!);
      await loadConversations();
      setCurrentConversationId(targetConversationId);
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((previous) => [
        ...previous,
        { role: "assistant", content: "Error: Unable to connect to server" },
      ]);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSendMessage();
    }
  };

  useEffect(() => {
    if (accessToken) {
      void loadConversations();
    }
  }, [accessToken]);

  return (
    <div className="chat-app-shell">
      <div className="sidebar">
        <div className="sidebar-header">
          <h2>💬 Chats</h2>
          <button type="button" className="new-chat-btn" onClick={() => void handleNewChat()}>
            <PiNotePencilBold />
            New Chat
          </button>
        </div>

        <div className="conversations-list">
          {conversations.length === 0 ? (
            <p style={{ fontSize: 12, color: "#8b949e" }}>No conversations yet</p>
          ) : (
            conversations.map((conversation) => (
              <div
                key={conversation._id}
                className={`conversation-item ${conversation._id === currentConversationId ? "active" : ""}`}
                onClick={() => void selectConversation(conversation._id)}
              >
                <span>{conversation.title || "Untitled"}</span>
                <MdDelete
                  className="del-btn"
                  size={16}
                  onClick={(event) => {
                    event.stopPropagation();
                    void deleteConversation(conversation._id);
                  }}
                />
              </div>
            ))
          )}
        </div>
      </div>

      <div className="main-content">
        <div className="chat-header">
          <div className="chat-title">
            {titleInp.editing ? (
              <input
                type="text"
                value={titleInp.title}
                onChange={(event) => setTitleInp({ ...titleInp, title: event.target.value })}
                onBlur={() => {
                  setTitleInp({ ...titleInp, editing: false });
                  setChatTitle(titleInp.title || chatTitle);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    setTitleInp({ ...titleInp, editing: false });
                    setChatTitle(titleInp.title || chatTitle);
                  }
                }}
                autoFocus
              />
            ) : (
              <h1>{chatTitle}</h1>
            )}
            {titleInp.editing ? null : (
              <FaPencil
                size={12}
                onClick={() => setTitleInp({ editing: true, title: chatTitle })}
                style={{ cursor: "pointer" }}
              />
            )}
          </div>

          <div className="header-actions">
            <span className="user-name">
              <FaRegUser />
              Welcome, {userName}
            </span>
            <button type="button" className="logout-btn" onClick={onLogout}>
              🚪 Logout
            </button>
          </div>
        </div>

        <div className="messages-container">
          {messages.length === 0 && !isTyping ? (
            <div className="empty-state">
              <h2>🤖 AI Chatbot</h2>
              <p>Start a new conversation or select one from the sidebar</p>
            </div>
          ) : (
            messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`message ${message.role}`}>
                <div className="message-content">{message.content}</div>
              </div>
            ))
          )}

          {isTyping && (
            <div className="message assistant">
              <div className="typing-indicator">
                <div className="typing-dot" />
                <div className="typing-dot" />
                <div className="typing-dot" />
              </div>
            </div>
          )}
        </div>

        <div className="input-area">
          <div className="input-wrapper">
            <textarea
              className="message-input"
              value={messageInput}
              onChange={(event) => setMessageInput(event.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Type your message... (Shift+Enter for new line)"
              rows={1}
              disabled={isLoading}
            />
            <button type="button" className="send-btn" disabled={isLoading} onClick={() => void handleSendMessage()}>
              ➤ Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
