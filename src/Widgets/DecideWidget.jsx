import React, { useMemo, useState } from "react";
import useLocalStorageState from "../utils/useLocalStorageState";

function safeUUID() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function daysUntil(dateISO) {
  if (!dateISO) return null;
  const target = new Date(dateISO);
  if (Number.isNaN(target.getTime())) return null;

  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(target);
  end.setHours(0, 0, 0, 0);

  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((end - start) / msPerDay);
}

function EditableTitle({ value, onChange }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-transparent text-sm font-semibold text-[var(--text)] border-b border-dashed border-[var(--border)] focus:outline-none focus:border-solid"
    />
  );
}

export default function DecideWidget({ storageKey = "pe_decide_v2" }) {
  const [data, setData] = useLocalStorageState(storageKey, () => ({
    widgetTitle: "Decide",
    lists: [
      {
        id: safeUUID(),
        title: "A decision",
        decideBy: "", // ISO date string optional
        leftTitle: "Pros",
        rightTitle: "Cons",
        leftItems: [],
        rightItems: [],
        createdAt: Date.now(),
      },
    ],
  }));

  const [newListTitle, setNewListTitle] = useState("");

  const listsSorted = useMemo(() => {
    const lists = data.lists || [];
    // Sort by: has date + soonest first, then newest
    return [...lists].sort((a, b) => {
      const ad = daysUntil(a.decideBy);
      const bd = daysUntil(b.decideBy);

      const aHas = ad !== null;
      const bHas = bd !== null;

      if (aHas && bHas) return ad - bd;
      if (aHas && !bHas) return -1;
      if (!aHas && bHas) return 1;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
  }, [data.lists]);

  const setWidgetTitle = (v) => setData((prev) => ({ ...prev, widgetTitle: v }));

  const addList = () => {
    const t = newListTitle.trim() || "A decision";
    const list = {
      id: safeUUID(),
      title: t,
      decideBy: "",
      leftTitle: "Pros",
      rightTitle: "Cons",
      leftItems: [],
      rightItems: [],
      createdAt: Date.now(),
    };
    setData((prev) => ({ ...prev, lists: [list, ...(prev.lists || [])] }));
    setNewListTitle("");
  };

  const deleteList = (id) => {
    setData((prev) => ({ ...prev, lists: (prev.lists || []).filter((l) => l.id !== id) }));
  };

  const patchList = (id, patch) => {
    setData((prev) => ({
      ...prev,
      lists: (prev.lists || []).map((l) => (l.id === id ? { ...l, ...patch } : l)),
    }));
  };

  const addItem = (id, side, text) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setData((prev) => ({
      ...prev,
      lists: (prev.lists || []).map((l) => {
        if (l.id !== id) return l;
        const item = { id: safeUUID(), text: trimmed };
        if (side === "left") return { ...l, leftItems: [item, ...(l.leftItems || [])] };
        return { ...l, rightItems: [item, ...(l.rightItems || [])] };
      }),
    }));
  };

  const deleteItem = (listId, side, itemId) => {
    setData((prev) => ({
      ...prev,
      lists: (prev.lists || []).map((l) => {
        if (l.id !== listId) return l;
        if (side === "left")
          return { ...l, leftItems: (l.leftItems || []).filter((x) => x.id !== itemId) };
        return { ...l, rightItems: (l.rightItems || []).filter((x) => x.id !== itemId) };
      }),
    }));
  };

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)] p-5 shadow-sm">
      <input
        value={data.widgetTitle || "Decide"}
        onChange={(e) => setWidgetTitle(e.target.value)}
        className="w-full bg-transparent text-base font-semibold text-[var(--text)] border-b border-dashed border-[var(--border)] focus:outline-none focus:border-solid"
      />

      <div className="mt-3 flex flex-col sm:flex-row gap-2">
        <input
          value={newListTitle}
          onChange={(e) => setNewListTitle(e.target.value)}
          className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)]"
          placeholder="New list title… (e.g., Work decision)"
        />
        <button
          onClick={addList}
          className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2 text-xs font-medium shadow-sm hover:shadow transition"
          type="button"
        >
          Add list
        </button>
      </div>

      <div className="mt-4 space-y-4">
        {listsSorted.map((l) => {
          const d = daysUntil(l.decideBy);
          const urgency =
            d === null ? null : d < 0 ? "Past due" : d === 0 ? "Due today" : `${d} days`;

          return (
            <div
              key={l.id}
              className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-4"
            >
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                <div className="flex-1">
                  <EditableTitle
                    value={l.title}
                    onChange={(v) => patchList(l.id, { title: v })}
                  />

                  <div className="mt-3 flex flex-col sm:flex-row gap-2 sm:items-center">
                    <label className="text-xs text-[var(--muted)]">Decide by (optional)</label>
                    <input
                      type="date"
                      value={l.decideBy || ""}
                      onChange={(e) => patchList(l.id, { decideBy: e.target.value })}
                      className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] px-3 py-2 text-xs text-[var(--text)]"
                    />
                    {urgency ? (
                      <span className="inline-flex w-fit rounded-full border border-[var(--border)] bg-[var(--bg-elev)] px-3 py-1 text-[10px] text-[var(--muted)]">
                        {urgency}
                      </span>
                    ) : (
                      <span className="text-[10px] text-[var(--muted)]">No deadline</span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => deleteList(l.id)}
                  className="text-xs text-[var(--muted)] hover:text-[var(--text)]"
                  type="button"
                >
                  Delete
                </button>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <Side
                  title={l.leftTitle}
                  setTitle={(v) => patchList(l.id, { leftTitle: v })}
                  items={l.leftItems || []}
                  onAdd={(text) => addItem(l.id, "left", text)}
                  onDelete={(itemId) => deleteItem(l.id, "left", itemId)}
                />
                <Side
                  title={l.rightTitle}
                  setTitle={(v) => patchList(l.id, { rightTitle: v })}
                  items={l.rightItems || []}
                  onAdd={(text) => addItem(l.id, "right", text)}
                  onDelete={(itemId) => deleteItem(l.id, "right", itemId)}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Side({ title, setTitle, items, onAdd, onDelete }) {
  const [draft, setDraft] = useState("");

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)] p-3">
      <EditableTitle value={title} onChange={setTitle} />

      <div className="mt-3 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onAdd(draft);
              setDraft("");
            }
          }}
          className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-xs text-[var(--text)]"
          placeholder="Add item…"
        />
        <button
          onClick={() => {
            onAdd(draft);
            setDraft("");
          }}
          className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-xs font-medium shadow-sm hover:shadow transition"
          type="button"
        >
          Add
        </button>
      </div>

      <ul className="mt-3 space-y-2">
        {items.length === 0 ? (
          <li className="text-[10px] text-[var(--muted)]">Empty is allowed.</li>
        ) : (
          items.map((it) => (
            <li
              key={it.id}
              className="flex items-start justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2"
            >
              <span className="text-xs text-[var(--text)]">{it.text}</span>
              <button
                onClick={() => onDelete(it.id)}
                className="text-[10px] text-[var(--muted)] hover:text-[var(--text)]"
                type="button"
                aria-label="Delete item"
              >
                ✕
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}