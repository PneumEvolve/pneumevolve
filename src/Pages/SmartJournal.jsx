import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Save, Trash, Wand2, Eye, EyeOff, X } from "lucide-react";
import { authFetch } from "@/authFetch";

const API_URL = "https://shea-klipper-backend.onrender.com";

const SmartJournal = () => {
  const [entries, setEntries] = useState([]);
  const [newEntry, setNewEntry] = useState({ title: "", content: "" });
  const [expandedEntries, setExpandedEntries] = useState({});
  const [visibleInsights, setVisibleInsights] = useState({});
  const [selectedAction, setSelectedAction] = useState({});
  const [modal, setModal] = useState({ open: false, entryId: null, type: null });
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  const fetchEntries = async () => {
    try {
      const res = await authFetch(`${API_URL}/journal`);
      const data = await res.json();
      setEntries(data);
    } catch (err) {
      console.error("Failed to fetch journal entries:", err);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const handleCreate = async () => {
    if (!newEntry.title.trim() || !newEntry.content.trim()) return;

    const res = await authFetch(`${API_URL}/journal`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newEntry),
    });

    if (!res) return;
    const data = await res.json();
    setEntries([data, ...entries]);
    setNewEntry({ title: "", content: "" });
  };

  const confirmDeleteEntry = async (id) => {
  const res = await authFetch(`${API_URL}/journal/${id}`, { method: "DELETE" });
  if (!res) return;
  setEntries(entries.filter((e) => e.id !== id));
};

  const handleInsight = async (entry, type) => {
    if (entry[type]) return;

    const backendType = type === "next_action" ? "next-action" : type;

    try {
      const res = await authFetch(`${API_URL}/journal/${backendType}/${entry.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res) return;
      const data = await res.json();
      setEntries((prev) =>
        prev.map((e) => (e.id === entry.id ? { ...e, [type]: data[type] } : e))
      );
    } catch (err) {
      console.error("Insight generation failed:", err);
      alert("Failed to generate insight.");
    }
  };

  const toggleEntryExpand = (id) => {
    setExpandedEntries((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleInsightVisibility = (id, type) => {
    setVisibleInsights((prev) => ({
      ...prev,
      [id]: { ...prev[id], [type]: !prev[id]?.[type] },
    }));
  };

  const deleteInsightFromState = (id, type) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [type]: null } : e))
    );
    setVisibleInsights((prev) => {
      const updated = { ...prev };
      if (updated[id]) delete updated[id][type];
      return updated;
    });
  };

  console.log("MODAL STATE:", modal);

  return (
    <div className="p-6 max-w-4xl mx-auto dark:text-white">
      <h1 className="text-4xl font-extrabold mb-6 text-center">📝 I AM – Smart Journal</h1>

      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-6">
        <input
          type="text"
          placeholder="Title"
          className="w-full p-2 mb-2 border rounded"
          value={newEntry.title}
          onChange={(e) => setNewEntry({ ...newEntry, title: e.target.value })}
        />
        <textarea
          rows={6}
          placeholder="Write your truth..."
          className="w-full p-2 border rounded"
          value={newEntry.content}
          onChange={(e) => setNewEntry({ ...newEntry, content: e.target.value })}
        />
        <div className="flex justify-between items-center mt-2">
          <span className="text-sm text-gray-500">{newEntry.content.length} characters</span>
          <Button onClick={handleCreate}><Save className="mr-2" /> Save Entry</Button>
        </div>
      </div>

      <h2 className="text-2xl font-semibold mb-4">📚 Past Entries</h2>
      {entries.length === 0 ? (
        <p className="text-gray-400 italic text-center">You haven’t journaled yet... what’s on your mind?</p>
      ) : (
        <div className="space-y-4">
          {entries.map((entry) => (
            <div key={entry.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow relative group">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xl font-bold">{entry.title}</h3>
                <div className="flex gap-2">
                  <Button size="icon" onClick={() => toggleEntryExpand(entry.id)} variant="ghost">
                    {expandedEntries[entry.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                  </Button>
                  <Button
                    size="icon"
                    onClick={() => setModal({ open: true, entryId: entry.id, type: "entry" })}
                    variant="destructive"
                    >
                    <Trash size={16} />
                  </Button>
                </div>
              </div>

              <p className="text-sm text-gray-500 mb-2">{new Date(entry.created_at).toLocaleString()}</p>
              {expandedEntries[entry.id] && <p className="mb-2">{entry.content}</p>}

              <div className="flex items-center gap-2 mt-2">
                <select
                  className="p-2 border rounded"
                  value={selectedAction[entry.id] || ""}
                  onChange={(e) =>
                    setSelectedAction({ ...selectedAction, [entry.id]: e.target.value })
                  }
                >
                  <option value="">Choose an Insight</option>
                  <option value="reflect">Reflect</option>
                  <option value="mantra">Mantra Maker</option>
                  <option value="next_action">What should I do next?</option>
                </select>
                <Button
                  onClick={() => {
                    const action = selectedAction[entry.id];
                    if (action) handleInsight(entry, action);
                  }}
                >
                  <Wand2 className="mr-2" /> Go
                </Button>
              </div>

              {["reflection", "mantra", "next_action"].map((type) =>
                typeof entry[type] === "string" && entry[type].trim() !== "" ? (
                  <div key={type} className="mt-3">
                    {visibleInsights[entry.id]?.[type] ? (
                      <>
                        <div className="p-3 border-l-4 border-indigo-500 bg-indigo-100 dark:bg-indigo-900 text-indigo-900 dark:text-indigo-100 rounded relative">
                          <strong>{type.replace("_", " ").toUpperCase()}:</strong> {entry[type]}
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setModal({ open: true, entryId: entry.id, type })}
                            className="absolute -top-3 -right-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-full shadow"
                            title={`Delete ${type}`}
                          >
                            <X size={12} />
                          </Button>
                        </div>
                        <div className="text-right mt-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleInsightVisibility(entry.id, type)}
                          >
                            Hide {type.replace("_", " ")}
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleInsightVisibility(entry.id, type)}
                        >
                          Show {type.replace("_", " ")}
                        </Button>
                      </div>
                    )}
                  </div>
                ) : null
              )}
            </div>
          ))}
        </div>
      )}

      {modal.open && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-sm text-center">
      <p className="mb-4 text-lg">
        Are you sure you want to delete this{" "}
        {modal.type === "entry" ? "journal entry" : modal.type.replace("_", " ")}?
      </p>
      <div className="flex justify-center gap-4">
        <Button
          onClick={() => {
            if (modal.type === "entry") {
              confirmDeleteEntry(modal.entryId);
            } else {
              deleteInsightFromState(modal.entryId, modal.type);
            }
            setModal({ open: false, entryId: null, type: null });
          }}
        >
          Yes, Delete
        </Button>
        <Button
          variant="ghost"
          onClick={() => setModal({ open: false, entryId: null, type: null })}
        >
          Cancel
        </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartJournal;