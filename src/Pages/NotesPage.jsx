// src/pages/NotesPage.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import axios from "axios";
import ReactMarkdown from "react-markdown";

const API = import.meta.env.VITE_API_URL;

export default function NotesPage() {
  const { index } = useParams();
  const navigate = useNavigate();
  const [sections, setSections] = useState([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const { userEmail, accessToken } = useAuth();
  const isEditable = userEmail === "sheaklipper@gmail.com";

  useEffect(() => {
    const fetchSections = async () => {
      try {
        const res = await axios.get(`${API}/living-plan`);
        const plan = res.data;
        setSections(plan);
        if (plan[index]) {
          setNotes(plan[index].notes || "");
        } else {
          console.error("Invalid section index");
        }
      } catch (err) {
        console.error("Failed to load sections:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSections();
  }, [index]);

  const handleSave = async () => {
    try {
      const updated = [...sections];
      updated[index].notes = notes;
      await axios.post(`${API}/living-plan`, updated, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      alert("Notes saved!");
    } catch (err) {
      alert("Failed to save notes.");
      console.error(err);
    }
  };

  if (loading) return <p className="text-center mt-10 text-gray-500">Loading notes...</p>;

  const section = sections[index];
  if (!section) return <p className="text-center mt-10 text-red-500">Section not found.</p>;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">📝 Notes for: {section.title || `Section ${index}`}</h1>

      {isEditable ? (
  <div className="flex flex-col md:flex-row gap-6">
    <textarea
      className="w-full md:w-1/2 min-h-[300px] border rounded p-4 text-base bg-white dark:bg-gray-900 dark:text-white"
      value={notes}
      onChange={(e) => setNotes(e.target.value)}
      placeholder="Write notes for this section..."
    />
    <div className="w-full md:w-1/2 p-4 border rounded bg-white dark:bg-gray-900 prose dark:prose-invert max-w-none overflow-auto">
      <ReactMarkdown>{notes}</ReactMarkdown>
    </div>
  </div>
) : (
  <div className="prose dark:prose-invert bg-gray-50 dark:bg-gray-900 p-4 rounded">
    <ReactMarkdown>{notes}</ReactMarkdown>
  </div>
)}

      <div className="flex justify-between items-center">
        <button
          onClick={() => navigate(-1)}
          className="text-blue-600 hover:underline text-sm"
        >
          ← Back
        </button>
        {isEditable && (
          <button
            onClick={handleSave}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
          >
            Save Notes
          </button>
        )}
      </div>
    </div>
  );
}