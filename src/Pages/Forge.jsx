// src/pages/Forge2.jsx
import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { v4 as uuidv4 } from "uuid";
import { Link } from "react-router-dom";

// --- Server enums (mirror backend)
const KIND = { PROBLEM: "problem", IDEA: "idea" };
const STATUS = { OPEN: "open", IN_PROGRESS: "in_progress", DONE: "done", ARCHIVED: "archived" };

// --- UI helpers
const norm = (s) => String(s || "").trim().toLowerCase();
const statusLabel = (s) => {
  const x = norm(s);
  if (x === STATUS.OPEN) return "Open";
  if (x === STATUS.IN_PROGRESS) return "In Progress";
  if (x === STATUS.DONE) return "Done";
  if (x === STATUS.ARCHIVED) return "Archived";
  return s || "Open";
};
const statusBadgeClass = (s) => {
  const x = norm(s);
  if (x === STATUS.OPEN) return "badge";
  if (x === STATUS.IN_PROGRESS)
    return "badge bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300";
  if (x === STATUS.DONE)
    return "badge bg-emerald-600/10 border-emerald-600/30 text-emerald-700 dark:text-emerald-300";
  if (x === STATUS.ARCHIVED)
    return "badge bg-zinc-600/10 border-zinc-600/30 text-zinc-700 dark:text-zinc-300";
  return "badge";
};

// --- localStorage helpers
const votesKey = (identity) => `forge:votes:${identity}`;
const draftKey = (identity) => `forge:draft:${identity}`;
const filtersKey = "forge:filters";
const loadSet = (k) => {
  try {
    const raw = localStorage.getItem(k);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
};
const saveSet = (k, set) => {
  try {
    localStorage.setItem(k, JSON.stringify(Array.from(set)));
  } catch {}
};

// --- Filters (simple)
const DEFAULT_FILTERS = {
  sort: "new",          // new | top
  kind: "all",          // all|problem|idea
  status: "any",        // any|open|in_progress|done|archived
  domain: "",
  scope: "",
  location: "",
  tags: [],
  severityMin: 1,       // 1..5 (1 = no-op)
};

export default function Forge2() {
  const { userEmail, accessToken } = useAuth();

  // identity (allow anon actions for vote)
  const [anonId] = useState(() => {
    let id = localStorage.getItem("anon_id");
    if (!id) {
      id = uuidv4();
      localStorage.setItem("anon_id", id);
    }
    return id;
  });
  const identityEmail = userEmail || `anon:${anonId}`;

  // feed state
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // search + modal
  const [qLive, setQLive] = useState("");
  const [query, setQuery] = useState("");
  const [showFilter, setShowFilter] = useState(false);

  // composer collapsed by default
  const [showComposer, setShowComposer] = useState(false);

  // optimistic votes
  const [myVotes, setMyVotes] = useState(() => loadSet(votesKey(identityEmail)));
  useEffect(() => {
    setMyVotes(loadSet(votesKey(identityEmail)));
  }, [identityEmail]);

  // filters
  const [filters, setFilters] = useState(() => {
    try {
      const raw = localStorage.getItem(filtersKey);
      return raw ? { ...DEFAULT_FILTERS, ...JSON.parse(raw) } : DEFAULT_FILTERS;
    } catch {
      return DEFAULT_FILTERS;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(filtersKey, JSON.stringify(filters));
    } catch {}
  }, [filters]);

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => setQuery(qLive.trim()), 200);
    return () => clearTimeout(t);
  }, [qLive]);

  const headersFor = () => {
    const h = { "x-user-email": identityEmail };
    if (userEmail && accessToken) h.Authorization = `Bearer ${accessToken}`;
    return h;
  };

  const normalize = (row) => ({
    id: row.id,
    kind: row.kind, // "problem" | "idea"
    title: row.title || "",
    body: row.body || "",
    status: row.status || STATUS.OPEN,
    domain: row.domain || null,
    scope: row.scope || null,
    severity: typeof row.severity === "number" ? row.severity : null,
    location: row.location || null,
    created_by_email: row.created_by_email || null,
    created_at: row.created_at || null,
    votes_count: typeof row.votes_count === "number" ? row.votes_count : 0,
    pledges_count: typeof row.pledges_count === "number" ? row.pledges_count : 0,
    pledges_done: typeof row.pledges_done === "number" ? row.pledges_done : 0,
    tags: row.tags || null,
  });

  const fetchItems = async () => {
    setLoading(true);
    setErr("");
    try {
      const params = { sort: filters.sort, limit: 100 };
      if (filters.kind !== "all") params.kind = filters.kind;
      const res = await api.get("/forge/items", { params, headers: headersFor() });
      const data = res?.data;
      const list = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
      const normalized = list.map(normalize);
      setItems(normalized);
    } catch (e) {
      console.error("GET /forge/items failed", e);
      setItems([]);
      setErr(e?.response?.data?.detail || e?.message || "Failed to load items");
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch when server-side params change (sort or kind)
  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.sort, filters.kind]);

  // suggestions (domains, locations, tags) based on current list
  const existingDomains = useMemo(
    () =>
      Array.from(new Set(items.map((i) => i.domain).filter(Boolean).map((s) => s.trim()))).sort(),
    [items]
  );
  const existingLocations = useMemo(
    () =>
      Array.from(new Set(items.map((i) => i.location).filter(Boolean).map((s) => s.trim()))).sort(),
    [items]
  );
  const existingTags = useMemo(() => {
    const set = new Set();
    items.forEach((i) => {
      (i.tags || "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
        .forEach((t) => set.add(t));
    });
    return Array.from(set).sort();
  }, [items]);

  // apply client-side filters
  const filtered = useMemo(() => {
    const f = filters;
    return (Array.isArray(items) ? items : []).filter((i) => {
      if (f.status !== "any" && norm(i.status) !== f.status) return false;

      if (String(f.domain || "").trim() && norm(i.domain) !== norm(f.domain)) return false;
      if (String(f.scope || "").trim() && norm(i.scope) !== norm(f.scope)) return false;
      if (String(f.location || "").trim() && norm(i.location) !== norm(f.location)) return false;

      if ((f.tags || []).length) {
        const tagsArr = String(i.tags || "")
          .split(",")
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean);
        const allHave = f.tags.every((t) => tagsArr.includes(norm(t)));
        if (!allHave) return false;
      }

      if (typeof f.severityMin === "number" && f.severityMin > 1) {
        const sev = i.severity ?? 0;
        if (sev < f.severityMin) return false;
      }

      if (query) {
        const hay = [
          i.title || "",
          i.body || "",
          i.tags || "",
          i.location || "",
          i.domain || "",
          i.scope || "",
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(query.toLowerCase())) return false;
      }

      return true;
    });
  }, [items, filters, query]);

  // optimistic helpers
  const hasVoted = (id) => myVotes.has(id);
  const toggleVote = async (id) => {
    const voted = hasVoted(id);
    setMyVotes((prev) => {
      const next = new Set(prev);
      if (voted) next.delete(id);
      else next.add(id);
      saveSet(votesKey(identityEmail), next);
      return next;
    });
    setItems((arr) =>
      arr.map((it) =>
        it.id === id
          ? { ...it, votes_count: Math.max(0, (it.votes_count || 0) + (voted ? -1 : 1)) }
          : it
      )
    );
    try {
      if (voted) {
        await api.delete(`/forge/items/${id}/vote`, { headers: headersFor() });
      } else {
        await api.post(`/forge/items/${id}/vote`, {}, { headers: headersFor() });
      }
    } catch (e) {
      console.error("vote toggle failed", e);
      setMyVotes((prev) => {
        const next = new Set(prev);
        if (voted) next.add(id);
        else next.delete(id);
        saveSet(votesKey(identityEmail), next);
        return next;
      });
      setItems((arr) =>
        arr.map((it) =>
          it.id === id
            ? { ...it, votes_count: Math.max(0, (it.votes_count || 0) + (voted ? 1 : -1)) }
            : it
        )
      );
      alert(e?.response?.data?.detail || "Unable to vote.");
    }
  };

  // ---------- Filter modal (bottom sheet on mobile) ----------
  function FilterModal({ open, onClose, value, onChange }) {
    const [local, setLocal] = useState(value);
    const [tagInput, setTagInput] = useState("");

    useEffect(() => {
      if (open) setLocal(value);
    }, [open, value]);

    const set = (patch) => setLocal((v) => ({ ...v, ...patch }));
    const addTag = () => {
      const t = tagInput.trim();
      if (!t) return;
      setLocal((v) => ({ ...v, tags: Array.from(new Set([...(v.tags || []), t])) }));
      setTagInput("");
    };
    const removeTag = (t) =>
      setLocal((v) => ({ ...v, tags: (v.tags || []).filter((x) => x !== t) }));

    const clearAll = () => setLocal(DEFAULT_FILTERS);
    const apply = () => {
      onChange(local);
      onClose();
    };

    if (!open) return null;
    return (
      <div className="fixed inset-0 z-40">
        <div className="absolute inset-0 bg-black/40" onClick={onClose} />
        {/* Bottom sheet on mobile, centered card on md+ */}
        <div className="absolute inset-x-0 bottom-0 md:inset-y-0 md:my-auto md:h-fit mx-auto w-full md:max-w-3xl">
          <div className="card p-0 overflow-hidden rounded-t-2xl md:rounded-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="font-semibold">Filters</div>
              <button className="btn btn-secondary" onClick={onClose} aria-label="Close filters">
                Close
              </button>
            </div>

            <div className="p-4 md:p-6 space-y-6">
              {/* Row 0: Sort (moved here) */}
              <div className="space-y-1">
                <label className="block text-sm font-medium">Sort</label>
                <select
                  value={local.sort}
                  onChange={(e) => set({ sort: e.target.value })}
                  className="w-full"
                >
                  <option value="new">Newest</option>
                  <option value="top">Top (votes)</option>
                </select>
              </div>

              {/* Row 1: Kind / Status */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-sm font-medium">Kind</label>
                  <select
                    value={local.kind}
                    onChange={(e) => set({ kind: e.target.value })}
                    className="w-full"
                  >
                    <option value="all">All</option>
                    <option value={KIND.PROBLEM}>Problems</option>
                    <option value={KIND.IDEA}>Ideas</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium">Status</label>
                  <select
                    value={local.status}
                    onChange={(e) => set({ status: e.target.value })}
                    className="w-full"
                  >
                    <option value="any">Any</option>
                    <option value={STATUS.OPEN}>Open</option>
                    <option value={STATUS.IN_PROGRESS}>In Progress</option>
                    <option value={STATUS.DONE}>Done</option>
                    <option value={STATUS.ARCHIVED}>Archived</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Domain/Scope/Location */}
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="block text-sm font-medium">Domain</label>
                  <input
                    list="filt-domain"
                    value={local.domain}
                    onChange={(e) => set({ domain: e.target.value })}
                    placeholder="e.g., Community"
                  />
                  <datalist id="filt-domain">
                    {["Community","Education","Environment","Health","Economy","Housing","Food","Policy","Tech","Arts"]
                      .concat(existingDomains.filter((d) => ![
                        "Community","Education","Environment","Health","Economy","Housing","Food","Policy","Tech","Arts"
                      ].includes(d)))
                      .map((d) => <option key={`dom-${d}`} value={d} />)}
                  </datalist>
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium">Scope</label>
                  <select
                    value={local.scope}
                    onChange={(e) => set({ scope: e.target.value })}
                  >
                    <option value="">Any</option>
                    <option>Personal</option>
                    <option>Community</option>
                    <option>Systemic</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium">Location</label>
                  <input
                    list="filt-loc"
                    value={local.location}
                    onChange={(e) => set({ location: e.target.value })}
                    placeholder='e.g., "Online", "Vancouver, BC", "Global"'
                  />
                  <datalist id="filt-loc">
                    <option value="Online" />
                    <option value="Global" />
                    {existingLocations.map((loc) => (
                      <option key={`loc-${loc}`} value={loc} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Row 3: Tags */}
              <div className="space-y-2">
                <label className="block text-sm font-medium">Tags</label>
                <div className="flex flex-wrap gap-2">
                  {(local.tags || []).map((t) => (
                    <span key={t} className="inline-flex items-center gap-1 px-2 py-1 rounded-full border text-sm">
                      {t}
                      <button
                        type="button"
                        onClick={() => removeTag(t)}
                        className="opacity-60 hover:opacity-100"
                        aria-label={`Remove ${t}`}
                        title="Remove"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    list="filt-tags"
                    placeholder="Add a tag…"
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === ",") {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                  />
                  <button className="btn btn-secondary" type="button" onClick={addTag}>Add</button>
                </div>
                <datalist id="filt-tags">
                  {existingTags.map((t) => <option key={`tag-${t}`} value={t} />)}
                </datalist>
              </div>

              {/* Row 4: Min Severity */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium">Minimum Severity</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={1}
                    max={5}
                    step={1}
                    value={Number(local.severityMin || 1)}
                    onChange={(e) => set({ severityMin: Number(e.target.value) })}
                    className="flex-1"
                  />
                  <span className="w-6 text-right text-sm">{Number(local.severityMin || 1)}</span>
                </div>
                <div className="text-xs opacity-70">1 includes everything.</div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <button className="btn btn-secondary" onClick={clearAll} type="button">Clear all</button>
              <div className="flex gap-2">
                <button className="btn btn-secondary" onClick={onClose} type="button">Cancel</button>
                <button className="btn" onClick={apply} type="button">Apply</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------- Active filter chips (no chip for sort, to keep it minimal) ----------
  const chips = useMemo(() => {
    const out = [];
    if (filters.kind !== "all") out.push({ key: "kind", label: `Kind: ${filters.kind}` });
    if (filters.status !== "any") out.push({ key: "status", label: `Status: ${statusLabel(filters.status)}` });
    if (filters.domain) out.push({ key: "domain", label: `Domain: ${filters.domain}` });
    if (filters.scope) out.push({ key: "scope", label: `Scope: ${filters.scope}` });
    if (filters.location) out.push({ key: "location", label: `Location: ${filters.location}` });
    (filters.tags || []).forEach((t, i) => out.push({ key: `tag:${i}`, label: `#${t}` }));
    if (Number(filters.severityMin) > 1) out.push({ key: "severityMin", label: `Severity ≥ ${filters.severityMin}` });
    return out;
  }, [filters]);

  const clearChip = (chip) => {
    const k = chip.key;
    if (k.startsWith("tag:")) {
      const ix = Number(k.split(":")[1]);
      setFilters((f) => ({ ...f, tags: (f.tags || []).filter((_, i) => i !== ix) }));
      return;
    }
    setFilters((f) => ({ ...f, [k]: DEFAULT_FILTERS[k] }));
  };

  // -----------------------------
  // Composer (collapsed by default)
  // -----------------------------
  function Composer() {
    const saved = (() => {
      try {
        const raw = localStorage.getItem(draftKey(identityEmail));
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    })();

    const [kind, setKind] = useState(saved?.kind || KIND.PROBLEM);
    const [title, setTitle] = useState(saved?.title || "");
    const [body, setBody] = useState(saved?.body || "");
    const [domain, setDomain] = useState(saved?.domain || "");
    const [scope, setScope] = useState(saved?.scope || "");
    const [severity, setSeverity] = useState(saved?.severity ?? 3);
    const [location, setLocation] = useState(saved?.location || "");
    const [tagInput, setTagInput] = useState("");
    const [tags, setTags] = useState(() => {
      const initial = (saved?.tags || "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      return Array.from(new Set(initial));
    });

    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
      const payload = { kind, title, body, domain, scope, severity, location, tags: tags.join(",") };
      try {
        localStorage.setItem(draftKey(identityEmail), JSON.stringify(payload));
      } catch {}
    }, [kind, title, body, domain, scope, severity, location, tags, identityEmail]);

    const titleMax = 180;
    const bodyMax = 5000;
    const canSubmit = userEmail && title.trim().length >= 3;

    const addTag = (raw) => {
      const t = (raw || "").trim();
      if (!t) return;
      setTags((prev) => {
        const next = new Set(prev);
        next.add(t);
        return Array.from(next);
      });
      setTagInput("");
    };
    const removeTag = (t) => setTags((prev) => prev.filter((x) => x !== t));
    const onTagKey = (e) => {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        addTag(tagInput);
      } else if (e.key === "Backspace" && !tagInput) {
        setTags((prev) => prev.slice(0, -1));
      }
    };

    const submit = async (e) => {
      e?.preventDefault?.();
      if (!canSubmit) return;
      setSubmitting(true);
      try {
        await api.post(
          "/forge/items",
          {
            kind,
            title: title.trim(),
            body: body.trim() || null,
            domain: domain || null,
            scope: scope || null,
            severity: severity || null,
            location: location || null,
            tags: tags.join(",") || null,
          },
          { headers: headersFor() }
        );
        try { localStorage.removeItem(draftKey(identityEmail)); } catch {}
        setTitle("");
        setBody("");
        setDomain("");
        setScope("");
        setSeverity(3);
        setLocation("");
        setTags([]);
        setTagInput("");
        await fetchItems();
        window.scrollTo({ top: 0, behavior: "smooth" });
        setShowComposer(false);
      } catch (e) {
        console.error("create item failed", e);
        alert(e?.response?.data?.detail || "Failed to create item.");
      } finally {
        setSubmitting(false);
      }
    };

    return (
      <form onSubmit={submit} className="card p-0 overflow-hidden">
        {/* Header strip */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-3">
            <select value={kind} onChange={(e) => setKind(e.target.value)} className="min-w-[9rem]" aria-label="Kind">
              <option value={KIND.PROBLEM}>Problem</option>
              <option value={KIND.IDEA}>Idea</option>
            </select>
            <span className="text-sm opacity-70">Share something meaningful — we’ll shape it together.</span>
          </div>
          <div className="text-xs opacity-60">Title {title.length}/{titleMax}</div>
        </div>

        {/* Body */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
          <div className="p-4 md:p-6 space-y-3">
            <label className="block text-sm font-medium">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => { if (e.target.value.length <= titleMax) setTitle(e.target.value); }}
              placeholder={`Give your ${kind} a clear, punchy title…`}
              className="w-full"
              required
              maxLength={titleMax}
            />

            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium">Description (optional)</label>
              <span className="text-xs opacity-60">{body.length}/{bodyMax}</span>
            </div>
            <textarea
              value={body}
              onChange={(e) => { if (e.target.value.length <= bodyMax) setBody(e.target.value); }}
              placeholder="Lay it out. What’s the essence? What would move this forward? Links welcome."
              rows={8}
              className="w-full leading-relaxed resize-y min-h-[10rem]"
              maxLength={bodyMax}
            />
          </div>

          {/* Options */}
          <div className="border-t md:border-t-0 md:border-l p-4 md:p-6 space-y-5 bg-zinc-50/60 dark:bg-zinc-900/40">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Domain</label>
              <select value={domain} onChange={(e) => setDomain(e.target.value)} className="w-full">
                <option value="">None</option>
                <option>Community</option>
                <option>Education</option>
                <option>Environment</option>
                <option>Health</option>
                <option>Economy</option>
                <option>Housing</option>
                <option>Food</option>
                <option>Policy</option>
                <option>Tech</option>
                <option>Arts</option>
                {existingDomains
                  .filter((d) =>
                    !["Community","Education","Environment","Health","Economy","Housing","Food","Policy","Tech","Arts"].includes(d)
                  )
                  .map((d) => <option key={`dom-${d}`} value={d}>{d}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium">Scope</label>
                <select value={scope} onChange={(e) => setScope(e.target.value)} className="w-full">
                  <option value="">None</option>
                  <option>Personal</option>
                  <option>Community</option>
                  <option>Systemic</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium">Severity (1–5)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={1}
                    max={5}
                    step={1}
                    value={severity}
                    onChange={(e) => setSeverity(Number(e.target.value))}
                    className="flex-1"
                  />
                  <span className="w-6 text-right text-sm">{severity}</span>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Location</label>
              <input
                list="composer-location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder='e.g., "Online", "Vancouver, BC", "Global"'
                className="w-full"
              />
              <datalist id="composer-location">
                <option value="Online" />
                <option value="Global" />
                {existingLocations.slice(0, 50).map((loc) => (
                  <option key={`loc-${loc}`} value={loc} />
                ))}
              </datalist>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Tags</label>
              <div className="flex flex-wrap gap-2">
                {tags.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 px-2 py-1 rounded-full border text-sm">
                    {t}
                    <button
                      type="button"
                      onClick={() => removeTag(t)}
                      className="opacity-60 hover:opacity-100"
                      aria-label={`Remove ${t}`}
                      title="Remove"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={onTagKey}
                  list="composer-tags"
                  placeholder="Add a tag and press Enter"
                  className="flex-1"
                />
                <button type="button" className="btn btn-secondary" onClick={() => addTag(tagInput)}>
                  Add
                </button>
              </div>
              <datalist id="composer-tags">
                {existingTags.slice(0, 100).map((t) => (
                  <option key={`tag-${t}`} value={t} />
                ))}
              </datalist>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between px-4 py-3 border-t">
          {!userEmail ? (
            <div className="text-sm opacity-70">Log in to post to the Forge.</div>
          ) : (
            <div className="text-sm opacity-70">
              Posting as <span className="font-medium">{userEmail}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setTitle("");
                setBody("");
                setDomain("");
                setScope("");
                setSeverity(3);
                setLocation("");
                setTags([]);
                setTagInput("");
              }}
            >
              Clear
            </button>
            <button type="submit" className="btn" disabled={!canSubmit || submitting}>
              {submitting ? "Submitting…" : "Post"}
            </button>
          </div>
        </div>
      </form>
    );
  }

  // ---------- Page ----------
  return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8">
        {/* Title */}
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">🛠️ The Forge</h1>
          <section className="card">
            <p className="text-base sm:text-lg">
              <strong>Post problems or ideas. Vote. Pledge action.</strong>
            </p>
            <p className="text-sm sm:text-base">
              One stream, two kinds: <span className="font-medium">Problems</span> and{" "}
              <span className="font-medium">Ideas</span>. We surface the work that matters and move it forward together. Anyone can vote. Sign up to get more involved.
            </p>
          </section>
        </div>

        {/* Controls (sticky, extra clean: just Search + Filters) */}
        <div className="sticky top-0 z-30 border rounded-xl bg-white/90 dark:bg-zinc-900/90 backdrop-blur px-3 py-2 sm:px-4 sm:py-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2 flex-1 border rounded-lg px-3 py-2">
              <span aria-hidden>🔎</span>
              <input
                type="search"
                value={qLive}
                onChange={(e) => setQLive(e.target.value)}
                placeholder="Search titles, descriptions, tags…"
                aria-label="Search"
                className="flex-1 bg-transparent border-0 focus:outline-none focus:ring-0 text-sm sm:text-base"
              />
              {qLive && (
                <button type="button" onClick={() => setQLive("")} className="text-xs btn btn-secondary">
                  Clear
                </button>
              )}
            </div>
            <button
              type="button"
              className="btn whitespace-nowrap"
              onClick={() => setShowFilter(true)}
              aria-haspopup="dialog"
              aria-expanded={showFilter}
            >
              ⚙️ Filters
            </button>
          </div>

          {/* Active filters: horizontal scroll on mobile */}
          {(() => {
            const chips = [];
            if (filters.kind !== "all") chips.push({ key: "kind", label: `Kind: ${filters.kind}` });
            if (filters.status !== "any") chips.push({ key: "status", label: `Status: ${statusLabel(filters.status)}` });
            if (filters.domain) chips.push({ key: "domain", label: `Domain: ${filters.domain}` });
            if (filters.scope) chips.push({ key: "scope", label: `Scope: ${filters.scope}` });
            if (filters.location) chips.push({ key: "location", label: `Location: ${filters.location}` });
            (filters.tags || []).forEach((t, i) => chips.push({ key: `tag:${i}`, label: `#${t}` }));
            if (Number(filters.severityMin) > 1) chips.push({ key: "severityMin", label: `Severity ≥ ${filters.severityMin}` });

            if (chips.length === 0) return null;
            return (
              <div className="mt-2 -mx-1 overflow-x-auto">
                <div className="px-1 flex items-center gap-2 min-w-max">
                  {chips.map((c, idx) => (
                    <span key={`${c.key}-${idx}`} className="inline-flex items-center gap-2 px-2 py-1 rounded-full border text-xs">
                      {c.label}
                      <button
                        className="opacity-60 hover:opacity-100"
                        onClick={() => {
                          if (c.key.startsWith("tag:")) {
                            const ix = Number(c.key.split(":")[1]);
                            setFilters((f) => ({ ...f, tags: (f.tags || []).filter((_, i) => i !== ix) }));
                          } else {
                            setFilters((f) => ({ ...f, [c.key]: DEFAULT_FILTERS[c.key] }));
                          }
                        }}
                        aria-label="Remove filter"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <button
                    type="button"
                    className="btn btn-secondary ml-auto text-xs"
                    onClick={() => setFilters(DEFAULT_FILTERS)}
                  >
                    Reset
                  </button>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Filter Modal */}
        <FilterModal
          open={showFilter}
          onClose={() => setShowFilter(false)}
          value={filters}
          onChange={setFilters}
        />

        {/* Composer toggle */}
        {userEmail && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setShowComposer((s) => !s)}
              className="w-full btn btn-muted flex items-center justify-between"
              aria-expanded={showComposer}
            >
              <span className="font-medium">{showComposer ? "Hide Share form" : "Share something"}</span>
              <span className="text-2xl leading-none select-none">{showComposer ? "−" : "+"}</span>
            </button>
            {showComposer && <Composer />}
          </div>
        )}

        {/* Feed */}
        {loading ? (
          <div className="opacity-70">Loading…</div>
        ) : err ? (
          <div className="card border-amber-500/40">
            <div className="font-semibold mb-1">Trouble loading</div>
            <p className="opacity-80 text-sm">{String(err)}</p>
            <div className="mt-3">
              <button className="btn btn-secondary" onClick={fetchItems}>Retry</button>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="opacity-70 text-center">Nothing here yet. Start by sharing something.</div>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {filtered.map((it) => {
              const voted = hasVoted(it.id);
              const votes = it.votes_count ?? 0;
              const pledgesDone = it.pledges_done ?? 0;
              const pledgesTotal = it.pledges_count ?? 0;

              return (
                <article
                  key={it.id}
                  className={`card space-y-3 ${
                    it.kind === KIND.PROBLEM ? "border-l-4 border-rose-500" : "border-l-4 border-sky-500"
                  }`}
                >
                  <header className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="uppercase text-[10px] sm:text-xs opacity-60">{it.kind}</span>
                      <span className={statusBadgeClass(it.status)}>
                        Status: {statusLabel(it.status)}
                      </span>
                    </div>
                    <div className="text-[10px] sm:text-xs opacity-70">
                      {it.created_at ? new Date(it.created_at).toLocaleString() : ""}
                    </div>
                  </header>

                  <Link to={`/forge2/${it.id}`} className="group block">
                    <h2 className="text-lg sm:text-xl font-semibold leading-snug group-hover:underline">
                      {it.title}
                    </h2>
                  </Link>

                  {it.body ? <p className="opacity-90 text-sm sm:text-base">{it.body}</p> : null}

                  <div className="flex items-center gap-3 text-[11px] sm:text-xs opacity-70 flex-wrap">
                    <span>{votes} {votes === 1 ? "vote" : "votes"}</span>
                    <span>•</span>
                    <span>{pledgesDone}/{pledgesTotal} pledges done</span>
                    {it.location && (
                      <>
                        <span>•</span>
                        <span>{it.location}</span>
                      </>
                    )}
                    {it.tags && (
                      <>
                        <span>•</span>
                        <span className="truncate max-w-[50ch]">{it.tags}</span>
                      </>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 sm:gap-3 justify-end items-center">
                    <Link to={`/forge2/${it.id}`} className="btn btn-secondary">
                      Open
                    </Link>
                    <button
                      onClick={() => toggleVote(it.id)}
                      aria-pressed={voted}
                      className={voted ? "btn btn-danger" : "btn btn-secondary"}
                    >
                      {voted ? "🙅 Unvote" : "👍 Vote"} · {votes}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}