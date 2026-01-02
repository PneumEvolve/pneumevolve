import React, { useMemo, useState } from "react";
import useLocalStorageState from "../utils/useLocalStorageState";

const MAX_ACTIVE = 3;

const DEFAULT_STATE = {
  queue: [], // holding area (stores full items)
  active: [], // up to 3 items [{ id, topic, link, nextAction, notes, createdAt, updatedAt }]

  keyNotes: [], // [{ id, topic, link, note, createdAt }]

  // UI
  activeId: null,
  keyNotesOpen: true,
  updatedAt: Date.now(),
};

function nowTs() {
  return Date.now();
}

function uuid() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isProbablyUrl(s) {
  const t = (s || "").trim();
  if (!t) return false;
  return /^https?:\/\//i.test(t) || t.startsWith("www.");
}

function normalizeUrl(s) {
  const t = (s || "").trim();
  if (!t) return "";
  if (t.startsWith("www.")) return `https://${t}`;
  return t;
}

function normalizeItem(x) {
  return {
    ...x,
    id: x?.id || uuid(),
    topic: typeof x.topic === "string" ? x.topic : "",
    link: typeof x.link === "string" ? x.link : "",
    nextAction: typeof x.nextAction === "string" ? x.nextAction : "",
    notes: typeof x.notes === "string" ? x.notes : "",
    createdAt: typeof x.createdAt === "number" ? x.createdAt : nowTs(),
    updatedAt: typeof x.updatedAt === "number" ? x.updatedAt : nowTs(),
  };
}

function safeState(raw) {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_STATE };

  // Back-compat: older versions used inbox/now/takeaways keys
  const legacyQueue = raw.inbox || raw.queue || [];
  const legacyActive = raw.now || raw.active || [];
  const legacyTakeaways = raw.takeaways || raw.keyNotes || [];

  const merged = { ...DEFAULT_STATE, ...raw };

  merged.queue = Array.isArray(merged.queue) ? merged.queue : legacyQueue;
  merged.active = Array.isArray(merged.active) ? merged.active : legacyActive;

  // Back-compat for key notes
  merged.keyNotes = Array.isArray(merged.keyNotes)
    ? merged.keyNotes
    : Array.isArray(legacyTakeaways)
    ? legacyTakeaways.map((t) => ({
        id: t.id || uuid(),
        topic: t.topic || "",
        link: t.link || "",
        note: t.note ?? t.takeaway ?? "",
        createdAt: t.createdAt || nowTs(),
      }))
    : [];

  if (typeof merged.keyNotesOpen !== "boolean") merged.keyNotesOpen = true;

  merged.queue = (Array.isArray(merged.queue) ? merged.queue : []).map(normalizeItem);
  merged.active = (Array.isArray(merged.active) ? merged.active : []).map(normalizeItem);

  if (merged.active.length > MAX_ACTIVE) merged.active = merged.active.slice(0, MAX_ACTIVE);

  if (merged.activeId && !merged.active.some((x) => x.id === merged.activeId)) {
    merged.activeId = null;
  }
  if (!merged.activeId && merged.active.length > 0) merged.activeId = merged.active[0].id;

  return merged;
}

export default function LearningStackWidget({
  storageKey = "pe_learning_stack_v4",
  title = "Learning Stack",
}) {
  const [raw, setRaw] = useLocalStorageState(storageKey, DEFAULT_STATE);
  const state = useMemo(() => safeState(raw), [raw]);

  const [draftTopic, setDraftTopic] = useState("");
  const [draftLink, setDraftLink] = useState("");

  // draft key note per ACTIVE item id only
  const [draftNoteById, setDraftNoteById] = useState({}); // { [id]: string }

  const update = (patch) => setRaw({ ...state, ...patch, updatedAt: nowTs() });

  const activeFull = state.active.length >= MAX_ACTIVE;

  const addToQueue = () => {
    const topic = draftTopic.trim();
    const link = normalizeUrl(draftLink);

    if (!topic) return;
    if (draftLink.trim() && !isProbablyUrl(draftLink)) return;

    const item = normalizeItem({
      id: uuid(),
      topic,
      link,
      nextAction: "",
      notes: "",
      createdAt: nowTs(),
      updatedAt: nowTs(),
    });

    update({ queue: [item, ...state.queue] });
    setDraftTopic("");
    setDraftLink("");
  };

  const deleteFromQueue = (id) => {
    update({ queue: state.queue.filter((x) => x.id !== id) });
  };

  const startFromQueue = (id) => {
    if (activeFull) return;
    const item = state.queue.find((x) => x.id === id);
    if (!item) return;

    const nextActive = [item, ...state.active].slice(0, MAX_ACTIVE);

    update({
      queue: state.queue.filter((x) => x.id !== id),
      active: nextActive,
      activeId: item.id,
    });
  };

  const updateActive = (id, patch) => {
    update({
      active: state.active.map((x) =>
        x.id === id ? normalizeItem({ ...x, ...patch, updatedAt: nowTs() }) : x
      ),
    });
  };

  const sendBackToQueue = (id) => {
    const item = state.active.find((x) => x.id === id);
    if (!item) return;

    const nextActive = state.active.filter((x) => x.id !== id);
    const nextFocus = state.activeId === id ? (nextActive[0]?.id ?? null) : state.activeId;

    // clear draft note when leaving active
    setDraftNoteById((d) => {
      const copy = { ...d };
      delete copy[id];
      return copy;
    });

    update({
      active: nextActive,
      queue: [normalizeItem({ ...item, updatedAt: nowTs() }), ...state.queue],
      activeId: nextFocus,
    });
  };

  const removeActive = (id) => {
    setDraftNoteById((d) => {
      const copy = { ...d };
      delete copy[id];
      return copy;
    });

    const nextActive = state.active.filter((x) => x.id !== id);
    const nextFocus = state.activeId === id ? (nextActive[0]?.id ?? null) : state.activeId;

    update({ active: nextActive, activeId: nextFocus });
  };

  const saveKeyNote = (id) => {
    const item = state.active.find((x) => x.id === id);
    if (!item) return;

    const note = (draftNoteById[id] || "").trim();
    if (!note) return;

    const entry = {
      id: uuid(),
      topic: item.topic,
      link: item.link,
      note,
      createdAt: nowTs(),
    };

    update({ keyNotes: [entry, ...state.keyNotes], keyNotesOpen: true });
    setDraftNoteById((d) => ({ ...d, [id]: "" }));
  };

  const deleteKeyNote = (id) => update({ keyNotes: state.keyNotes.filter((k) => k.id !== id) });
  const clearKeyNotes = () => update({ keyNotes: [] });
  const toggleKeyNotes = () => update({ keyNotesOpen: !state.keyNotesOpen });

  const activeId = state.activeId;

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)] p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">{title}</h3>
          <p className="text-xs text-[var(--muted)]">
            Keep up to {MAX_ACTIVE} active. Send items back to the Queue when you’re not working on them.
          </p>
        </div>
      </div>

      {/* ACTIVE */}
      <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">
            Active{" "}
            <span className="text-xs font-normal text-[var(--muted)]">
              ({state.active.length}/{MAX_ACTIVE})
            </span>
          </div>
          <div className="text-xs text-[var(--muted)]">Click a card header to focus it.</div>
        </div>

        {state.active.length === 0 ? (
          <p className="mt-2 text-xs text-[var(--muted)]">
            No active items yet. Start one from the Queue.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {state.active.map((x) => {
              const isActive = x.id === activeId;
              const noteDraft = draftNoteById[x.id] || "";

              return (
                <div
                  key={x.id}
                  className={`rounded-xl border border-[var(--border)] ${
                    isActive ? "bg-[var(--bg-elev)]" : "bg-[var(--bg)]"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => update({ activeId: x.id })}
                    className="w-full text-left px-3 py-3 flex items-start justify-between gap-3"
                    title="Focus this item"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold break-words">
                        {x.topic || "(untitled)"}
                      </div>
                      {x.nextAction ? (
                        <div className="mt-1 text-xs text-[var(--muted)] break-words">
                          Next: {x.nextAction}
                        </div>
                      ) : (
                        <div className="mt-1 text-xs text-[var(--muted)] opacity-70">
                          Next: (not set)
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 text-xs text-[var(--muted)]">
                      {isActive ? "▾" : "▸"}
                    </div>
                  </button>

                  {isActive && (
                    <div className="px-3 pb-3 border-t border-[var(--border)]">
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <div className="text-xs text-[var(--muted)]">Topic</div>
                          <input
                            value={x.topic}
                            onChange={(e) => updateActive(x.id, { topic: e.target.value })}
                            className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                          />
                        </div>

                        <div>
                          <div className="text-xs text-[var(--muted)]">Link (optional)</div>
                          <input
                            value={x.link || ""}
                            onChange={(e) =>
                              updateActive(x.id, { link: normalizeUrl(e.target.value) })
                            }
                            className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                            placeholder="https://..."
                          />
                          {x.link && isProbablyUrl(x.link) ? (
                            <a
                              href={x.link}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-2 block text-[11px] text-[var(--muted)] hover:underline break-words"
                            >
                              Open link
                            </a>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-3">
                        <div className="text-xs text-[var(--muted)]">Next action</div>
                        <textarea
                          value={x.nextAction}
                          onChange={(e) => updateActive(x.id, { nextAction: e.target.value })}
                          rows={2}
                          className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                          placeholder='Example: "10 minutes: read + write 1 key note."'
                        />
                      </div>

                      <div className="mt-3">
                        <div className="text-xs text-[var(--muted)]">Notes</div>
                        <textarea
                          value={x.notes}
                          onChange={(e) => updateActive(x.id, { notes: e.target.value })}
                          rows={6}
                          className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                          placeholder="Roomy scratchpad. Optional."
                        />
                      </div>

                      <div className="mt-3">
                        <div className="text-xs text-[var(--muted)]">Key note</div>
                        <textarea
                          value={noteDraft}
                          onChange={(e) =>
                            setDraftNoteById((d) => ({ ...d, [x.id]: e.target.value }))
                          }
                          rows={3}
                          className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
                          placeholder="One sentence you want to keep."
                        />
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          onClick={() => saveKeyNote(x.id)}
                          className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2 text-xs font-medium shadow-sm hover:shadow transition disabled:opacity-60"
                          type="button"
                          disabled={!noteDraft.trim()}
                        >
                          Save key note
                        </button>

                        <button
                          onClick={() => sendBackToQueue(x.id)}
                          className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2 text-xs font-medium shadow-sm hover:shadow transition"
                          type="button"
                          title="Send back to Queue (keeps Next action + Notes)"
                        >
                          Send to Queue
                        </button>

                        <button
                          onClick={() => removeActive(x.id)}
                          className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2 text-xs font-medium shadow-sm hover:shadow transition"
                          type="button"
                          title="Remove from Active"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* QUEUE */}
      <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">
            Queue{" "}
            <span className="text-xs font-normal text-[var(--muted)]">
              ({state.queue.length})
            </span>
          </div>
          <div className="text-xs text-[var(--muted)]">
            {activeFull ? `Active full (max ${MAX_ACTIVE}).` : "Start one when ready."}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input
            value={draftTopic}
            onChange={(e) => setDraftTopic(e.target.value)}
            className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
            placeholder="Learning topic…"
          />
          <input
            value={draftLink}
            onChange={(e) => setDraftLink(e.target.value)}
            className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
            placeholder="Link (optional)"
          />
          <button
            onClick={addToQueue}
            className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2 text-xs font-medium shadow-sm hover:shadow transition disabled:opacity-60"
            type="button"
            disabled={!draftTopic.trim() || (draftLink.trim() && !isProbablyUrl(draftLink))}
          >
            Add to Queue
          </button>
        </div>

        {state.queue.length === 0 ? (
          <p className="mt-3 text-xs text-[var(--muted)]">Queue is empty.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {state.queue.slice(0, 12).map((x) => (
              <li
                key={x.id}
                className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold break-words">{x.topic}</div>
                    {x.nextAction ? (
                      <div className="mt-1 text-xs text-[var(--muted)] break-words">
                        Next: {x.nextAction}
                      </div>
                    ) : null}
                    {x.link ? (
                      <div className="mt-1 text-[11px] text-[var(--muted)] break-words">
                        {x.link}
                      </div>
                    ) : null}
                  </div>

                  <div className="shrink-0 flex gap-2">
                    <button
                      onClick={() => startFromQueue(x.id)}
                      className="text-xs text-[var(--muted)] hover:text-[var(--text)] transition disabled:opacity-60"
                      type="button"
                      disabled={activeFull}
                      title={activeFull ? `Active full (max ${MAX_ACTIVE}).` : "Move to Active"}
                    >
                      Start
                    </button>
                    <button
                      onClick={() => deleteFromQueue(x.id)}
                      className="text-xs text-[var(--muted)] hover:text-[var(--text)] transition"
                      type="button"
                      title="Remove"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* KEY NOTES */}
      <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--bg)]">
        <button
          onClick={toggleKeyNotes}
          type="button"
          className="w-full flex items-center justify-between gap-3 px-3 py-3"
          aria-expanded={state.keyNotesOpen}
        >
          <div className="text-sm font-semibold">
            Key Notes{" "}
            <span className="text-xs font-normal text-[var(--muted)]">
              ({state.keyNotes.length})
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearKeyNotes();
              }}
              className="text-xs text-[var(--muted)] hover:text-[var(--text)] transition disabled:opacity-60"
              type="button"
              disabled={state.keyNotes.length === 0}
              title="Clear all key notes"
            >
              Clear
            </button>

            <span className="text-xs text-[var(--muted)]">
              {state.keyNotesOpen ? "▾" : "▸"}
            </span>
          </div>
        </button>

        {state.keyNotesOpen && (
          <div className="px-3 pb-3">
            {state.keyNotes.length === 0 ? (
              <p className="text-xs text-[var(--muted)]">No key notes yet.</p>
            ) : (
              <ul className="space-y-2">
                {state.keyNotes.slice(0, 12).map((k) => (
                  <li
                    key={k.id}
                    className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs text-[var(--muted)]">
                          {new Date(k.createdAt).toLocaleString()}
                        </div>
                        <div className="mt-1 text-sm font-semibold break-words">{k.topic}</div>
                        <div className="mt-1 text-xs text-[var(--muted)] break-words">{k.note}</div>
                        {k.link ? (
                          <a
                            href={k.link}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 block text-[11px] text-[var(--muted)] hover:underline break-words"
                          >
                            Open link
                          </a>
                        ) : null}
                      </div>

                      <button
                        onClick={() => deleteKeyNote(k.id)}
                        className="shrink-0 text-xs text-[var(--muted)] hover:text-[var(--text)] transition"
                        type="button"
                        title="Delete"
                      >
                        ✕
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </section>
  );
}