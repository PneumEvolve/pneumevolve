import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api"
import { useNavigate } from "react-router-dom";

export default function DailyUse() {
  const { userEmail } = useAuth();
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [daily, setDaily] = useState({ journal_done_today: false, earned_today: 0, daily_cap: 0 });
  const navigate = useNavigate();

  const refresh = async () => {
  if (!userEmail) { setLoading(false); return; }
  setLoading(true);
  try {
    const headers = { "x-user-email": userEmail };
    const [b, d] = await Promise.all([
      api.get("/seed/balance", { headers }),
      api.get("/seed/daily", { headers }),
    ]);
    setBalance(b.data?.balance ?? 0);
    setDaily(d.data);
  } catch (e) {
    console.error(e);
  } finally { setLoading(false); }
};

  useEffect(() => { refresh(); }, [userEmail]);

  const ProgressBar = ({ value, max }) => (
    <div className="w-full bg-gray-200 dark:bg-zinc-800 rounded h-2">
      <div className="h-2 rounded bg-green-600" style={{ width: `${Math.min(100, (value / Math.max(1,max)) * 100)}%` }} />
    </div>
  );

  return (
    <div className="main space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">🌅 Daily Use</h1>
          <p className="text-sm opacity-70">Do one meaningful action each day to earn SEED.</p>
        </div>
        <div className="text-right">
          <div className="text-xs opacity-70">SEED (mock) balance</div>
          <div className="text-3xl font-bold">{balance}</div>
        </div>
      </header>

      {loading ? (
        <div className="opacity-60">Loading…</div>
      ) : !userEmail ? (
        <div className="opacity-70">Log in to see and earn your daily SEED.</div>
      ) : (
        <>
          <div className="card space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">Journal entry (+5 SEED)</div>
                <div className="text-sm opacity-70">
                  {daily.journal_done_today ? "Completed today" : "Not done yet"}
                </div>
              </div>
              <button
                className={`btn ${daily.journal_done_today ? "btn-muted" : ""}`}
                onClick={() => navigate("/journal")}
                disabled={daily.journal_done_today}
              >
                {daily.journal_done_today ? "Done" : "Write one"}
              </button>
            </div>
          </div>

          <div className="card space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-medium">Today’s progress</div>
              <div className="text-sm opacity-70">{daily.earned_today}/{daily.daily_cap} SEED</div>
            </div>
            <ProgressBar value={daily.earned_today} max={daily.daily_cap || 1} />
            <div className="text-xs opacity-60">Rewards include clicks, journal, and more as you add them.</div>
          </div>

          <div>
            <a className="btn btn-secondary" href={`${import.meta.env.VITE_API_URL}/seed/ledger.csv`} target="_blank" rel="noopener noreferrer">
              Download your ledger (CSV)
            </a>
          </div>
        </>
      )}
    </div>
  );
}