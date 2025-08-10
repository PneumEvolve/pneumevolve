import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import IdeaConversation from "@/components/IdeaConversation";

const API = import.meta.env.VITE_API_URL;

export default function ForgeIdeaDetail() {
  const { id } = useParams();
  const [idea, setIdea] = useState({ title: "", description: "", notes: "" });
  const [notes, setNotes] = useState("");
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { userEmail } = useAuth();

  // Collapsible state
  const [showMeta, setShowMeta] = useState(false);        // Title/Description (closed by default)
  const [showNotes, setShowNotes] = useState(true);       // Notes (open)
  const [showConversation, setShowConversation] = useState(true); // Conversation (open)

  useEffect(() => {
    const fetchIdea = async () => {
      try {
        const res = await axios.get(`${API}/forge/ideas/${id}`);
        setIdea(res.data);
        setNotes(res.data.notes || ""); // keep empty instead of placeholder
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
      await axios.put(
        `${API}/forge/ideas/${id}`,
        { title: idea.title, description: idea.description },
        { headers: { "x-user-email": userEmail } }
      );
      navigate(`/forge/${id}`);
    } catch (err) {
      console.error("Error updating idea:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotes = () => {
    axios
      .post(`${API}/forge/ideas/${id}/notes`, { content: notes })
      .then((response) => {
        setIdea((prev) => ({ ...prev, notes: response.data.notes }));
        setIsEditingNotes(false);
      })
      .catch((error) => {
        console.error("Error saving notes:", error);
      });
  };

  const handleGoBack = () => {
    navigate("/forge");
  };

  return (
    <div className="min-h-screen p-6 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold">Idea Details</h1>

        {/* GoBack Button */}
        <button
          onClick={handleGoBack}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mb-2"
        >
          Back to Forge
        </button>

        {/* Section: Title & Description (collapsible) */}
        <div className="border rounded-lg">
          <button
            type="button"
            onClick={() => setShowMeta((s) => !s)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-t-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
            aria-expanded={showMeta}
          >
            <span className="font-semibold">Title & Description</span>
            <span className="text-2xl leading-none select-none">
              {showMeta ? "−" : "+"}
            </span>
          </button>

          {showMeta && (
            <div className="p-4 space-y-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <input
                    type="text"
                    value={idea.title}
                    onChange={(e) => setIdea({ ...idea, title: e.target.value })}
                    placeholder="Idea Title"
                    className="w-full p-3 rounded bg-gray-100 dark:bg-gray-800"
                    disabled={!userEmail}
                  />
                </div>
                <div>
                  <textarea
                    value={idea.description}
                    onChange={(e) =>
                      setIdea({ ...idea, description: e.target.value })
                    }
                    placeholder="Idea Description"
                    rows={4}
                    className="w-full p-3 rounded bg-gray-100 dark:bg-gray-800"
                    disabled={!userEmail}
                  />
                </div>
                {userEmail && (
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                  >
                    {loading ? "Saving..." : "Save"}
                  </button>
                )}
              </form>
            </div>
          )}
        </div>

        {/* Section: Notes (collapsible) */}
        <div className="border rounded-lg">
          <button
            type="button"
            onClick={() => setShowNotes((s) => !s)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-t-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
            aria-expanded={showNotes}
          >
            <span className="font-semibold">In-depth Notes</span>
            <span className="text-2xl leading-none select-none">
              {showNotes ? "−" : "+"}
            </span>
          </button>

          {showNotes && (
            <div className="p-4">
              {isEditingNotes && userEmail ? (
                <div>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows="10"
                    className="w-full p-3 rounded bg-gray-100 dark:bg-gray-800"
                  />
                  <div className="mt-4">
                    <button
                      onClick={handleSaveNotes}
                      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mr-2"
                    >
                      Save Notes
                    </button>
                    <button
                      onClick={() => setIsEditingNotes(false)}
                      className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="max-w-none">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeRaw]}
                      components={{
                        h1: (props) => (
                          <h1
                            className="text-3xl font-bold mt-6 mb-3"
                            {...props}
                          />
                        ),
                        h2: (props) => (
                          <h2
                            className="text-2xl font-semibold mt-5 mb-2"
                            {...props}
                          />
                        ),
                        h3: (props) => (
                          <h3
                            className="text-xl font-semibold mt-4 mb-2"
                            {...props}
                          />
                        ),
                        p: (props) => (
                          <p className="mt-3 leading-7" {...props} />
                        ),
                        ul: (props) => (
                          <ul
                            className="list-disc ml-6 mt-3 space-y-1"
                            {...props}
                          />
                        ),
                        ol: (props) => (
                          <ol
                            className="list-decimal ml-6 mt-3 space-y-1"
                            {...props}
                          />
                        ),
                        a: (props) => (
                          <a
                            className="text-blue-600 hover:underline"
                            target="_blank"
                            rel="noreferrer"
                            {...props}
                          />
                        ),
                        code: ({ inline, ...props }) =>
                          inline ? (
                            <code
                              className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800"
                              {...props}
                            />
                          ) : (
                            <code
                              className="block p-3 rounded bg-gray-100 dark:bg-gray-800 overflow-auto"
                              {...props}
                            />
                          ),
                      }}
                    >
                      {notes || ""}
                    </ReactMarkdown>
                  </div>
                  {userEmail && (
                    <button
                      onClick={() => setIsEditingNotes(true)}
                      className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                      Edit Notes
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section: Idea Conversation (collapsible) */}
        <div className="border rounded-lg">
          <button
            type="button"
            onClick={() => setShowConversation((s) => !s)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-t-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
            aria-expanded={showConversation}
          >
            <span className="font-semibold">Idea Conversation</span>
            <span className="text-2xl leading-none select-none">
              {showConversation ? "−" : "+"}
            </span>
          </button>

          {showConversation && (
            <div className="p-4">
              <IdeaConversation ideaId={idea.id} userEmail={userEmail} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}