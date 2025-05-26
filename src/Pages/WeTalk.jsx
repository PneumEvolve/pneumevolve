// src/pages/WeTalk.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { authFetch } from "@/authFetch";

const API_URL = "https://shea-klipper-backend.onrender.com";

const WeTalk = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [userId, setUserId] = useState(null);
  const [threads, setThreads] = useState([]);
  const [newThread, setNewThread] = useState("");
  const [selectedThread, setSelectedThread] = useState(null);
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState([]);
  const [userEmail, setUserEmail] = useState(null);

  useEffect(() => {
  const id = localStorage.getItem("user_id");
  const email = localStorage.getItem("user_email");
  if (id) setUserId(parseInt(id));
  if (email) setUserEmail(email);
}, []);

  const fetchThreads = async () => {
    try {
      const res = await fetch(`${API_URL}/forum/threads`);
      const data = await res.json();
      setThreads(data);
    } catch (err) {
      console.error("Failed to fetch threads:", err);
    }
  };

  const fetchComments = async (threadId) => {
    try {
      const res = await fetch(`${API_URL}/forum/threads/${threadId}/comments`);
      if (!res.ok) throw new Error("Failed to fetch comments");
      const data = await res.json();
      setComments(data);
    } catch (err) {
      console.error(err);
      setComments([]);
    }
  };

  useEffect(() => {
    fetchThreads();
  }, []);

  const handleCreateThread = async () => {
    if (!newThread.trim()) return;
    const res = await authFetch(`${API_URL}/forum/threads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: newThread }),
    });
    const data = await res.json();
    setThreads([data, ...threads]);
    setNewThread("");
  };

  const handleAddComment = async () => {
    if (!comment.trim() || !selectedThread) return;
    const res = await authFetch(`${API_URL}/forum/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ thread_id: selectedThread.id, text: comment }),
    });
    const data = await res.json();
    setComments((prev) => [...prev, data]);
    setComment("");
  };

  const handleSelectThread = async (thread) => {
    setSelectedThread(thread);
    fetchComments(thread.id);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 dark:text-white">
      <h1 className="text-4xl font-bold text-center mb-4">💬 We Talk</h1>
      <p className="text-center text-gray-500 dark:text-gray-400 mb-6">
        A space to speak your truth. Share thoughts. Be heard.
      </p>

      {!selectedThread && token && (
        <>
          <textarea
            placeholder="Start a new talk..."
            className="w-full p-3 border rounded dark:bg-gray-800 dark:text-white"
            value={newThread}
            onChange={(e) => setNewThread(e.target.value)}
          />
          <Button className="mt-2" onClick={handleCreateThread}>
            Post
          </Button>
        </>
      )}

      {!selectedThread && threads.length > 0 && (
        <div className="mt-6">
          <h2 className="text-2xl font-semibold mb-2">🧵 Talks</h2>
          <ul className="space-y-2">
            {threads.map((thread) => (
              <li
                key={thread.id}
                className="bg-white dark:bg-gray-800 p-3 rounded border flex justify-between items-center"
              >
                <span onClick={() => handleSelectThread(thread)} className="cursor-pointer">
                  {thread.text}
                </span>
                {(thread.user_id === userId || userEmail === "sheaklipper@gmail.com") && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={async () => {
                      await authFetch(`${API_URL}/forum/threads/${thread.id}`, { method: "DELETE" });
                      setThreads(threads.filter((t) => t.id !== thread.id));
                    }}
                  >
                    Delete
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {selectedThread && (
        <div className="mt-6">
          <Button variant="ghost" onClick={() => setSelectedThread(null)}>
            ← Back to Talks
          </Button>
          <div className="bg-white dark:bg-gray-800 p-4 mt-4 rounded shadow">
            <h2 className="text-xl font-bold mb-2">🧵 {selectedThread.text}</h2>
            <div className="space-y-2 mb-4">
              {comments.map((c) => (
                <div
                  key={c.id}
                  className="bg-gray-100 dark:bg-gray-700 p-2 rounded flex justify-between items-center"
                >
                  <span>{c.text}</span>
                  {(c.user_id === userId || userEmail === "sheaklipper@gmail.com") && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={async () => {
                        await authFetch(`${API_URL}/forum/comments/${c.id}`, { method: "DELETE" });
                        setComments(comments.filter((com) => com.id !== c.id));
                      }}
                    >
                      Delete
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {token ? (
              <>
            <textarea
              placeholder="Write a comment..."
              className="w-full p-2 border rounded dark:bg-gray-800 dark:text-white mb-2"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <Button onClick={handleAddComment}>Comment</Button>
            </>
        ) : (
          <p className="text-sm text-gray-400">Login to add a comment</p>
        )}
          </div>
        </div>
      )}

      <div className="mt-10">
        <Button onClick={() => navigate("/")}>
          ← Back to PneumEvolve
        </Button>
      </div>
    </div>
  );
};

export default WeTalk;