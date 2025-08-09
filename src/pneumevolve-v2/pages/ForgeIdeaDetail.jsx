import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "@/context/AuthContext"; // Import useAuth to get userEmail

const API = import.meta.env.VITE_API_URL;

export default function ForgeIdeaDetail() {
  const { id } = useParams();
  const [idea, setIdea] = useState({ title: "", description: "" });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { userEmail } = useAuth(); // Fetch userEmail from the AuthContext

  useEffect(() => {
    const fetchIdea = async () => {
      try {
        const res = await axios.get(`${API}/forge/ideas/${id}`);
        setIdea(res.data);
      } catch (err) {
        console.error("Error fetching idea:", err);
      }
    };

    fetchIdea();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      console.log("User Email being sent:", userEmail);
      await axios.put(
        `${API}/forge/ideas/${id}`,
        { title: idea.title, description: idea.description },
        { headers: { "x-user-email": userEmail } } // Include userEmail in the headers
      );
      navigate(`/forge/${id}`); // Redirect to the idea detail page after update
    } catch (err) {
      console.error("Error updating idea:", err);
    } finally {
      setLoading(false);
    }
  };

  // GoBack button component
  const handleGoBack = () => {
    navigate("/forge"); // Navigate to the Forge page
  };

  return (
    <div className="min-h-screen p-6 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="max-w-4xl mx-auto space-y-10">
        <h1 className="text-4xl font-bold">Edit Idea</h1>
        
        {/* GoBack Button */}
        <button
          onClick={handleGoBack}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mb-4"
        >
          Back to Forge
        </button>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              value={idea.title}
              onChange={(e) => setIdea({ ...idea, title: e.target.value })}
              placeholder="Idea Title"
              className="w-full p-3 rounded bg-gray-100 dark:bg-gray-800"
            />
          </div>
          <div>
            <textarea
              value={idea.description}
              onChange={(e) => setIdea({ ...idea, description: e.target.value })}
              placeholder="Idea Description"
              rows={4}
              className="w-full p-3 rounded bg-gray-100 dark:bg-gray-800"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </form>
      </div>
    </div>
  );
}