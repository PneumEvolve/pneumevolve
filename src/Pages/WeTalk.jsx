// src/pages/WeTalk.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";

const API = import.meta.env.VITE_API_URL;

const WeTalk = () => {
  const navigate = useNavigate();
  const { accessToken } = useAuth();

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
      const res = await axios.get(`${API}/forum/threads`);
      setThreads(res.data);
    } catch (err) {
      console.error("Failed to fetch threads:", err);
    }
  };

  const fetchComments = async (threadId) => {
    try {
      const res = await axios.get(`${API}/forum/threads/${threadId}/comments`);
      setComments(res.data);
    } catch (err) {
      console.error("Failed to fetch comments:", err);
      setComments([]);
    }
  };

  useEffect(() => {
    fetchThreads();
  }, []);

  const handleCreateThread = async () => {
    if (!newThread.trim()) return;
    try {
      const res = await axios.post(
        `${API}/forum/threads`,
        { text: newThread },
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      setThreads([res.data, ...threads]);
      setNewThread("");
    } catch (err) {
      console.error("Failed to create thread:", err);
    }
  };

  const handleAddComment = async () => {
    if (!comment.trim() || !selectedThread) return;
    try {
      const res = await axios.post(
        `${API}/forum/comments`,
        { thread_id: selectedThread.id, text: comment },
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      setComments((prev) => [...prev, res.data]);
      setComment("");
    } catch (err) {
      console.error("Failed to add comment:", err);
    }
  };

  const handleSelectThread = async (thread) => {
    setSelectedThread(thread);
    fetchComments(thread.id);
  };

  const handleDeleteThread = async (threadId) => {
    try {
      await axios.delete(`${API}/forum/threads/${threadId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setThreads(threads.filter((t) => t.id !== threadId));
    } catch (err) {
      console.error("Failed to delete thread:", err);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await axios.delete(`${API}/forum/comments/${commentId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setComments(comments.filter((c) => c.id !== commentId));
    } catch (err) {
      console.error("Failed to delete comment:", err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 dark:text-white">
      <h1 className="text-4xl font-bold dark:text-black text-center mb-4">💬 We Talk</h1>
      <p className="text-center text-gray-500 dark:text-gray-400 mb-6">
        A space to speak your truth. Share thoughts. Be heard.
      </p>

      {!selectedThread && accessToken && (
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
          <h2 className="text-2xl dark:text-black font-semibold mb-2">🧵 Talks</h2>
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
                  <Button size="sm" variant="destructive" onClick={() => handleDeleteThread(thread.id)}>
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
                    <Button size="sm" variant="destructive" onClick={() => handleDeleteComment(c.id)}>
                      Delete
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {accessToken ? (
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
        <Button onClick={() => navigate("/")}>← Back to PneumEvolve</Button>
      </div>
    </div>
  );
};

export default WeTalk;