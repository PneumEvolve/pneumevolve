import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import MessageModal from "../components/MessageModal";

const API = import.meta.env.VITE_API_URL;

export default function Forge() {
  const [ideas, setIdeas] = useState([]);
  const [newIdea, setNewIdea] = useState({ title: "", description: "" });
  const [loading, setLoading] = useState(false);
  const { userEmail, accessToken } = useAuth();
  const navigate = useNavigate();
  const [sortCriteria, setSortCriteria] = useState("date");

  // Collapsible Submit Form
  const [showSubmitForm, setShowSubmitForm] = useState(false);

  // DM modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [recipientEmail, setRecipientEmail] = useState("");

  // Persistent anonymous UUID (one-time generate)
  const [anonId] = useState(() => {
    let id = localStorage.getItem("anon_id");
    if (!id) {
      id = uuidv4();
      localStorage.setItem("anon_id", id);
    }
    return id;
  });

  // One identity string used everywhere:
  // - logged-in => actual email
  // - anonymous => "anon:{uuid}"
  const identityEmail = useMemo(
    () => userEmail || `anon:${anonId}`,
    [userEmail, anonId]
  );

  const handleOpenModal = (worker) => {
    const email = worker?.user?.email || worker?.email || "";
    if (!email) return;
    setSelectedWorker(worker);
    setRecipientEmail(email);
    setIsModalOpen(true);
  };

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

  const handleSortChange = (e) => setSortCriteria(e.target.value);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newIdea.title || !newIdea.description) return;
    try {
      setLoading(true);
      await axios.post(`${API}/forge/ideas`, newIdea, {
        headers: { "x-user-email": userEmail },
      });
      setNewIdea({ title: "", description: "" });
      fetchIdeas();
      // setShowSubmitForm(false);
    } catch (err) {
      console.error("Error creating idea:", err);
    } finally {
      setLoading(false);
    }
  };

  const sortedIdeas = () => {
    const sorted = [...ideas];
    if (sortCriteria === "title") {
      sorted.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortCriteria === "date") {
      sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (sortCriteria === "votes") {
      sorted.sort(
        (a, b) =>
          (b.votes_count ?? (b.votes?.length || 0)) -
          (a.votes_count ?? (a.votes?.length || 0))
      );
    }
    return sorted;
  };

  const handleVote = async (id, hasVoted) => {
    try {
      // Always send ONE identity header the server can match on:
      // - logged-in: actual email + Authorization
      // - anonymous: synthetic email "anon:{uuid}"
      const headers = { "x-user-email": identityEmail };
      if (userEmail) {
        headers["Authorization"] = `Bearer ${accessToken}`;
      }

      await axios.post(`${API}/forge/ideas/${id}/vote`, {}, { headers });
      // Re-fetch to get updated counts and reflect toggle from the server
      fetchIdeas();
    } catch (err) {
      alert("Error voting. Please try again.");
      console.error("Error voting:", err);
    }
  };

  const handleJoin = async (id) => {
    const existing = ideas.find(
      (idea) => idea.id === id && idea.workers?.some((w) => w.email === userEmail)
    );
    if (existing) {
      alert("You have already joined this idea.");
      return;
    }
    try {
      await axios.post(
        `${API}/forge/ideas/${id}/join`,
        {},
        { headers: { Authorization: `Bearer ${accessToken}`, "x-user-email": userEmail } }
      );
      alert("You've joined this idea, and the creator has been notified!");
      fetchIdeas();
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

  const handleViewNotes = (id) => navigate(`/forge/${id}`);

  return (
    <div className="min-h-screen p-6 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="max-w-3xl mx-auto space-y-10">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">🛠️ The Forge</h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
            Anyone can vote on what gets built next, login to share your feature idea and join the co-creation process.
          </p>
        </div>

        {/* Sorting Bar */}
        <div className="flex justify-end space-x-4 mb-8">
          <span className="text-sm">Sort by:</span>
          <select
            value={sortCriteria}
            onChange={handleSortChange}
            className="p-2 border border-gray-300 rounded"
          >
            <option value="date">Date Created</option>
            <option value="title">Title (A-Z)</option>
            <option value="votes">Votes</option>
          </select>
        </div>

        {/* Collapsible "Submit Idea" */}
        {userEmail && (
          <div className="mb-10">
            <button
              type="button"
              onClick={() => setShowSubmitForm((s) => !s)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
              aria-expanded={showSubmitForm}
            >
              <span className="font-medium">
                {showSubmitForm ? "Hide Idea Form" : "Share an Idea"}
              </span>
              <span className="text-2xl leading-none select-none">
                {showSubmitForm ? "−" : "+"}
              </span>
            </button>

            {showSubmitForm && (
              <form onSubmit={handleSubmit} className="space-y-6 mt-4">
                <input
                  type="text"
                  placeholder="Feature title..."
                  className="w-full p-4 rounded bg-gray-100 dark:bg-gray-800 text-lg"
                  value={newIdea.title}
                  onChange={(e) => setNewIdea({ ...newIdea, title: e.target.value })}
                />
                <textarea
                  placeholder="Describe the idea briefly..."
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
          </div>
        )}

        <div className="space-y-6 mt-10">
          {sortedIdeas().map((idea) => {
            const isCreator =
              idea.user_email === userEmail || userEmail === "sheaklipper@gmail.com";
            const isWorker = idea.workers?.some((w) => w.email === userEmail);

            // hasVoted is checked against ONE identity string
           const hasVoted =
  idea.has_voted ?? idea.votes?.some(v => v.user_email === identityEmail) ?? false;

            return (
              <div
                key={idea.id}
                className="p-6 rounded-xl shadow-lg bg-white dark:bg-zinc-800 border-l-4 border-emerald-500 space-y-4"
              >
                <h2 className="text-2xl font-semibold">{idea.title}</h2>
                <p className="text-sm text-gray-800 dark:text-gray-200">
                  {idea.description}
                </p>

                <div className="flex items-center justify-between">
                  <span>Status: {idea.status}</span>

                  {idea.workers && idea.workers.length > 0 && (
                    <div className="flex items-center space-x-2 text-sm">
                      <span>Workers:</span>
                      {idea.workers.map((worker, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleOpenModal(worker)}
                          title={`Message ${worker.username || worker.email || "worker"}`}
                          className="inline-flex items-center px-2.5 py-1 rounded-full
                                     bg-blue-50 dark:bg-zinc-700
                                     text-blue-700 dark:text-blue-300
                                     border border-blue-200/70 dark:border-zinc-600
                                     hover:bg-blue-100 dark:hover:bg-zinc-600
                                     focus:outline-none focus:ring-2 focus:ring-blue-500
                                     text-sm"
                        >
                          {worker.username || worker.email}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-x-3 flex justify-end items-center">
                  <button
                    onClick={() => handleVote(idea.id, hasVoted)}
                    className={`px-2 py-1 rounded ${
                      hasVoted
                        ? "bg-red-600 text-white"
                        : "bg-white border border-green-600 text-green-700"
                    } dark:text-green-300`}
                  >
                    {idea.votes && idea.votes.length === 1
                      ? `👍 1 Vote`
                      : `👍 ${idea.votes?.length || 0} Votes`}
                  </button>

                  <button
                    onClick={() => handleViewNotes(idea.id)}
                    className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700"
                  >
                    {isCreator ? "Edit/View Notes" : "View Notes"}
                  </button>

                  {!isWorker && userEmail && (
                    <button
                      onClick={() => handleJoin(idea.id)}
                      className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700"
                    >
                      Help
                    </button>
                  )}

                  {isWorker && userEmail && (
                    <button
                      onClick={() => handleRemoveWorker(idea.id)}
                      className="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700"
                    >
                      Quit
                    </button>
                  )}

                  {isCreator && (
                    <button
                      onClick={() => handleDelete(idea.id)}
                      className="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <MessageModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        senderEmail={userEmail}
        recipientEmail={recipientEmail}
        onSent={() => {}}
      />
    </div>
  );
}