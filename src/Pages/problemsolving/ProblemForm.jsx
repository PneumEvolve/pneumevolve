import React, { useState } from "react";
import axios from "axios";

export default function ProblemForm({ onNewProblem }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/problems`, {
        title,
        description,
      });
      onNewProblem(res.data);
      setTitle("");
      setDescription("");
    } catch (err) {
      console.error("Error submitting problem:", err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <input
        className="w-full p-2 border rounded"
        placeholder="State the problem simply..."
        maxLength={100}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <textarea
        className="w-full p-2 border rounded"
        placeholder="Add context (optional)"
        rows={3}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">
        Submit Problem
      </button>
    </form>
  );
}