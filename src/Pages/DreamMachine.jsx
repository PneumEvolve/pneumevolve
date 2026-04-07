// src/pages/DreamMachine.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
 
export default function DreamMachine() {
  const [summary, setSummary] = useState("");
  const [mantra, setMantra] = useState("");
  const [featured, setFeatured] = useState("");
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
        const res = await api.get("/we-dream/collective", {
          signal: ctrl.signal,
          validateStatus: () => true,
        });
        if (res.status !== 200) {
          setErr(`Failed to load (status ${res.status})`);
          return;
        }
        const data = res.data || {};
        setSummary(data.summary ?? "");
        setMantra(data.mantra ?? "");
        setFeatured(data.featured ?? "");
        setCount(
          typeof data.count === "number" ? data.count
          : typeof data.entry_count === "number" ? data.entry_count
          : 0
        );
        setUpdatedAt(data.updated_at || data.created_at || "");
      } catch (e) {
        if (e?.code === "ERR_CANCELED" || e?.name === "CanceledError") return;
        setErr("Failed to load dream machine data.");
      } finally {
        setLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, []);
 
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin + "/experiments/dream-machine");
      alert("Link copied!");
    } catch {
      alert("Couldn't copy the link.");
    }
  };
 
  const shareFacebook = () => {
    const url = encodeURIComponent(window.location.origin + "/experiments/dream-machine");
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      "_blank",
      "noopener,noreferrer"
    );
  };
 
  return (
    <main className="main p-6 space-y-8">
      {/* Hero */}
      <section className="card text-center space-y-4">
        <h1 className="text-3xl sm:text-4xl font-bold">🌍 Dream Machine</h1>
        <p className="opacity-90 max-w-lg mx-auto">
          Each night, the visions of everyone dreaming together are woven into
          a collective message. A living picture of where we're headed.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link to="/we-dream" className="btn">➕ Add your dream</Link>
          <Link to="/" className="btn btn-secondary">← Home</Link>
        </div>
      </section>
 
      {/* Meta bar */}
      <div className="section-bar flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="badge">
            🛌 {count} {count === 1 ? "dreamer" : "dreamers"}
          </span>
          {updatedAt && (
            <span className="badge">
              ⏰ Last woven: {new Date(updatedAt).toLocaleDateString()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-secondary" onClick={copyLink}>Copy link</button>
          <button className="btn btn-secondary" onClick={shareFacebook}>Share</button>
        </div>
      </div>
 
      {loading ? (
        <div className="card text-center opacity-80">Weaving dreams…</div>
      ) : err ? (
        <div className="card text-center opacity-80">{err}</div>
      ) : (
        <>
          {/* Collective mantra */}
          <section className="card text-center space-y-2">
            <h2 className="text-xl font-semibold opacity-60 uppercase tracking-widest text-sm">
              Collective mantra
            </h2>
            <p className="text-2xl leading-relaxed">
              {mantra || "—"}
            </p>
          </section>
 
          {/* Featured vision */}
          {featured && (
            <section className="card space-y-2">
              <h2 className="text-sm font-semibold opacity-60 uppercase tracking-widest">
                Tonight's featured dream
              </h2>
              <p className="text-lg leading-relaxed italic opacity-90">
                "{featured}"
              </p>
            </section>
          )}
 
          {/* All visions summary */}
          <section className="space-y-2">
            <div className="section-bar">
              <h3 className="font-semibold">What people are dreaming</h3>
            </div>
            <div className="card">
              <p className="whitespace-pre-wrap leading-loose opacity-90">
                {summary || "No dreams woven yet. Add yours to start the machine."}
              </p>
            </div>
          </section>
        </>
      )}
    </main>
  );
}