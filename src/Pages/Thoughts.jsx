import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Thoughts() {
  const [tab, setTab] = useState("received"); // "received" | "sent" | "send"
  const [received, setReceived] = useState([]);
  const [sent, setSent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // send form
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(null); // { id, username }
  const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState(null); // "ok" | "error" | "rate"
  const searchTimeout = useRef(null);

  useEffect(() => {
    async function load() {
      try {
        const [recv, snt] = await Promise.all([
          api.get("/thoughts/received"),
          api.get("/thoughts/sent"),
        ]);
        setReceived(recv.data);
        setSent(snt.data);
      } catch (e) {
        setError("Couldn't load your thoughts log.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // debounced user search
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([]);
      return;
    }
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.get("/thoughts/users/search", { params: { q: query } });
        setResults(res.data);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
  }, [query]);

  async function handleSend() {
    if (!selected) return;
    setSending(true);
    setSendStatus(null);
    try {
      await api.post("/thoughts/", { recipient_username: selected.username });
      setSendStatus("ok");
      setSelected(null);
      setQuery("");
      setResults([]);
      // refresh sent log
      const snt = await api.get("/thoughts/sent");
      setSent(snt.data);
    } catch (e) {
      const status = e?.response?.status;
      setSendStatus(status === 429 ? "rate" : "error");
    } finally {
      setSending(false);
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.title}>thinking of you</h1>
          <p style={styles.subtitle}>
            a quiet way to let someone know they crossed your mind
          </p>
        </div>

        {/* Tabs */}
        <div style={styles.tabs}>
          {["received", "sent", "send"].map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setSendStatus(null); }}
              style={{
                ...styles.tab,
                ...(tab === t ? styles.tabActive : {}),
              }}
            >
              {t === "send" ? "+ send a thought" : t}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={styles.panel}>

          {/* ── Received ── */}
          {tab === "received" && (
            loading ? <p style={styles.empty}>loading...</p> :
            error ? <p style={styles.empty}>{error}</p> :
            received.length === 0 ? (
              <div style={styles.emptyState}>
                <p style={styles.emptyIcon}>✦</p>
                <p style={styles.emptyText}>no thoughts yet</p>
                <p style={styles.emptyHint}>
                  when someone thinks of you, it'll show up here
                </p>
              </div>
            ) : (
              <ul style={styles.list}>
                {received.map((p) => (
                  <li key={p.id} style={styles.pingItem}>
                    <span style={styles.pingName}>{p.other_username}</span>
                    <span style={styles.pingLabel}>was thinking of you</span>
                    <span style={styles.pingTime}>{timeAgo(p.sent_at)}</span>
                  </li>
                ))}
              </ul>
            )
          )}

          {/* ── Sent ── */}
          {tab === "sent" && (
            loading ? <p style={styles.empty}>loading...</p> :
            error ? <p style={styles.empty}>{error}</p> :
            sent.length === 0 ? (
              <div style={styles.emptyState}>
                <p style={styles.emptyIcon}>✦</p>
                <p style={styles.emptyText}>you haven't sent any thoughts yet</p>
                <p style={styles.emptyHint}>
                  go to "send a thought" to let someone know
                </p>
              </div>
            ) : (
              <ul style={styles.list}>
                {sent.map((p) => (
                  <li key={p.id} style={styles.pingItem}>
                    <span style={styles.pingLabel}>you thought of</span>
                    <span style={styles.pingName}>{p.other_username}</span>
                    <span style={styles.pingTime}>{timeAgo(p.sent_at)}</span>
                  </li>
                ))}
              </ul>
            )
          )}

          {/* ── Send ── */}
          {tab === "send" && (
            <div style={styles.sendForm}>
              <p style={styles.sendPrompt}>who's on your mind?</p>

              <input
                style={styles.input}
                type="text"
                placeholder="search by username..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelected(null);
                  setSendStatus(null);
                }}
              />

              {searching && <p style={styles.searching}>searching...</p>}

              {results.length > 0 && !selected && (
                <ul style={styles.results}>
                  {results.map((u) => (
                    <li
                      key={u.id}
                      style={styles.resultItem}
                      onClick={() => {
                        setSelected(u);
                        setQuery(u.username);
                        setResults([]);
                      }}
                    >
                      {u.username}
                    </li>
                  ))}
                </ul>
              )}

              {selected && (
                <div style={styles.selectedUser}>
                  <span>thinking of <strong>{selected.username}</strong></span>
                </div>
              )}

              {sendStatus === "ok" && (
                <p style={styles.successMsg}>
                  ✦ {selected?.username ?? "they"}'ll know you were thinking of them
                </p>
              )}
              {sendStatus === "rate" && (
                <p style={styles.errorMsg}>
                  you already sent a thought to this person recently — give it an hour
                </p>
              )}
              {sendStatus === "error" && (
                <p style={styles.errorMsg}>something went wrong, try again</p>
              )}

              <button
                style={{
                  ...styles.sendBtn,
                  ...((!selected || sending) ? styles.sendBtnDisabled : {}),
                }}
                onClick={handleSend}
                disabled={!selected || sending}
              >
                {sending ? "sending..." : "send thought"}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = {
  page: {
    minHeight: "100vh",
    background: "#faf9f7",
    fontFamily: "Georgia, serif",
    color: "#2c2c2a",
    padding: "2rem 1rem",
  },
  container: {
    maxWidth: "560px",
    margin: "0 auto",
  },
  header: {
    textAlign: "center",
    marginBottom: "2.5rem",
  },
  title: {
    fontSize: "2rem",
    fontWeight: "normal",
    fontStyle: "italic",
    margin: "0 0 0.5rem",
    letterSpacing: "0.02em",
  },
  subtitle: {
    fontSize: "0.9rem",
    opacity: 0.5,
    margin: 0,
    fontStyle: "italic",
  },
  tabs: {
    display: "flex",
    gap: "0.5rem",
    marginBottom: "1.5rem",
    borderBottom: "1px solid #e8e2d8",
    paddingBottom: "0.75rem",
  },
  tab: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: "0.85rem",
    color: "#2c2c2a",
    opacity: 0.4,
    padding: "0.25rem 0.5rem",
    fontFamily: "Georgia, serif",
    transition: "opacity 0.15s",
  },
  tabActive: {
    opacity: 1,
    borderBottom: "2px solid #2c2c2a",
  },
  panel: {
    minHeight: "200px",
  },
  list: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  pingItem: {
    display: "flex",
    alignItems: "baseline",
    gap: "0.4rem",
    padding: "0.75rem 1rem",
    background: "#f5f0e8",
    borderRadius: "8px",
    flexWrap: "wrap",
  },
  pingName: {
    fontWeight: "bold",
    fontSize: "0.95rem",
  },
  pingLabel: {
    fontSize: "0.85rem",
    opacity: 0.6,
    fontStyle: "italic",
  },
  pingTime: {
    marginLeft: "auto",
    fontSize: "0.75rem",
    opacity: 0.4,
  },
  emptyState: {
    textAlign: "center",
    padding: "3rem 0",
  },
  emptyIcon: {
    fontSize: "1.5rem",
    opacity: 0.3,
    margin: "0 0 0.75rem",
  },
  emptyText: {
    fontSize: "0.95rem",
    opacity: 0.5,
    fontStyle: "italic",
    margin: "0 0 0.5rem",
  },
  emptyHint: {
    fontSize: "0.8rem",
    opacity: 0.35,
    margin: 0,
  },
  empty: {
    opacity: 0.4,
    fontStyle: "italic",
    fontSize: "0.9rem",
  },
  sendForm: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  sendPrompt: {
    fontStyle: "italic",
    opacity: 0.6,
    margin: 0,
    fontSize: "0.95rem",
  },
  input: {
    padding: "0.65rem 0.9rem",
    border: "1px solid #d4c9b0",
    borderRadius: "8px",
    background: "#f5f0e8",
    fontFamily: "Georgia, serif",
    fontSize: "0.9rem",
    color: "#2c2c2a",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  },
  searching: {
    fontSize: "0.8rem",
    opacity: 0.4,
    fontStyle: "italic",
    margin: 0,
  },
  results: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    border: "1px solid #d4c9b0",
    borderRadius: "8px",
    overflow: "hidden",
  },
  resultItem: {
    padding: "0.6rem 0.9rem",
    cursor: "pointer",
    fontSize: "0.9rem",
    background: "#f5f0e8",
    borderBottom: "1px solid #e8e2d8",
    transition: "background 0.1s",
  },
  selectedUser: {
    padding: "0.6rem 0.9rem",
    background: "#eee8d8",
    borderRadius: "8px",
    fontSize: "0.9rem",
  },
  successMsg: {
    color: "#5a7a5a",
    fontSize: "0.85rem",
    fontStyle: "italic",
    margin: 0,
  },
  errorMsg: {
    color: "#8a4a4a",
    fontSize: "0.85rem",
    fontStyle: "italic",
    margin: 0,
  },
  sendBtn: {
    padding: "0.7rem 1.5rem",
    background: "#2c2c2a",
    color: "#faf9f7",
    border: "none",
    borderRadius: "8px",
    fontFamily: "Georgia, serif",
    fontSize: "0.9rem",
    cursor: "pointer",
    alignSelf: "flex-start",
    transition: "opacity 0.15s",
  },
  sendBtnDisabled: {
    opacity: 0.35,
    cursor: "not-allowed",
  },
};