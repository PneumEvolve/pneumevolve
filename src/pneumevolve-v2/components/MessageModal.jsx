// MessageModal.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";

export default function MessageModal({
  isOpen,
  onClose,
  senderEmail,      // current logged-in user's email
  recipientEmail,   // worker's email
  onSent,           // optional callback after success
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const API = import.meta.env.VITE_API_URL;

  // Clear text when closing
  useEffect(() => {
    if (!isOpen) setText("");
  }, [isOpen]);

  // Don’t mount UI when closed
  if (!isOpen) return null;

  // Guard against missing emails
  if (!recipientEmail || !senderEmail) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-zinc-900 p-4 rounded-lg w-full max-w-md shadow">
          <h2 className="text-lg font-semibold mb-2">Message Worker</h2>
          <div className="p-3 rounded bg-red-50 text-red-700">
            Missing sender or recipient email.
          </div>
          <div className="mt-3 flex justify-end">
            <button className="px-3 py-1 rounded bg-gray-200" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    );
  }

  const handleSend = async () => {
    const content = text.trim();
    if (!content) return;
    setSending(true);
    try {
      await axios.post(`${API}/conversations/dm/send`, {
        sender_email: senderEmail,
        recipient_email: recipientEmail,
        content,
      });
      setText("");
      onSent?.();
      onClose();
    } catch (err) {
      console.error("Failed to send DM:", err);
      // Optional toast/UI error here
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-lg w-full max-w-md shadow">
        <h2 className="text-lg font-semibold">Message Worker</h2>
        <p className="text-xs opacity-70 mb-2">To: {recipientEmail}</p>
        <textarea
          className="w-full border rounded p-2 h-28"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write your message…"
        />
        <div className="mt-3 flex gap-2 justify-end">
          <button className="px-3 py-1 rounded bg-gray-200" onClick={onClose} disabled={sending}>
            Cancel
          </button>
          <button
            className="px-3 py-1 rounded bg-blue-600 text-white disabled:opacity-60"
            onClick={handleSend}
            disabled={sending || !text.trim()}
          >
            {sending ? "Sending…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}