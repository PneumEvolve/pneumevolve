import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from 'uuid';
import CookieConsent from "react-cookie-consent";

const API = import.meta.env.VITE_API_URL;

export default function Forge() {
  const [ideas, setIdeas] = useState([]);
  const [newIdea, setNewIdea] = useState({ title: "", description: "" });
  const [loading, setLoading] = useState(false);
  const { userEmail, accessToken } = useAuth();
  const navigate = useNavigate();
  const [cookiesAccepted, setCookiesAccepted] = useState(false); // New state to track cookie consent

  const fetchIdeas = async () => {
    try {
      const res = await axios.get(`${API}/forge/ideas`);
      setIdeas(res.data);
    } catch (err) {
      console.error("Error fetching ideas:", err);
    }
  };

  useEffect(() => {
    fetchIdeas();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newIdea.title || !newIdea.description) return;
    try {
      setLoading(true);
      await axios.post(
        `${API}/forge/ideas`,
        newIdea,
        { headers: { "x-user-email": userEmail } }
      );
      setNewIdea({ title: "", description: "" });
      fetchIdeas();
    } catch (err) {
      console.error("Error creating idea:", err);
    } finally {
      setLoading(false);
    }
  };

 const handleVote = async (id, hasVoted) => {
  try {
    let userId = localStorage.getItem('user_id') || ""; // Get user_id from localStorage if present

    // If no userId exists, generate a new one and store it in localStorage
    if (!userId) {
      userId = uuidv4(); // Generate a new UUID for anonymous users
      localStorage.setItem('user_id', userId); // Store the user_id in localStorage
    }

    // Send headers, now including user_id from localStorage
    const headers = {
      "x-user-email": userEmail || "",  // Include userEmail if signed in (empty if anonymous)
      "x-user-id": userId,  // Send the user_id from localStorage
      "Authorization": userEmail ? `Bearer ${accessToken}` : "",  // Include Authorization if user is signed in
    };

    // Vote logic (toggle)
    if (hasVoted) {
      // If already voted, remove the vote (toggle functionality)
      await axios.post(`${API}/forge/ideas/${id}/remove-vote`, {}, { 
        headers,
        withCredentials: false // No need for cookies, using localStorage instead
      });
    } else {
      // Otherwise, add the vote
      await axios.post(`${API}/forge/ideas/${id}/vote`, {}, { 
        headers,
        withCredentials: false // No need for cookies, using localStorage instead
      });
    }

    // Refresh the idea list
    fetchIdeas(); 

  } catch (err) {
    alert("Error voting. Please try again.");
    console.error("Error voting:", err);
  }
};

  const handleJoin = async (id) => {
    const existing = ideas.find(
      (idea) =>
        idea.id === id &&
        idea.workers?.some((worker) => worker.email === userEmail)
    );
    if (existing) {
      alert("You have already joined this idea.");
      return;
    }

    try {
      await axios.post(
        `${API}/forge/ideas/${id}/join`,
        {},
        { headers: { "Authorization": `Bearer ${accessToken}`, "x-user-email": userEmail } }
      );
      alert("You've joined this idea, and the creator has been notified!");
      fetchIdeas(); // Refresh the idea list
    } catch (err) {
      alert("You’ve already joined this idea or need to log in.");
      console.error("Error joining:", err);
    }
  };

  const handleRemoveWorker = async (id) => {
    try {
      await axios.post(
        `${API}/forge/ideas/${id}/remove-worker`,
        {},
        { headers: { "x-user-email": userEmail } }
      );
      fetchIdeas();
      alert("You have left the idea.");
    } catch (err) {
      console.error("Error removing worker:", err);
      alert("There was an error removing you from the idea.");
    }
  };

  const handleDelete = async (id) => {
    const idea = ideas.find((idea) => idea.id === id);
    if (userEmail === "sheaklipper@gmail.com" || idea?.user_email === userEmail) {
      try {
        await axios.delete(`${API}/forge/ideas/${id}`, {
          headers: { "x-user-email": userEmail },
        });
        fetchIdeas();
      } catch (err) {
        console.error("Error deleting idea:", err);
      }
    } else {
      alert("You are not authorized to delete this idea.");
    }
  };

  // Handle cookie consent
  const handleCookieConsent = () => {
    setCookiesAccepted(true); // Track cookie consent
  };

  return (
    <div className="min-h-screen p-6 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="max-w-3xl mx-auto space-y-10">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">🛠️ The Forge</h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
            Share your feature ideas, vote on what gets built next, and join the co-creation process.
          </p>
        </div>

        {userEmail && (
          <form onSubmit={handleSubmit} className="space-y-6 mb-10">
            <input
              type="text"
              placeholder="Feature title..."
              className="w-full p-4 rounded bg-gray-100 dark:bg-gray-800 text-lg"
              value={newIdea.title}
              onChange={(e) => setNewIdea({ ...newIdea, title: e.target.value })}
            />
            <textarea
              placeholder="Describe the idea in detail..."
              rows={4}
              className="w-full p-4 rounded bg-gray-100 dark:bg-gray-800 text-lg"
              value={newIdea.description}
              onChange={(e) => setNewIdea({ ...newIdea, description: e.target.value })}
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
            >
              {loading ? "Submitting..." : "Submit Idea"}
            </button>
          </form>
        )}

        <div className="space-y-6">
          {ideas.map((idea) => {
            const isCreator = idea.user_email === userEmail || userEmail === "sheaklipper@gmail.com";
            const isWorker = idea.workers?.some(worker => worker.email === userEmail);

            // Check if the user has already voted
            const hasVoted = idea.voters?.includes(userEmail);

            return (
              <div key={idea.id} className="p-6 rounded-xl shadow-lg bg-green-100 dark:bg-green-800 space-y-4">
                <h2 className="text-2xl font-semibold">{idea.title}</h2>
                <p className="text-sm text-gray-800 dark:text-gray-200">{idea.description}</p>
                <div className="flex items-center justify-between">
                  <span>Status: {idea.status}</span>
                  {idea.workers && idea.workers.length > 0 && (
                    <div className="flex items-center space-x-2 text-sm">
                      <span>Workers:</span>
                      {idea.workers.map((worker, idx) => (
                        <span key={idx} className="text-sm font-semibold">{worker.username}</span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-x-3 flex justify-end items-center">
                  {/* Vote button with toggle functionality */}
                  <button
                    onClick={() => handleVote(idea.id, hasVoted)} // Pass the vote status to toggle it
                    className={`px-2 py-1 rounded ${hasVoted ? "bg-red-600 text-white" : "bg-white border border-green-600 text-green-700"} dark:text-green-300`}
                  >
                    {idea.votes.length === 1 ? `👍 1 Vote` : `👍 ${idea.votes.length} Votes`}
                  </button>

                  {!isWorker && userEmail && (
                    <button
                      onClick={() => handleJoin(idea.id)}
                      className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700"
                    >
                      I want to work on this
                    </button>
                  )}

                  {isWorker && userEmail && (
                    <button
                      onClick={() => handleRemoveWorker(idea.id)}
                      className="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700"
                    >
                      I don't want to work on this anymore
                    </button>
                  )}

                  {isCreator && (
                    <>
                      <button
                        onClick={() => navigate(`/forge/${idea.id}`)}
                        className="bg-yellow-600 text-white px-3 py-2 rounded-lg hover:bg-yellow-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(idea.id)}
                        className="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <CookieConsent
          buttonText="Got it!"
          style={{ background: "#2B373B", color: "#fff", fontSize: "14px", padding: "10px" }}
          buttonStyle={{ background: "#4e8df2", color: "#fff", padding: "10px", fontSize: "14px", borderRadius: "5px" }}
          expires={365}
          onAccept={handleCookieConsent} // Handle the consent
        >
          This website uses cookies to enhance the user experience. By continuing to browse, you consent to our use of cookies.
        </CookieConsent>
      </div>
    </div>
  );
}