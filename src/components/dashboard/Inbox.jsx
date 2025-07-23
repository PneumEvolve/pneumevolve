import React, { useEffect, useState } from "react";
import axios from "axios";

export default function Inbox({ userId, setUnreadCount }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const API = import.meta.env.VITE_API_URL;

  useEffect(() => {
    if (!userId) return;

    const fetchInbox = async () => {
      try {
        const res = await axios.get(`${API}/inbox/${userId}`);
        console.log("📥 Inbox API response:", res.data);
        if (Array.isArray(res.data)) {
          setMessages(res.data);
        } else {
          console.warn("Inbox response was not an array:", res.data);
          setMessages([]);
        }
      } catch (err) {
        console.error("Inbox fetch error:", err);
        setError("Failed to load inbox.");
      } finally {
        setLoading(false);
      }
    };

    fetchInbox();
  }, [userId]);

  const markAsRead = async (id) => {
  try {
    await axios.post(`${API}/inbox/read/${id}`);
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === id ? { ...msg, read: true } : msg
      )
    );

    // ✅ Decrease unread count in parent state
    if (setUnreadCount) {
      setUnreadCount((prev) => Math.max(prev - 1, 0));
    }

  } catch (err) {
    console.error("Failed to mark message as read:", err);
  }
};

  if (loading) return <p>Loading inbox...</p>;
  if (error) return <p className="text-red-500">{error}</p>;
  if (!messages.length) return <p className="text-gray-400 italic">No new messages.</p>;

  return (
    <div className="space-y-4">
      {messages.map((msg) => (
        <div
          key={msg.id || msg.timestamp}
          onClick={() => !msg.read && markAsRead(msg.id)}
          className={`p-4 rounded shadow cursor-pointer transition ${
            msg.read
              ? "bg-gray-100 dark:bg-zinc-700 text-gray-500"
              : "bg-white dark:bg-zinc-800 border-l-4 border-blue-500 font-medium"
          }`}
        >
          <p className="text-sm">{new Date(msg.timestamp).toLocaleString()}</p>
          <p className="mt-1">{msg.content}</p>
        </div>
      ))}
    </div>
  );
}