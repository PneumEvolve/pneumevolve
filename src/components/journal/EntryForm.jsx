import React from "react";
import { Save } from "lucide-react";

export default function EntryForm({ newEntry, setNewEntry, handleCreate }) {
  const chars = newEntry.content?.length || 0;

  return (
    <div className="card space-y-3">
      <input
        type="text"
        placeholder="Title"
        value={newEntry.title}
        onChange={(e) => setNewEntry({ ...newEntry, title: e.target.value })}
      />
      <textarea
        rows={6}
        placeholder="Write your truth…"
        value={newEntry.content}
        onChange={(e) => setNewEntry({ ...newEntry, content: e.target.value })}
      />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <span className="text-sm opacity-70">{chars} characters</span>
        <button className="btn" onClick={handleCreate}>
          <span className="inline-flex items-center gap-2">
            <Save size={16} /> Save Entry
          </span>
        </button>
      </div>
    </div>
  );
}