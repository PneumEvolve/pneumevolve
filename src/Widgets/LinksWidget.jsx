import React, { useEffect, useMemo, useState } from "react";
import useLocalStorageState from "../utils/useLocalStorageState";

const DEFAULT_LINKS = [
  {
    id: "seed-1",
    label: "PneumEvolve",
    url: "/",
    note: "Home",
    updatedAt: Date.now(),
  },
];

function uuid() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isProbablyUrl(s) {
  return /^https?:\/\//i.test(s) || s.startsWith("/") || s.startsWith("www.");
}

function normalizeUrl(s) {
  const t = (s ?? "").trim();
  if (!t) return "";
  if (t.startsWith("www.")) return `https://${t}`;
  return t;
}

function coerceLinks(value) {
  // Accept array only. Otherwise repair to default.
  if (Array.isArray(value)) return value.filter(Boolean);

  // If value is a string that looks like JSON array, try parse it (some hooks store raw strings)
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch {
      // ignore
    }
  }

  // Anything else -> repair
  return DEFAULT_LINKS;
}

export default function LinksWidget({
  storageKey = "pe_widget_links_v1",
  title = "Links",
}) {
  const [linksRaw, setLinksRaw] = useLocalStorageState(storageKey, DEFAULT_LINKS);

  // Always work with a safe array in render + logic
  const links = useMemo(() => coerceLinks(linksRaw), [linksRaw]);

  const [draftLabel, setDraftLabel] = useState("");
  const [draftUrl, setDraftUrl] = useState("");
  const [draftNote, setDraftNote] = useState("");

  // Self-heal: if localStorage contains a non-array, overwrite it once with a repaired array
  useEffect(() => {
    if (!Array.isArray(linksRaw)) {
      setLinksRaw(links);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]); // run on mount / key change

  const sorted = useMemo(() => {
    return [...links].sort((a, b) => (b?.updatedAt ?? 0) - (a?.updatedAt ?? 0));
  }, [links]);

  const addLink = () => {
    const label = draftLabel.trim();
    const urlRaw = draftUrl.trim();
    const url = normalizeUrl(urlRaw);
    const note = draftNote.trim();

    if (!label) return;
    if (!url || !isProbablyUrl(url)) return;

    const item = { id: uuid(), label, url, note, updatedAt: Date.now() };
    setLinksRaw([item, ...links]);

    setDraftLabel("");
    setDraftUrl("");
    setDraftNote("");
  };

  const removeLink = (id) => {
    setLinksRaw(links.filter((l) => l?.id !== id));
  };

  const updateLink = (id, patch) => {
    setLinksRaw(
      links.map((l) =>
        l?.id === id ? { ...l, ...patch, updatedAt: Date.now() } : l
      )
    );
  };

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)] p-5 shadow-sm">
      <div>
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="text-xs text-[var(--muted)]">Pin your doorways. Local only.</p>
      </div>

      {/* Add row */}
      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <input
          value={draftLabel}
          onChange={(e) => setDraftLabel(e.target.value)}
          className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
          placeholder="Label (e.g., FarmGame)"
        />
        <input
          value={draftUrl}
          onChange={(e) => setDraftUrl(e.target.value)}
          className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
          placeholder="URL (/garden or https://...)"
        />
        <input
          value={draftNote}
          onChange={(e) => setDraftNote(e.target.value)}
          className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
          placeholder="Optional note"
        />
      </div>

      <div className="mt-3 flex gap-2">
        <button
          onClick={addLink}
          className="rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2 text-xs font-medium shadow-sm transition hover:shadow"
          type="button"
        >
          Add link
        </button>

        <p className="self-center text-xs text-[var(--muted)]">
          Tip: you can use internal routes like{" "}
          <span className="font-mono">/garden</span>.
        </p>
      </div>

      {/* List */}
      <ul className="mt-4 space-y-2">
        {sorted.length === 0 ? (
          <li className="text-xs text-[var(--muted)]">No links yet.</li>
        ) : (
          sorted.map((l) => (
            <li
              key={l.id}
              className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <a
                    href={l.url}
                    className="break-words text-sm font-semibold text-[var(--text)] hover:underline"
                    target={l.url.startsWith("http") ? "_blank" : undefined}
                    rel={l.url.startsWith("http") ? "noreferrer" : undefined}
                  >
                    {l.label}
                  </a>

                  {l.note ? (
                    <p className="mt-1 break-words text-xs text-[var(--muted)]">
                      {l.note}
                    </p>
                  ) : null}

                  <p className="mt-1 break-words text-[11px] text-[var(--muted)]">
                    {l.url}
                  </p>
                </div>

                <div className="shrink-0 flex gap-2">
                  <button
                    onClick={() => updateLink(l.id, { note: l.note ? "" : "Pinned" })}
                    className="text-xs text-[var(--muted)] hover:text-[var(--text)]"
                    type="button"
                    title="Quick toggle note"
                  >
                    ✎
                  </button>

                  <button
                    onClick={() => removeLink(l.id)}
                    className="text-xs text-[var(--muted)] hover:text-[var(--text)]"
                    type="button"
                    title="Remove"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}