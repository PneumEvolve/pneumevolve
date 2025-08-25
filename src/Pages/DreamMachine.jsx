// src/pages/DreamMachine.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";

export default function DreamMachine() {
  const [summary, setSummary] = useState("");
  const [mantra, setMantra] = useState("");
  const [count, setCount] = useState(0);
  const [updatedAt, setUpdatedAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        setErr("");
        setLoading(true);

        let res = await api.get("/we-dream/collective", {
          signal: ctrl.signal,
          validateStatus: () => true,
        });
        if (res.status === 307 || res.status === 308) {
          res = await api.get("/we-dream/collective/", {
            signal: ctrl.signal,
            validateStatus: () => true,
          });
        }
        if (res.status !== 200) {
          setErr(`Failed to load (status ${res.status})`);
          return;
        }

        const data = res.data || {};
        setSummary(data.summary ?? "");
        setMantra(data.mantra ?? "");
        setCount(
          typeof data.count === "number"
            ? data.count
            : typeof data.entry_count === "number"
            ? data.entry_count
            : 0
        );
        setUpdatedAt(data.updated_at || data.created_at || "");
      } catch (e) {
        if (e?.code === "ERR_CANCELED" || e?.name === "CanceledError") return;
        console.error("Failed to load dream machine data:", e);
        setErr("Failed to load dream machine data.");
      } finally {
        setLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, []);

  const shareFacebook = () => {
    const url = encodeURIComponent(window.location.origin + "/dream-machine");
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin + "/dream-machine");
      alert("Link copied!");
    } catch {
      alert("Couldn’t copy the link.");
    }
  };

  return (
    <main className="main p-6 space-y-8">
      {/* Hero */}
      <section className="card text-center space-y-4">
        <h1 className="text-3xl sm:text-4xl font-bold">🌍 Dream Machine</h1>
        <p className="opacity-90">
          Each night, one dream from every active user is woven into a collective message.
          A living summary of where we’re headed—together.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link to="/we-dream" className="btn">➕ Add your Dream</Link>
          <Link to="/" className="btn btn-secondary">← Home</Link>
        </div>
      </section>

      {/* Status / meta */}
      <div className="section-bar flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="badge">🛌 {count} dream{count === 1 ? "" : "s"}</span>
          <span className="badge">
            ⏰ Updated: {updatedAt ? new Date(updatedAt).toLocaleString() : "—"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-secondary" onClick={copyLink}>Copy Link</button>
          <button className="btn btn-secondary" onClick={shareFacebook}>Share</button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="card text-center opacity-80">Loading collective dream…</div>
      ) : err ? (
        <div className="card border-amber-500/40 text-center">{err}</div>
      ) : (
        <>
          {/* Mantra */}
          <section className="card text-center space-y-2">
            <h2 className="text-2xl font-semibold">✨ Collective Mantra</h2>
            <p className="text-xl">{mantra || "—"}</p>
          </section>

          {/* Summary */}
          <section className="space-y-2">
            <div className="section-bar">
              <h3 className="font-semibold">🧠 AI Summary</h3>
            </div>
            <div className="card">
              <p className="whitespace-pre-wrap leading-relaxed">
                {summary || "No summary yet. Add your dream to help shape it."}
              </p>
            </div>
          </section>
        </>
      )}
    </main>
  );
}