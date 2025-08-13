import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import EntryForm from "@/components/journal/EntryForm";
import EntryList from "@/components/journal/EntryList";
import LoginPrompt from "@/components/journal/LoginPrompt";
import Modal from "@/components/journal/Modal";
import { useAuth } from "@/context/AuthContext";
import axiosInstance from "@/utils/axiosInstance";
import { requireSeed } from "@/lib/seed";

const INSIGHT_COST = {
  summary: 2,
  reflection: 3,
  next_action: 3,      // maps to backend "next-action"
  title: 1,
  tags: 1,
};

export default function Journal() {
  const { userEmail } = useAuth();
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
  const { userId, accessToken, userProfile } = useAuth();
  const navigate = useNavigate();

   const toggleEntryExpand = (id) => {
  setExpandedEntries((prev) => ({ ...prev, [id]: !prev[id] }));
};

const toggleInsightVisibility = (id, type) => {
  setVisibleInsights((prev) => ({
    ...prev,
    [id]: { ...prev[id], [type]: !prev[id]?.[type] },
  }));
};

const handleActionChange = (id, value) => {
  setSelectedActions((prev) => ({ ...prev, [id]: value }));
};

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
    // 1) Save the entry
    const res = await axiosInstance.post("/journal", newEntry);
    setEntries([res.data, ...entries]);
    setNewEntry({ title: "", content: "" });

    // 2) Claim daily reward (+5 once per UTC day) — independent of any other side effects
    try {
      const r = await axiosInstance.post(
        "/seed/reward/journal",
        {},
        { headers: { "x-user-email": userEmail } }
      );

      // Toast (shadcn) if available, else alert
      const message =
        r?.data?.claimed
          ? "You earned 5 SEED for today’s journal. Nice work!"
          : "You already claimed today’s journal reward.";

      if (window?.appToast) {
        window.appToast.success(message);   // if you wired a global toast (see note below)
      } else {
        // Try shadcn/use-toast if you have it:
        // import { useToast } from "@/components/ui/use-toast"
        // const { toast } = useToast();
        // toast({ title: "Journal", description: message });
        alert(message); // fallback
      }
    } catch (e) {
      const msg = e?.response?.data?.detail || e?.response?.data || e.message;
      if (window?.appToast) window.appToast.error(`Reward failed: ${msg}`);
      else console.warn("Reward failed:", msg);
    }

    // 3) (Optional) If you keep a balance/daily widget, refresh it here
    // await refreshDailyOrBalance();
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

  const deleteInsightFromState = async (id, type) => {
    try {
      await axiosInstance.delete(`/journal/${id}/insight/${type}`);
      setEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, [type]: null } : e))
      );
    } catch (err) {
      console.error("Failed to delete insight:", err);
      alert("Could not delete insight.");
    }
  };

  const handleInsight = async (entry, type) => {
  if (entry[type]) return; // already has it

  const key = `${entry.id}:${type}`;
  if (insightBusy[key]) return; // don’t double trigger

  const backendType = type === "next_action" ? "next-action" : type;
  const cost = INSIGHT_COST[type] ?? 1;

  try {
    setInsightBusy((s) => ({ ...s, [key]: true }));

    // 1) SEED gate
    await requireSeed(userEmail, cost, `INSIGHT_${backendType.toUpperCase()}`);

    // 2) Kick off generation
    await axiosInstance.post(`/journal/${backendType}/${entry.id}`);

    // 3) Poll for completion
    const pollForInsight = async (retries = 10) => {
      try {
        const res = await axiosInstance.get("/journal");
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
    // Common cases: login required, insufficient SEED, network
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
    <div className="p-6 max-w-4xl mx-auto dark:text-white">
      <h1 className="text-4xl font-extrabold dark:text-black mb-6 text-center">
        📝 {userProfile?.username || "I AM"}’s Journal
      </h1>

      <EntryForm
        newEntry={newEntry}
        setNewEntry={setNewEntry}
        handleCreate={handleCreate}
      />

      <EntryList
        entries={entries}
        setEntries={setEntries}
        setModal={setModal}
        editingEntry={editingEntry}
        setEditingEntry={setEditingEntry}
        editedTitle={editedTitle}
        setEditedTitle={setEditedTitle}
        editedContent={editedContent}
        setEditedContent={setEditedContent}

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
          onGenerateInsight={(entry) => handleInsight(entry, selectedActions[entry.id])}
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

      {showLoginModal && <LoginPrompt navigate={navigate} setShowLoginModal={setShowLoginModal} />}
    </div>
  );
}