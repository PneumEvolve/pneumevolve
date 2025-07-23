// src/pages/SheasRamblingIdeas.jsx
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function SheasRamblingIdeas() {
  const [ideas, setIdeas] = useState([]);
  const [newIdea, setNewIdea] = useState("");
  const [tag, setTag] = useState("");
  const [editingId, setEditingId] = useState(null);
  const { token, isLoggedIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) return;

    fetch("https://shea-klipper-backend.onrender.com/ramblings", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then(setIdeas)
      .catch((err) => console.error("Failed to fetch ideas:", err));
  }, [token]);

  function handleSubmit(e) {
    e.preventDefault();
    const payload = { content: newIdea, tag };

    const method = editingId ? "PUT" : "POST";
    const url = editingId
      ? `https://shea-klipper-backend.onrender.com/ramblings/${editingId}`
      : "https://shea-klipper-backend.onrender.com/ramblings";

    fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })
      .then((res) => res.json())
      .then((updatedIdea) => {
  if (editingId) {
    setIdeas((prevIdeas) =>
      prevIdeas.map((item) =>
        item.id === editingId
          ? { ...item, ...updatedIdea } // ← merge instead of replace
          : item
      )
    );
  } else {
    setIdeas((prevIdeas) => [updatedIdea, ...prevIdeas]);
  }

  setNewIdea("");
  setTag("");
  setEditingId(null);
});
  }

  function handleDelete(id) {
    fetch(`https://shea-klipper-backend.onrender.com/ramblings/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(() => setIdeas(ideas.filter((idea) => idea.id !== id)))
      .catch((err) => console.error("Delete failed:", err));
  }

  function handleEdit(idea) {
    setNewIdea(idea.content);
    setTag(idea.tag || "");
    setEditingId(idea.id);
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white text-black">
        <p className="text-lg mb-4">Please log in to view and manage your rambling ideas.</p>
        <button
          onClick={() => navigate("/login")}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
        >
          Go to Login
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 bg-white text-black">
      <h1 className="text-3xl font-bold mb-6">My Rambling Ideas</h1>

      <form onSubmit={handleSubmit} className="mb-8">
        <textarea
          value={newIdea}
          onChange={(e) => setNewIdea(e.target.value)}
          placeholder="What's on your mind?"
          className="w-full p-4 border rounded mb-2"
          rows={4}
        />
        <input
          type="text"
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          placeholder="Optional tag"
          className="w-full p-2 border rounded mb-4"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
        >
          {editingId ? "Update Idea" : "Save Idea"}
        </button>
      </form>

      <ul className="space-y-4">
        {ideas.map((idea) => (
          <li key={idea.id} className="border p-4 rounded shadow">
            <p className="mb-2 whitespace-pre-wrap">{idea.content}</p>
            {idea.tag && (
              <span className="text-sm text-gray-600">Tag: {idea.tag}</span>
            )}
            <div className="mt-2">
              <button
                onClick={() => handleEdit(idea)}
                className="text-blue-600 hover:underline mr-4"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(idea.id)}
                className="text-red-600 hover:underline"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
