import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "../../context/AuthContext";


export default function CommunityChat({ communityId }) {
  const { accessToken } = useAuth();
  const userId = Number(localStorage.getItem("user_id"));
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [fetched, setFetched] = useState(false);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/communities/${communityId}/chat`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setMessages(res.data);
      setFetched(true);
    } catch (err) {
      console.error("Error loading chat:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = () => {
    setExpanded(!expanded);
    if (!fetched && !loading) fetchMessages();
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    setSubmitting(true);
    try {
      const res = await api.post(
        `/communities/${communityId}/chat`,
        { content: newMessage },
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      setMessages([...messages, res.data]);
      setNewMessage("");
    } catch (err) {
      console.error("Error sending message:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const deleteMessage = async (messageId) => {
    try {
      await api.delete(`/communities/${communityId}/chat/${messageId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setMessages(messages.filter((msg) => msg.id !== messageId));
    } catch (err) {
      console.error("Error deleting message:", err);
    }
  };

  return (
    <div className="border rounded mb-6 bg-white shadow">
      <button
        onClick={toggleExpand}
        className="w-full text-left px-4 py-2 bg-gray-100 hover:bg-gray-200 font-bold text-lg flex justify-between items-center"
      >
        💬 Community Chat
        <span className="text-sm">{expanded ? "➖" : "➕"}</span>
      </button>

      {expanded && (
        <div className="p-4 space-y-4">
          {loading ? (
            <p className="text-gray-500">Loading chat...</p>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {messages.map((msg) => (
                <div key={msg.id} className="border-b pb-2">
                  <div className="flex justify-between items-center text-sm text-gray-600">
                    <strong>{msg.username || `User ${msg.user_id}`}</strong>
                    <span className="text-xs text-gray-400">
                      {new Date(msg.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-sm text-gray-800">{msg.content}</p>
                    {msg.user_id === userId && (
                      <button
                        onClick={() => deleteMessage(msg.id)}
                        className="ml-4 text-xs text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex space-x-2 pt-2">
            <input
              className="flex-grow border px-3 py-1 rounded"
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <button
              onClick={sendMessage}
              disabled={submitting}
              className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}