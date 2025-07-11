// src/components/communities/CommunityChat.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";

const API = import.meta.env.VITE_API_URL;

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
      const res = await axios.get(`${API}/communities/${communityId}/chat`, {
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
      const res = await axios.post(
        `${API}/communities/${communityId}/chat`,
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
      await axios.delete(`${API}/communities/${communityId}/chat/${messageId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setMessages(messages.filter((msg) => msg.id !== messageId));
    } catch (err) {
      console.error("Error deleting message:", err);
    }
  };

  return (
    <div className="p-4 border rounded bg-white mt-6">
      <button
        onClick={toggleExpand}
        className="text-left text-xl font-bold w-full mb-2 flex justify-between items-center"
      >
        💬 Community Chat
        <span className="text-sm">{expanded ? "➖" : "➕"}</span>
      </button>

      {expanded && (
        <>
          {loading ? (
            <p className="text-gray-500">Loading chat...</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto mb-4">
              {messages.map((msg) => (
                <div key={msg.id} className="border-b pb-1">
                  <div className="text-sm text-gray-600">
                    <strong>{msg.username || `User ${msg.user_id}`}</strong>
                    <span className="ml-2 text-xs text-gray-400">
                      {new Date(msg.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-sm">{msg.content}</p>
                    {msg.user_id === userId && (
                      <button
                        onClick={() => deleteMessage(msg.id)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex space-x-2">
            <input
              className="flex-grow border px-2 py-1 rounded"
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <button
              onClick={sendMessage}
              disabled={submitting}
              className="bg-blue-600 text-white px-3 py-1 rounded"
            >
              Send
            </button>
          </div>
        </>
      )}
    </div>
  );
}
