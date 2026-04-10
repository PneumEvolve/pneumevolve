// src/components/communities/CommunityChat.jsx
import React, { useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Send, Trash2 } from "lucide-react";
import CollapsibleComponent from "../ui/CollapsibleComponent";
 
export default function CommunityChat({ communityId }) {
  const { accessToken } = useAuth();
  const userId = Number(localStorage.getItem("user_id"));
 
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fetched, setFetched] = useState(false);
 
  const fetchMessages = async () => {
    if (fetched || loading) return;
    setLoading(true);
    try {
      const res = await api.get(`/communities/${communityId}/chat`);
      setMessages(res.data);
      setFetched(true);
    } catch (err) {
      console.error("Error loading chat:", err);
    } finally {
      setLoading(false);
    }
  };
 
  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    setSubmitting(true);
    try {
      const res = await api.post(`/communities/${communityId}/chat`, {
        content: newMessage,
      });
      setMessages((prev) => [...prev, res.data]);
      setNewMessage("");
    } catch (err) {
      console.error("Error sending message:", err);
    } finally {
      setSubmitting(false);
    }
  };
 
  const deleteMessage = async (messageId) => {
    try {
      await api.delete(`/communities/${communityId}/chat/${messageId}`);
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    } catch (err) {
      console.error("Error deleting message:", err);
    }
  };
 
  return (
    <CollapsibleComponent title="💬 Community Chat" defaultOpen={false}>
      <div
        className="space-y-3"
        // Fetch messages when first opened
        ref={(el) => { if (el && !fetched) fetchMessages(); }}
      >
        {loading ? (
          <div className="text-center opacity-60 text-sm py-4">Loading chat…</div>
        ) : messages.length === 0 ? (
          <div className="text-center opacity-60 text-sm py-4">
            No messages yet — say something!
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className="flex items-start justify-between gap-3 py-2"
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-medium text-sm">
                      {msg.username || `User ${msg.user_id}`}
                    </span>
                    <span className="text-xs opacity-40">
                      {new Date(msg.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm opacity-80 mt-0.5">{msg.content}</p>
                </div>
                {msg.user_id === userId && (
                  <button
                    onClick={() => deleteMessage(msg.id)}
                    className="shrink-0 opacity-40 hover:opacity-100 transition text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
 
        {/* Send message */}
        <div className="flex gap-2 pt-2">
          <input
            className="input flex-1 min-w-0"
            placeholder="Type a message…"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <button
            onClick={sendMessage}
            disabled={submitting || !newMessage.trim()}
            className="btn"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </CollapsibleComponent>
  );
}