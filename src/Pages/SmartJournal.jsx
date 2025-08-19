import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Save, Trash, Wand2, Eye, EyeOff, X } from "lucide-react";
import axiosInstance from "../utils/axiosInstance";
import { useAuth } from "@/context/AuthContext"; // ✅ You already use this elsewhere
import { api } from "@/lib/api";




const SmartJournal = () => {
  const [entries, setEntries] = useState([]);
  const [newEntry, setNewEntry] = useState({ title: "", content: "" });
  const [expandedEntries, setExpandedEntries] = useState({});
  const [visibleInsights, setVisibleInsights] = useState({});
  const [selectedAction, setSelectedAction] = useState({});
  const [modal, setModal] = useState({ open: false, entryId: null, type: null });
  const [showLoginModal, setShowLoginModal] = useState(false);
  const { userId, accessToken, userProfile } = useAuth();
  
  const navigate = useNavigate();
  const [editingEntry, setEditingEntry] = useState(null);
  const [editedContent, setEditedContent] = useState("");
  const [editedTitle, setEditedTitle] = useState("");

  const fetchEntries = async () => {
  try {
    const res = await axiosInstance.get("/journal");
    setEntries(res.data);
  } catch (err) {
    console.error("Failed to fetch journal entries:", err);
    setShowLoginModal(true);
  }
};

  useEffect(() => {
  fetchEntries();
}, [userId, accessToken]);

  

  const handleCreate = async () => {
  if (!newEntry.title.trim() || !newEntry.content.trim()) return;

  try {
    const res = await axiosInstance.post("/journal", newEntry);
    setEntries([res.data, ...entries]);
    setNewEntry({ title: "", content: "" });
  } catch (err) {
    console.error("Failed to create entry:", err);
  }
};

  const handleEditSave = async (entryId) => {
  try {
    const res = await axiosInstance.put(`/journal/${entryId}`, {
      title: editedTitle,
      content: editedContent,
    });
    setEntries((prev) => prev.map((e) => (e.id === entryId ? res.data : e)));
    setEditingEntry(null);
  } catch (err) {
    alert("Failed to update journal entry.");
    console.error(err);
  }
};


  const confirmDeleteEntry = async (id) => {
  try {
    await axiosInstance.delete(`/journal/${id}`);
    setEntries(entries.filter((e) => e.id !== id));
  } catch (err) {
    console.error("Failed to delete entry:", err);
  }
};

  const handleInsight = async (entry, type) => {
  if (entry[type]) return;

  const backendType = type === "next_action" ? "next-action" : type;

  try {
    // Step 1: Trigger insight generation
    await axiosInstance.post(`/journal/${backendType}/${entry.id}`);

    // Step 2: Poll full journal list for updated insight
    const pollForInsight = async (retries = 10) => {
      try {
        const res = await axiosInstance.get("/journal");
        const updatedEntry = res.data.find((e) => e.id === entry.id);

        if (updatedEntry && updatedEntry[type]?.trim()) {
          setEntries((prev) =>
            prev.map((e) => (e.id === entry.id ? updatedEntry : e))
          );

          setVisibleInsights((prev) => ({
            ...prev,
            [entry.id]: { ...prev[entry.id], [type]: true },
          }));

          setSelectedAction((prev) => ({
            ...prev,
            [entry.id]: "",
          }));
        } else if (retries > 0) {
          setTimeout(() => pollForInsight(retries - 1), 2000);
        } else {
          alert("Insight is still not ready. Try refreshing.");
        }
      } catch (err) {
        console.error("Polling failed:", err);
      }
    };

    pollForInsight();
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

  const deleteInsightFromState = async (id, type) => {
  try {
    await axiosInstance.delete(`/journal/${id}/insight/${type}`);
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [type]: null } : e))
    );
    setVisibleInsights((prev) => {
      const updated = { ...prev };
      if (updated[id]) delete updated[id][type];
      return updated;
    });
  } catch (err) {
    console.error("Failed to delete insight:", err);
    alert("Could not delete insight.");
  }
};


  return (
    <div className="p-6 max-w-4xl mx-auto dark:text-white">
      <h1 className="text-4xl font-extrabold dark:text-black mb-6 text-center">
  📝 {userProfile?.username || "I AM"}’s Smart Journal
</h1>

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
          <Button variant="green" onClick={handleCreate}><Save className="mr-2" /> Save Entry</Button>
        </div>
      </div>

      <h2 className="text-2xl dark:text-black font-semibold mb-4">📚 Past Entries</h2>
      {entries.length === 0 ? (
        <p className="text-gray-400 italic text-center">You haven’t journaled yet... what’s on your mind?</p>
      ) : (
        <div className="space-y-4">
          {entries.map((entry) => (
  <div
    key={entry.id + (entry.reflection || "") + (entry.mantra || "") + (entry.next_action || "")}
    className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow relative group"
  >
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xl font-bold">{entry.title}</h3>
                <div className="flex gap-2">
                  <Button variant="blue" size="icon" onClick={() => toggleEntryExpand(entry.id)} >
                    {expandedEntries[entry.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                  </Button>
                  <Button
                    size="icon"
                    className="bg-red-600 hover:bg-red-700 text-white"
                    onClick={() => setModal({ open: true, entryId: entry.id, type: "entry" })}
                    variant="destructive"
                    >
                    <Trash size={16} />
                  </Button>
                </div>
              </div>

              <p className="text-sm text-gray-500 mb-2">{new Date(entry.created_at).toLocaleString()}</p>
              {editingEntry === entry.id ? (
  <>
    <input
      className="w-full mb-2 p-2 border rounded"
      value={editedTitle}
      onChange={(e) => setEditedTitle(e.target.value)}
    />
    <textarea
      className="w-full mb-2 p-2 border rounded"
      value={editedContent}
      onChange={(e) => setEditedContent(e.target.value)}
    />
    <div className="flex gap-2">
      <Button onClick={() => handleEditSave(entry.id)}>Save</Button>
      <Button variant="ghost" onClick={() => setEditingEntry(null)}>Cancel</Button>
    </div>
  </>
) : (
  <>
    {expandedEntries[entry.id] && <p className="mb-2">{entry.content}</p>}
    <div className="flex gap-2 mt-2">
      <Button
  size="sm"
  variant="yellow"
  onClick={() => {
    setModal({ open: true, entryId: entry.id, type: "edit" });
    setEditedTitle(entry.title);
    setEditedContent(entry.content);
  }}
>
  Edit
</Button>
    </div>
  </>
)}

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
                className="bg-green-600 hover:bg-green-700 text-white"
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
                            variant="blue"
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
                          variant="blue"
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
  <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
    {modal.type === "edit" ? (
      <div className="bg-white dark:bg-gray-800 w-full max-w-3xl p-6 rounded-lg shadow-lg overflow-y-auto max-h-[90vh]">
        <h2 className="text-2xl font-bold mb-4">Edit Journal Entry</h2>
        <input
          className="w-full mb-3 p-2 border rounded"
          value={editedTitle}
          onChange={(e) => setEditedTitle(e.target.value)}
        />
        <textarea
          className="w-full h-64 mb-4 p-2 border rounded"
          value={editedContent}
          onChange={(e) => setEditedContent(e.target.value)}
        />
        <div className="flex justify-between">
          <Button
            onClick={async () => {
              await handleEditSave(modal.entryId);
              setModal({ open: false, entryId: null, type: null });
            }}
          >
            Save Changes
          </Button>
          <Button
            variant="ghost"
            onClick={() => setModal({ open: false, entryId: null, type: null })}
          >
            Cancel
          </Button>
        </div>
      </div>
    ) : (
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
    )}
  </div>
)}
{showLoginModal && (
  <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-sm text-center">
      <h2 className="text-xl font-bold mb-2">Login Required</h2>
      <p className="mb-4">Please log in to use the Smart Journal features.</p>
      <div className="flex justify-center gap-4">
        <Button onClick={() => navigate("/login")}>Go to Login</Button>
        <Button variant="ghost" onClick={() => setShowLoginModal(false)}>Continue Browsing</Button>
      </div>
    </div>
  </div>
)}
    </div>
  );
};

export default SmartJournal;