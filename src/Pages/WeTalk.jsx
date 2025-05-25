// src/pages/WeTalk.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const WeTalk = () => {
  const navigate = useNavigate();
  const [threads, setThreads] = useState([]);
  const [newThread, setNewThread] = useState("");
  const [selectedThread, setSelectedThread] = useState(null);
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState({});

  const handleCreateThread = () => {
    if (!newThread.trim()) return;
    const id = Date.now();
    setThreads([{ id, text: newThread }, ...threads]);
    setNewThread("");
  };

  const handleAddComment = () => {
    if (!comment.trim()) return;
    const updated = { ...comments };
    if (!updated[selectedThread.id]) {
      updated[selectedThread.id] = [];
    }
    updated[selectedThread.id].push(comment);
    setComments(updated);
    setComment("");
  };

  return (
    <div className="max-w-4xl mx-auto p-6 dark:text-white">
      <h1 className="text-4xl font-bold text-center mb-4">💬 We Talk</h1>
      <p className="text-center text-gray-500 dark:text-gray-400 mb-6">
        A space to speak your truth. Open threads. Share thoughts. Be heard.
      </p>

      {/* Create Thread */}
      {!selectedThread && (
        <>
          <textarea
            placeholder="Start a new thread..."
            className="w-full p-3 border rounded dark:bg-gray-800 dark:text-white"
            value={newThread}
            onChange={(e) => setNewThread(e.target.value)}
          />
          <Button className="mt-2" onClick={handleCreateThread}>
            Post Thread
          </Button>
        </>
      )}

      {/* Thread List */}
      {!selectedThread && threads.length > 0 && (
        <div className="mt-6">
          <h2 className="text-2xl font-semibold mb-2">🧵 Threads</h2>
          <ul className="space-y-2">
            {threads.map((thread) => (
              <li
                key={thread.id}
                className="bg-white dark:bg-gray-800 p-3 rounded cursor-pointer border hover:border-blue-500"
                onClick={() => setSelectedThread(thread)}
              >
                {thread.text}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* View Thread */}
      {selectedThread && (
        <div className="mt-6">
          <Button variant="ghost" onClick={() => setSelectedThread(null)}>
            ← Back to Threads
          </Button>
          <div className="bg-white dark:bg-gray-800 p-4 mt-4 rounded shadow">
            <h2 className="text-xl font-bold mb-2">🧵 {selectedThread.text}</h2>
            <div className="space-y-2 mb-4">
              {(comments[selectedThread.id] || []).map((c, idx) => (
                <p key={idx} className="bg-gray-100 dark:bg-gray-700 p-2 rounded">
                  {c}
                </p>
              ))}
            </div>
            <textarea
              placeholder="Write a comment..."
              className="w-full p-2 border rounded dark:bg-gray-800 dark:text-white mb-2"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <Button onClick={handleAddComment}>Comment</Button>
          </div>
        </div>
      )}

      <div className="mt-10">
        <Button onClick={() => navigate("/experiments")}>
          ← Back to Experiments
        </Button>
      </div>
    </div>
  );
};

export default WeTalk;