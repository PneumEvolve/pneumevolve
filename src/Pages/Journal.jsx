// src/Pages/Journal.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import EntryForm from "@/components/journal/EntryForm";
import EntryList from "@/components/journal/EntryList";
import LoginPrompt from "@/components/journal/LoginPrompt";
import Modal from "@/components/journal/Modal";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
 
export default function Journal() {
  const { userEmail, userId, accessToken, userProfile } = useAuth();
 
  const [entries, setEntries] = useState([]);
  const [newEntry, setNewEntry] = useState({ title: "", content: "" });
  const [expandedEntries, setExpandedEntries] = useState({});
  const [editingEntry, setEditingEntry] = useState(null);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedContent, setEditedContent] = useState("");
  const [modal, setModal] = useState({ open: false, entryId: null, type: null });
  const [showLoginModal, setShowLoginModal] = useState(false);
  const navigate = useNavigate();
 
  const toggleEntryExpand = (id) =>
    setExpandedEntries((prev) => ({ ...prev, [id]: !prev[id] }));
 
  const fetchEntries = async () => {
    try {
      const res = await api.get("/journal", { validateStatus: () => true });
      if (res.status === 200) {
        const data = Array.isArray(res.data)
          ? res.data
          : res.data?.entries || res.data?.items || [];
        setEntries(data);
        return;
      }
      if (res.status === 401) { setShowLoginModal(true); return; }
      console.warn("Unexpected status from /journal:", res.status, res.data);
    } catch (err) {
      console.error("Failed to fetch journal entries:", err);
      setShowLoginModal(true);
    }
  };
 
  useEffect(() => { fetchEntries(); }, [userId, accessToken]);
 
  const handleCreate = async () => {
    if (!newEntry.title.trim() || !newEntry.content.trim()) return;
    try {
      const res = await api.post("/journal", newEntry);
      setEntries((prev) => [res.data, ...prev]);
      setNewEntry({ title: "", content: "" });
 
      // Keep the SEED reward — remove the AI insight call that used to follow it
      try {
        const r = await api.post(
          "/seed/reward/journal",
          {},
          { headers: { "x-user-email": userEmail } }
        );
        const message = r?.data?.claimed
          ? "You earned 5 SEED for today's journal."
          : "You already claimed today's journal reward.";
        if (window?.appToast?.success) window.appToast.success(message);
      } catch (e) {
        console.warn("SEED reward failed:", e?.response?.data || e.message);
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
 
  return (
    <div className="main space-y-6">
      <header className="text-center">
        <h1 className="text-3xl font-bold">
          📝 {userProfile?.username || "I AM"}'s Journal
        </h1>
        <p className="text-sm opacity-70 mt-1">Write freely.</p>
      </header>
 
      <EntryForm
        newEntry={newEntry}
        setNewEntry={setNewEntry}
        handleCreate={handleCreate}
      />
 
      <EntryList
        entries={entries}
        expandedEntries={expandedEntries}
        onExpandToggle={toggleEntryExpand}
        onDeleteClick={(id) => setModal({ open: true, entryId: id, type: "entry" })}
        onEditClick={(entry) => {
          setEditedTitle(entry.title);
          setEditedContent(entry.content);
          setModal({ open: true, entryId: entry.id, type: "edit" });
        }}
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
          deleteInsightFromState={() => {}} // no-op — insights removed
        />
      )}
 
      {showLoginModal && (
        <LoginPrompt navigate={navigate} setShowLoginModal={setShowLoginModal} />
      )}
    </div>
  );
}