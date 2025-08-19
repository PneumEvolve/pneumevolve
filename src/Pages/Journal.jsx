import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import EntryForm from "@/components/journal/EntryForm";
import EntryList from "@/components/journal/EntryList";
import LoginPrompt from "@/components/journal/LoginPrompt";
import Modal from "@/components/journal/Modal";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { requireSeed } from "@/lib/seed";

const INSIGHT_COST = {
  summary: 2,
  reflection: 3,
  next_action: 3, // maps to backend "next-action"
  title: 1,
  tags: 1,
};

export default function Journal() {
  const { userEmail, userId, accessToken, userProfile } = useAuth();

  const [insightBusy, setInsightBusy] = useState({});
  const [expandedEntries, setExpandedEntries] = useState({});
  const [visibleInsights, setVisibleInsights] = useState({});
  const [selectedActions, setSelectedActions] = useState({});
  const [entries, setEntries] = useState([]);
  const [newEntry, setNewEntry] = useState({ title: "", content: "" });
  const [editingEntry, setEditingEntry] = useState(null);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedContent, setEditedContent] = useState("");
  const [modal, setModal] = useState({ open: false, entryId: null, type: null });
  const [showLoginModal, setShowLoginModal] = useState(false);
  const navigate = useNavigate();

  const toggleEntryExpand = (id) => {
    setExpandedEntries((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleInsightVisibility = (id, type) => {
    setVisibleInsights((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), [type]: !prev[id]?.[type] },
    }));
  };

  const handleActionChange = (id, value) => {
    setSelectedActions((prev) => ({ ...prev, [id]: value }));
  };

  const fetchEntries = async () => {
  try {
    const res = await api.get("/journal", {
      // let us inspect non-200s instead of throwing
      validateStatus: () => true,
    });
    console.log("[/journal] status:", res.status, "data:", res.data);

    if (res.status === 200) {
      const data =
        Array.isArray(res.data)
          ? res.data
          : res.data?.entries || res.data?.items || [];
      setEntries(data);
      return;
    }
    if (res.status === 401) {
      setShowLoginModal(true);
      return;
    }
    console.warn("Unexpected status from /journal:", res.status, res.data);
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
      // 1) Save the entry
      const res = await api.post("/journal", newEntry);
      setEntries((prev) => [res.data, ...prev]);
      setNewEntry({ title: "", content: "" });

      // 2) Try to claim daily reward (+5 once per UTC day)
      try {
        const r = await api.post(
          "/seed/reward/journal",
          {},
          { headers: { "x-user-email": userEmail } }
        );

        const message = r?.data?.claimed
          ? "You earned 5 SEED for today’s journal. Nice work!"
          : "You already claimed today’s journal reward.";

        if (window?.appToast?.success) window.appToast.success(message);
        else alert(message);
      } catch (e) {
        const msg = e?.response?.data?.detail || e?.response?.data || e.message;
        if (window?.appToast?.error) window.appToast.error(`Reward failed: ${msg}`);
        else console.warn("Reward failed:", msg);
      }
    } catch (err) {
      console.error("Failed to create entry:", err);
    }
  };

  const handleEditSave = async (entryId) => {
    try {
      const res = await api.put(`/journal/${entryId}`, {
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
      await api.delete(`/journal/${id}`);
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      console.error("Failed to delete entry:", err);
    }
  };

  const deleteInsightFromState = async (id, type) => {
    try {
      await api.delete(`/journal/${id}/insight/${type}`);
      setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, [type]: null } : e)));
    } catch (err) {
      console.error("Failed to delete insight:", err);
      alert("Could not delete insight.");
    }
  };

  const handleInsight = async (entry, type) => {
    if (!type || entry[type]) return; // no selection or already has it
    const key = `${entry.id}:${type}`;
    if (insightBusy[key]) return;

    const backendType = type === "next_action" ? "next-action" : type;
    const cost = INSIGHT_COST[type] ?? 1;

    try {
      setInsightBusy((s) => ({ ...s, [key]: true }));

      // 1) SEED gate
      await requireSeed(userEmail, cost, `INSIGHT_${backendType.toUpperCase()}`);

      // 2) Kick off generation
      await api.post(`/journal/${backendType}/${entry.id}`);

      // 3) Poll for completion
      const pollForInsight = async (retries = 10) => {
        try {
          const res = await api.get("/journal");
          const updatedEntry = res.data.find((e) => e.id === entry.id);

          if (updatedEntry && updatedEntry[type]?.trim()) {
            setEntries((prev) => prev.map((e) => (e.id === entry.id ? updatedEntry : e)));

            setVisibleInsights((prev) => ({
              ...prev,
              [entry.id]: { ...(prev[entry.id] || {}), [type]: true },
            }));

            setSelectedActions((prev) => ({ ...prev, [entry.id]: "" }));

            setInsightBusy((s) => {
              const copy = { ...s };
              delete copy[key];
              return copy;
            });
            return;
          } else if (retries > 0) {
            setTimeout(() => pollForInsight(retries - 1), 2000);
          } else {
            alert("Insight is still not ready. Try refreshing.");
            setInsightBusy((s) => {
              const copy = { ...s };
              delete copy[key];
              return copy;
            });
          }
        } catch (err) {
          console.error("Polling failed:", err);
          setInsightBusy((s) => {
            const copy = { ...s };
            delete copy[key];
            return copy;
          });
        }
      };

      pollForInsight();
    } catch (err) {
      const msg = err?.response?.data?.detail || err.message || "Failed";
      if (msg === "Login required") {
        alert("Please log in to generate insights.");
      } else if (msg === "Insufficient SEED") {
        alert(`You need ${cost} SEED to generate this insight. Earn some first!`);
      } else {
        alert(`Failed to generate insight: ${msg}`);
      }
      setInsightBusy((s) => {
        const copy = { ...s };
        delete copy[key];
        return copy;
      });
    }
  };

  return (
    <div className="main space-y-6">
      <header className="text-center">
        <h1 className="text-3xl font-bold">
          📝 {userProfile?.username || "I AM"}’s Journal
        </h1>
        <p className="text-sm opacity-70 mt-1">
          Write freely. Generate insights with SEED.
        </p>
      </header>

      <EntryForm
        newEntry={newEntry}
        setNewEntry={setNewEntry}
        handleCreate={handleCreate}
      />

      <EntryList
        entries={entries}
        expandedEntries={expandedEntries}
        visibleInsights={visibleInsights}
        selectedActions={selectedActions}
        onExpandToggle={toggleEntryExpand}
        onDeleteClick={(id) => setModal({ open: true, entryId: id, type: "entry" })}
        onEditClick={(entry) => {
          setEditedTitle(entry.title);
          setEditedContent(entry.content);
          setModal({ open: true, entryId: entry.id, type: "edit" });
        }}
        onActionChange={handleActionChange}
        onGenerateInsight={(entry, type) => handleInsight(entry, type)}
        onToggleInsight={toggleInsightVisibility}
        onDeleteInsight={(id, type) => setModal({ open: true, entryId: id, type })}
        insightBusy={insightBusy}
      />

      {modal.open && (
        <Modal
          modal={modal}
          setModal={setModal}
          editedTitle={editedTitle}
          setEditedTitle={setEditedTitle}
          editedContent={editedContent}
          setEditedContent={setEditedContent}
          handleEditSave={handleEditSave}
          confirmDeleteEntry={confirmDeleteEntry}
          deleteInsightFromState={deleteInsightFromState}
        />
      )}

      {showLoginModal && (
        <LoginPrompt navigate={navigate} setShowLoginModal={setShowLoginModal} />
      )}
    </div>
  );
}