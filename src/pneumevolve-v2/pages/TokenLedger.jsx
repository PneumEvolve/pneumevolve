import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { Link } from "react-router-dom";

const API = import.meta.env.VITE_API_URL;

export default function TokenLedger() {
  const { userEmail } = useAuth();

  const [scope, setScope] = useState("mine"); // "mine" | "global"
  const [rows, setRows] = useState([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const headers = userEmail ? { "x-user-email": userEmail } : {};

  const fetchAll = async () => {
    setLoading(true);
    setErr("");
    try {
      if (scope === "mine") {
        if (!userEmail) {
          setRows([]); setBalance(0); setLoading(false);
          return;
        }
        const [b, l] = await Promise.all([
          axios.get(`${API}/seed/balance`, { headers }),
          axios.get(`${API}/seed/ledger`, { headers, params: { limit: 500 } }),
        ]);
        setBalance(b.data?.balance || 0);
        setRows(Array.isArray(l.data) ? l.data : []);
      } else {
        // global: no balance; rows include identity (masked by backend)
        const l = await axios.get(`${API}/seed/ledger/global`, { params: { limit: 500 } });
        setBalance(0);
        setRows(Array.isArray(l.data) ? l.data : []);
      }
    } catch (e) {
      setErr(e?.response?.data?.detail || e.message || "Failed to load ledger.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); /* eslint-disable-line */ }, [userEmail, scope]);

  const downloadMineCSV = async () => {
    try {
      const res = await axios.get(`${API}/seed/ledger.csv`, { headers, responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url; a.download = "seed_ledger.csv"; document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (e) { alert(e?.response?.data?.detail || e.message || "Download failed."); }
  };
  const downloadMineJSON = async () => {
    try {
      const res = await axios.get(`${API}/seed/ledger.json`, { headers, responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url; a.download = "seed_ledger.json"; document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (e) { alert(e?.response?.data?.detail || e.message || "Download failed."); }
  };

  // Global downloads can use plain links (no header needed)
  const globalCsvHref = `${API}/seed/ledger.global.csv`;
  const globalJsonHref = `${API}/seed/ledger.global.json`;

  return (
    <div className="main space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">🌱 SEED Ledger</h1>
          <p className="text-sm opacity-70">Append-only; download anytime. On-chain deposit coming soon.</p>
        </div>
        <div className="text-right">
          <div className="text-sm opacity-70">Your balance</div>
          <div className="text-3xl font-bold">
            {scope === "mine" ? balance : "—"}
          </div>
        </div>
      </header>

      {/* Scope toggle */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded border" style={{ borderColor: "var(--border)" }}>
          <button
            className={`px-3 py-1 ${scope === "mine" ? "bg-[var(--bg-elev)] font-medium" : "opacity-75"}`}
            onClick={() => setScope("mine")}
          >
            Mine
          </button>
          <button
            className={`px-3 py-1 ${scope === "global" ? "bg-[var(--bg-elev)] font-medium" : "opacity-75"}`}
            onClick={() => setScope("global")}
          >
            Global
          </button>
        </div>

        <button className="btn btn-secondary" onClick={fetchAll}>⟳ Refresh</button>

        {/* Downloads */}
        {scope === "mine" ? (
          <>
            <button className="btn btn-secondary" onClick={downloadMineCSV}>Download CSV</button>
            <button className="btn btn-secondary" onClick={downloadMineJSON}>Download JSON</button>
          </>
        ) : (
          <>
            <a className="btn btn-secondary" href={globalCsvHref} target="_blank" rel="noopener noreferrer">Download CSV</a>
            <a className="btn btn-secondary" href={globalJsonHref} target="_blank" rel="noopener noreferrer">Download JSON</a>
          </>
        )}

        <a className="btn btn-muted" href="https://github.com/yourrepo/backend/routers/seed.py" target="_blank" rel="noopener noreferrer">
          View backend code
        </a>
        <Link className="btn btn-muted" to="/account#daily">Daily Use</Link>
      </div>

      <div className="card">
        {loading ? (
          <div className="opacity-60">Loading…</div>
        ) : err ? (
          <div className="text-red-600">{err}</div>
        ) : scope === "mine" && !userEmail ? (
          <div className="opacity-70">Log in to view your ledger.</div>
        ) : rows.length === 0 ? (
          <div className="opacity-70">No activity yet.</div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-left opacity-70">
                <tr>
                  <th>Date</th>
                  {scope === "global" && <th>Identity</th>}
                  <th>Type</th>
                  <th>Δ</th>
                  <th>Ref</th>
                  {scope === "mine" && <th>Balance</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t" style={{ borderColor: "var(--border)" }}>
                    <td>{new Date(r.created_at).toLocaleString()}</td>
                    {scope === "global" && <td>{r.identity}</td>}
                    <td>{r.event_type}</td>
                    <td className={r.delta >= 0 ? "text-green-600" : "text-red-600"}>{r.delta}</td>
                    <td>{r.ref || ""}</td>
                    {scope === "mine" && <td>{r.balance_after}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}