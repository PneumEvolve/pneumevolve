import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { Link } from "react-router-dom";

const API = import.meta.env.VITE_API_URL;

export default function TokenLedger() {
  const { userEmail } = useAuth();
  const [rows, setRows] = useState([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    if (!userEmail) { setRows([]); setBalance(0); setLoading(false); return; }
    setLoading(true);
    try {
      const [b, l] = await Promise.all([
        axios.get(`${API}/seed/balance`, { headers: { "x-user-email": userEmail } }),
        axios.get(`${API}/seed/ledger`, { headers: { "x-user-email": userEmail }, params: { limit: 500 } }),
      ]);
      setBalance(b.data.balance || 0);
      setRows(Array.isArray(l.data) ? l.data : []);
    } catch (e) {
      console.error(e); setRows([]);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); /* eslint-disable-line */ }, [userEmail]);

  return (
    <div className="main space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">🌱 SEED Ledger (mock)</h1>
          <p className="text-sm opacity-70">Append-only; download anytime. On-chain deposit coming soon.</p>
        </div>
        <div className="text-right">
          <div className="text-sm opacity-70">Your balance</div>
          <div className="text-3xl font-bold">{balance}</div>
        </div>
      </header>

      <div className="flex gap-2">
        <a className="btn btn-secondary" href={`${API}/seed/ledger.csv`} target="_blank" rel="noopener noreferrer">Download CSV</a>
        <a className="btn btn-secondary" href={`${API}/seed/ledger.json`} target="_blank" rel="noopener noreferrer">Download JSON</a>
        <a className="btn btn-muted" href="https://github.com/PneumEvolve/shea-klipper-backend/blob/main/routers/seed.py" target="_blank" rel="noopener noreferrer">View backend code</a>
        <Link className="btn btn-muted" to="/account#daily">Daily Use</Link>
      </div>

      <div className="card">
        {loading ? (
          <div className="opacity-60">Loading…</div>
        ) : !userEmail ? (
          <div className="opacity-70">Log in to view your ledger.</div>
        ) : rows.length === 0 ? (
          <div className="opacity-70">No activity yet. Click outbound links or use gated features to earn/spend SEED.</div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-left opacity-70">
                <tr><th>Date</th><th>Type</th><th>Δ</th><th>Ref</th><th>Balance</th></tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t" style={{ borderColor: "var(--border)" }}>
                    <td>{new Date(r.created_at).toLocaleString()}</td>
                    <td>{r.event_type}</td>
                    <td className={r.delta >= 0 ? "text-green-600" : "text-red-600"}>{r.delta}</td>
                    <td>{r.ref || ""}</td>
                    <td>{r.balance_after}</td>
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