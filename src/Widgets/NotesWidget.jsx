import React, { useEffect, useMemo, useState } from "react";
import useLocalStorageState from "../utils/useLocalStorageState";

const DEFAULT_NOTES = [
  {
    id: "seed-1",
    title: "Quick note",
    text: "",
    updatedAt: Date.now(),
  },
];

function uuid() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function NotesWidget({
  storageKey = "pe_widget_notes_v1",
  title = "Notes",
}) {
  const [rawNotes, setRawNotes] = useLocalStorageState(storageKey, DEFAULT_NOTES);

  // Normalize + protect against old/corrupt LS shapes
  const notes = useMemo(() => {
    if (Array.isArray(rawNotes)) return rawNotes;
    return DEFAULT_NOTES;
  }, [rawNotes]);

  // If stored value isn't an array, auto-repair it once
  useEffect(() => {
    if (!Array.isArray(rawNotes)) {
      setRawNotes(DEFAULT_NOTES);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [activeId, setActiveId] = useState(notes?.[0]?.id ?? null);

  // Keep activeId valid if notes list changes
  useEffect(() => {
    if (!notes?.length) return;
    const exists = notes.some((n) => n.id === activeId);
    if (!exists) setActiveId(notes[0].id);
  }, [notes, activeId]);

  const active = useMemo(() => {
    if (!notes?.length) return null;
    return notes.find((n) => n.id === activeId) ?? notes[0];
  }, [notes, activeId]);

  const createNote = () => {
    const n = { id: uuid(), title: "New note", text: "", updatedAt: Date.now() };
    setRawNotes([n, ...notes]);
    setActiveId(n.id);
  };

  const updateActive = (patch) => {
    if (!active) return;
    setRawNotes(
      notes.map((n) =>
        n.id === active.id ? { ...n, ...patch, updatedAt: Date.now() } : n
      )
    );
  };

  const deleteActive = () => {
    if (!active) return;
    const next = notes.filter((n) => n.id !== active.id);
    const finalNotes = next.length ? next : DEFAULT_NOTES;
    setRawNotes(finalNotes);
    setActiveId(finalNotes[0]?.id ?? null);
  };

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)] p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">{title}</h3>
          <p className="text-xs text-[var(--muted)]">Local only. No pressure. Just capture.</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={createNote}
            className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-xs font-medium shadow-sm hover:shadow transition"
            type="button"
          >
            + New
          </button>
          <button
            onClick={deleteActive}
            className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-xs font-medium shadow-sm hover:shadow transition"
            type="button"
            disabled={!active}
            title="Delete note"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Note selector */}
      <div className="mt-4 flex flex-wrap gap-2">
        {notes.map((n) => (
          <button
            key={n.id}
            onClick={() => setActiveId(n.id)}
            className={`rounded-full border px-3 py-1 text-xs shadow-sm transition
              border-[var(--border)] bg-[var(--bg)]
              ${n.id === active?.id ? "opacity-100" : "opacity-80 hover:opacity-100"}`}
            type="button"
          >
            {n.title || "Untitled"}
          </button>
        ))}
      </div>

      {/* Editor */}
      {active ? (
        <div className="mt-4 space-y-3">
          <input
            value={active.title}
            onChange={(e) => updateActive({ title: e.target.value })}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]"
            placeholder="Title"
          />

          <textarea
            value={active.text}
            onChange={(e) => updateActive({ text: e.target.value })}
            rows={6}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]"
            placeholder="Write anything…"
          />

          <p className="text-xs text-[var(--muted)]">Saved automatically.</p>
        </div>
      ) : null}
    </section>
  );
}