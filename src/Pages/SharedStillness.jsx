// src/Pages/SharedStillness.jsx
 
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
 
// ─── Helpers ──────────────────────────────────────────────────────────────────
 
function pad(n) { return String(n).padStart(2, "0"); }
 
function formatCountdown(secs) {
  if (secs <= 0) return "00:00";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}
 
// Convert a local time input (HH:MM) + user's browser timezone → UTC HH:MM string
// This is what we send to the server so the window fires at the right moment globally
function localTimeToUtc(localTimeStr) {
  const [h, m] = localTimeStr.split(":").map(Number);
  const now = new Date();
  now.setHours(h, m, 0, 0);
  return `${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}`;
}
 
// Show the stored UTC time as local time for display purposes
function utcTimeToLocal(utcTimeStr) {
  if (!utcTimeStr) return "";
  const [h, m] = utcTimeStr.split(":").map(Number);
  const now = new Date();
  now.setUTCHours(h, m, 0, 0);
  return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
}
 
function formatLocalTime(utcTimeStr) {
  if (!utcTimeStr) return "";
  const local = utcTimeToLocal(utcTimeStr);
  const [h, m] = local.split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  const display = h % 12 || 12;
  return `${display}:${pad(m)} ${suffix} your time`;
}
 
// ─── CSS ──────────────────────────────────────────────────────────────────────
 
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;1,400&family=DM+Sans:wght@300;400;500&display=swap');
 
  .ss-root {
    min-height: 100vh;
    background: var(--bg);
    color: var(--text);
    font-family: 'DM Sans', sans-serif;
    font-weight: 300;
  }
 
  .ss-list {
    max-width: 480px;
    margin: 0 auto;
    padding: 2.5rem 1.5rem 4rem;
  }
  .ss-list-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin-bottom: 2rem;
  }
  .ss-list-title {
    font-family: 'Lora', serif;
    font-size: 1.6rem;
    font-style: italic;
    font-weight: 400;
    opacity: 0.8;
  }
  .ss-new-btn {
    background: none;
    border: 1px solid var(--border);
    color: var(--text);
    font-family: 'DM Sans', sans-serif;
    font-size: 0.75rem;
    padding: 0.4rem 1rem;
    border-radius: 999px;
    cursor: pointer;
    transition: opacity 0.2s;
  }
  .ss-new-btn:hover { opacity: 0.6; }
 
  .ss-create-form {
    background: var(--bg-elev);
    border: 1px solid var(--border);
    border-radius: 1rem;
    padding: 1.2rem 1.4rem;
    margin-bottom: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
  }
  .ss-field-label {
    font-size: 0.68rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    opacity: 0.4;
    margin-bottom: 0.3rem;
  }
  .ss-input {
    width: 100%;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 0.6rem;
    padding: 0.55rem 0.9rem;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.85rem;
    font-weight: 300;
    color: var(--text);
    outline: none;
    transition: border-color 0.2s;
    box-sizing: border-box;
  }
  .ss-input:focus { border-color: rgba(140,160,190,0.5); }
  .ss-input::placeholder { opacity: 0.35; }
 
  .ss-time-hint {
    font-size: 0.7rem;
    opacity: 0.35;
    margin-top: 0.3rem;
  }
  .ss-form-actions { display: flex; gap: 0.6rem; }
  .ss-btn {
    background: none;
    border: 1px solid var(--border);
    color: var(--text);
    font-family: 'DM Sans', sans-serif;
    font-size: 0.75rem;
    padding: 0.4rem 1rem;
    border-radius: 999px;
    cursor: pointer;
    transition: opacity 0.2s;
  }
  .ss-btn:hover { opacity: 0.6; }
  .ss-btn--primary { background: var(--bg-elev); border-color: rgba(140,160,190,0.4); }
  .ss-btn:disabled { opacity: 0.4; cursor: default; }
 
  .ss-group-card {
    border: 1px solid var(--border);
    border-radius: 1rem;
    padding: 1.1rem 1.3rem;
    margin-bottom: 0.75rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    color: var(--text);
    transition: background 0.2s;
    cursor: pointer;
    background: var(--bg);
  }
  .ss-group-card:hover { background: var(--bg-elev); }
  .ss-group-card-left { flex: 1; min-width: 0; }
  .ss-group-name-text {
    font-family: 'Lora', serif;
    font-size: 1rem;
    font-style: italic;
    opacity: 0.8;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .ss-group-meta { font-size: 0.7rem; opacity: 0.35; margin-top: 0.25rem; letter-spacing: 0.03em; }
  .ss-group-actions { display: flex; gap: 0.5rem; align-items: center; flex-shrink: 0; }
  .ss-danger-btn {
    background: none;
    border: 1px solid rgba(200,100,100,0.25);
    color: rgba(200,100,100,0.7);
    font-family: 'DM Sans', sans-serif;
    font-size: 0.7rem;
    padding: 0.3rem 0.7rem;
    border-radius: 999px;
    cursor: pointer;
    transition: opacity 0.2s;
  }
  .ss-danger-btn:hover { opacity: 0.7; }
 
  .ss-invite-section {
    margin-top: -0.4rem;
    margin-bottom: 0.75rem;
    padding: 0.6rem 0.9rem;
    background: var(--bg-elev);
    border-radius: 0 0 0.8rem 0.8rem;
    font-size: 0.72rem;
    opacity: 0.5;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    justify-content: space-between;
  }
  .ss-invite-code { font-family: monospace; word-break: break-all; }
  .ss-copy-inline {
    background: none; border: none; color: var(--text);
    font-size: 0.7rem; cursor: pointer; opacity: 0.6;
    padding: 0; white-space: nowrap;
    font-family: 'DM Sans', sans-serif;
    transition: opacity 0.2s;
  }
  .ss-copy-inline:hover { opacity: 1; }
 
  .ss-empty {
    text-align: center; opacity: 0.3; font-size: 0.85rem;
    padding: 3rem 0; font-style: italic; font-family: 'Lora', serif;
  }
  .ss-join-form { margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid var(--border); }
  .ss-join-label { font-size: 0.72rem; opacity: 0.4; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 0.6rem; }
  .ss-join-row { display: flex; gap: 0.6rem; }
 
  /* Session page */
  .ss-session-root {
    min-height: 100vh;
    display: flex; flex-direction: column; align-items: center;
    padding: 0 1.5rem 4rem;
  }
  .ss-session-header {
    width: 100%; max-width: 480px;
    display: flex; align-items: center; justify-content: space-between;
    padding: 2rem 0 0;
  }
  .ss-back {
    font-size: 0.75rem; opacity: 0.35; text-decoration: none;
    color: var(--text); letter-spacing: 0.04em; transition: opacity 0.2s;
  }
  .ss-back:hover { opacity: 0.7; }
  .ss-session-group-name {
    font-family: 'Lora', serif; font-size: 1rem; font-style: italic; opacity: 0.6;
  }
  .ss-invite-toggle {
    background: none; border: 1px solid var(--border); color: var(--text);
    font-size: 0.7rem; padding: 0.3rem 0.8rem; border-radius: 999px;
    cursor: pointer; opacity: 0.45; transition: opacity 0.2s;
    font-family: 'DM Sans', sans-serif;
  }
  .ss-invite-toggle:hover { opacity: 0.9; }
  .ss-session-invite {
    width: 100%; max-width: 480px;
    background: var(--bg-elev); border: 1px solid var(--border);
    border-radius: 1rem; padding: 1rem 1.2rem; margin-top: 0.75rem; font-size: 0.78rem;
  }
  .ss-session-invite p { opacity: 0.5; margin: 0 0 0.6rem; }
  .ss-session-invite-row { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
  .ss-session-invite-url { font-family: monospace; font-size: 0.75rem; opacity: 0.5; word-break: break-all; }
 
  /* Scheduled time display */
  .ss-scheduled-time {
    font-size: 0.72rem; opacity: 0.3; letter-spacing: 0.06em;
    text-align: center; margin-top: -1rem;
  }
 
  .ss-main {
    flex: 1; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: 2.5rem; width: 100%; max-width: 480px; padding-top: 3rem;
  }
  .ss-orb-wrap { display: flex; align-items: center; justify-content: center; }
  .ss-orb {
    width: 200px; height: 200px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    transition: transform 0.6s ease, box-shadow 0.6s ease;
  }
  .ss-orb--waiting {
    background: radial-gradient(circle at 40% 35%, rgba(180,190,210,0.18), rgba(140,160,190,0.07));
    border: 1px solid rgba(140,160,190,0.2);
    animation: ss-breathe 6s ease-in-out infinite;
    box-shadow: 0 0 60px rgba(140,160,190,0.08);
  }
  .ss-orb--open {
    background: radial-gradient(circle at 40% 35%, rgba(210,195,170,0.25), rgba(190,175,150,0.1));
    border: 1px solid rgba(210,195,170,0.35);
    animation: ss-breathe-open 4s ease-in-out infinite;
    box-shadow: 0 0 80px rgba(210,195,170,0.18);
    cursor: pointer;
  }
  .ss-orb--open:hover:not(.ss-orb--checked) { transform: scale(1.03); }
  .ss-orb--open.ss-orb--checked {
    animation: ss-breathe-present 5s ease-in-out infinite;
    box-shadow: 0 0 100px rgba(180,210,190,0.22);
    border-color: rgba(180,210,190,0.35); cursor: default;
    background: radial-gradient(circle at 40% 35%, rgba(180,210,190,0.22), rgba(160,190,170,0.08));
  }
  .ss-orb--closing {
    background: radial-gradient(circle at 40% 35%, rgba(140,160,190,0.12), rgba(120,140,170,0.05));
    border: 1px solid rgba(140,160,190,0.12);
    animation: ss-fade-out 2s ease forwards;
  }
  @keyframes ss-breathe { 0%,100%{transform:scale(1);opacity:.7} 50%{transform:scale(1.06);opacity:1} }
  @keyframes ss-breathe-open { 0%,100%{transform:scale(1);box-shadow:0 0 80px rgba(210,195,170,.18)} 50%{transform:scale(1.05);box-shadow:0 0 120px rgba(210,195,170,.28)} }
  @keyframes ss-breathe-present { 0%,100%{transform:scale(1);box-shadow:0 0 100px rgba(180,210,190,.22)} 50%{transform:scale(1.04);box-shadow:0 0 140px rgba(180,210,190,.32)} }
  @keyframes ss-fade-out { to{opacity:.3;transform:scale(.97)} }
 
  .ss-orb-inner { display:flex; align-items:center; justify-content:center; text-align:center; }
  .ss-orb-label { font-family:'Lora',serif; font-size:.9rem; font-style:italic; opacity:.5; line-height:1.5; letter-spacing:.02em; user-select:none; }
  .ss-orb-label--tap { font-size:1.4rem; font-style:normal; font-weight:500; opacity:.75; letter-spacing:-.01em; }
  .ss-orb-label--present { font-size:1rem; font-style:italic; opacity:.6; }
 
  .ss-timer-wrap { text-align:center; }
  .ss-timer { display:flex; flex-direction:column; align-items:center; gap:.3rem; }
  .ss-timer-label { font-size:.7rem; letter-spacing:.12em; text-transform:uppercase; opacity:.35; }
  .ss-timer-value { font-family:'Lora',serif; font-size:2.2rem; font-weight:400; letter-spacing:.04em; opacity:.7; }
  .ss-timer--closing .ss-timer-label { font-size:.85rem; font-family:'Lora',serif; font-style:italic; letter-spacing:.02em; text-transform:none; opacity:.45; }
 
  .ss-presence-wrap { display:flex; gap:2rem; align-items:center; justify-content:center; flex-wrap:wrap; }
  .ss-presence { display:flex; flex-direction:column; align-items:center; gap:.5rem; opacity:.2; transition:opacity 1.2s ease; }
  .ss-presence--arrived { opacity:1; }
  .ss-presence-dot { width:10px; height:10px; border-radius:50%; background:rgba(140,160,190,.5); transition:background 1.2s ease,box-shadow 1.2s ease; }
  .ss-presence--arrived .ss-presence-dot { background:rgba(180,210,190,.8); box-shadow:0 0 12px rgba(180,210,190,.4); }
  .ss-presence--arrived .ss-presence-dot--you { background:rgba(210,195,170,.9); box-shadow:0 0 12px rgba(210,195,170,.5); }
  .ss-presence-name { font-size:.72rem; letter-spacing:.08em; opacity:.55; }
 
  .ss-streak { display:flex; flex-direction:column; align-items:center; gap:.2rem; opacity:.4; }
  .ss-streak-num { font-family:'Lora',serif; font-size:1.6rem; font-weight:400; line-height:1; }
  .ss-streak-label { font-size:.65rem; letter-spacing:.1em; text-transform:uppercase; }
 
  .ss-note { font-size:.78rem; opacity:.35; text-align:center; line-height:1.7; white-space:pre-line; max-width:280px; margin:0; }
  .ss-error { text-align:center; padding:4rem 1.5rem; font-family:'Lora',serif; font-style:italic; opacity:.4; }
 
  @media (prefers-reduced-motion:reduce) { .ss-orb { animation:none !important; } }
`;
 
// ─── Group List Page ──────────────────────────────────────────────────────────
 
export function StillnessList() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newTime, setNewTime] = useState("08:00"); // local time input
  const [joinCode, setJoinCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
 
  const fetchGroups = useCallback(async () => {
    try {
      const res = await api.get("/stillness/groups/mine");
      setGroups(res.data);
    } catch {}
    finally { setLoading(false); }
  }, []);
 
  useEffect(() => { fetchGroups(); }, [fetchGroups]);
 
  async function handleCreate(e) {
    e.preventDefault();
    if (!newName.trim() || !newTime) return;
    setCreating(true);
    try {
      // Convert the user's local time to UTC before sending
      const utcTime = localTimeToUtc(newTime);
      const res = await api.post("/stillness/groups", {
        name: newName.trim(),
        daily_time_utc: utcTime,
      });
      setGroups(prev => [res.data, ...prev]);
      setNewName("");
      setNewTime("08:00");
      setShowCreate(false);
    } catch {}
    finally { setCreating(false); }
  }
 
  async function handleJoin(e) {
    e.preventDefault();
    const code = joinCode.trim().split("/").pop();
    if (!code) return;
    setJoining(true);
    try {
      const res = await api.post(`/stillness/join/${code}`);
      setGroups(prev => prev.find(g => g.id === res.data.id) ? prev : [res.data, ...prev]);
      setJoinCode("");
      navigate(`/stillness/${res.data.id}`);
    } catch {}
    finally { setJoining(false); }
  }
 
  async function handleDelete(e, group) {
    e.stopPropagation();
    if (!confirm(`Delete "${group.name}" for everyone?`)) return;
    try {
      await api.delete(`/stillness/groups/${group.id}`);
      setGroups(prev => prev.filter(g => g.id !== group.id));
    } catch {}
  }
 
  async function handleLeave(e, group) {
    e.stopPropagation();
    if (!confirm(`Remove "${group.name}" from your groups?`)) return;
    try {
      await api.delete(`/stillness/groups/${group.id}/leave`);
      setGroups(prev => prev.filter(g => g.id !== group.id));
    } catch {}
  }
 
  function copyInvite(e, group) {
    e.stopPropagation();
    navigator.clipboard.writeText(`${window.location.origin}/stillness/join/${group.invite_code}`);
    setCopiedId(group.id);
    setTimeout(() => setCopiedId(null), 2000);
  }
 
  function toggleExpanded(e, id) {
    e.stopPropagation();
    setExpandedId(prev => prev === id ? null : id);
  }
 
  return (
    <div className="ss-root">
      <style>{CSS}</style>
      <div className="ss-list">
        <div className="ss-list-header">
          <h1 className="ss-list-title">shared stillness</h1>
          <button className="ss-new-btn" onClick={() => setShowCreate(v => !v)}>
            {showCreate ? "cancel" : "+ new group"}
          </button>
        </div>
 
        {showCreate && (
          <form className="ss-create-form" onSubmit={handleCreate}>
            <div>
              <div className="ss-field-label">Group name</div>
              <input
                className="ss-input"
                placeholder="e.g. Family Moment"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                autoFocus
                maxLength={100}
              />
            </div>
            <div>
              <div className="ss-field-label">Daily moment — your local time</div>
              <input
                className="ss-input"
                type="time"
                value={newTime}
                onChange={e => setNewTime(e.target.value)}
              />
              <div className="ss-time-hint">
                This fires at the same UTC moment for everyone in the group.
                {newTime && ` Stored as ${localTimeToUtc(newTime)} UTC.`}
              </div>
            </div>
            <div className="ss-form-actions">
              <button className="ss-btn ss-btn--primary" type="submit" disabled={creating || !newName.trim()}>
                {creating ? "creating…" : "create group"}
              </button>
              <button className="ss-btn" type="button" onClick={() => setShowCreate(false)}>
                cancel
              </button>
            </div>
          </form>
        )}
 
        {loading ? (
          <div className="ss-empty">…</div>
        ) : groups.length === 0 && !showCreate ? (
          <div className="ss-empty">no groups yet — create one or join via invite</div>
        ) : (
          groups.map(group => (
            <div key={group.id}>
              <div className="ss-group-card" onClick={() => navigate(`/stillness/${group.id}`)}>
                <div className="ss-group-card-left">
                  <div className="ss-group-name-text">{group.name}</div>
                  <div className="ss-group-meta">
                    {group.member_count} {group.member_count === 1 ? "member" : "members"}
                    {group.daily_time_utc ? ` · ${formatLocalTime(group.daily_time_utc)}` : ""}
                    {group.is_owner ? " · you created this" : ""}
                  </div>
                </div>
                <div className="ss-group-actions">
                  <button
                    className="ss-btn"
                    style={{ fontSize: "0.7rem", padding: "0.3rem 0.75rem" }}
                    onClick={e => toggleExpanded(e, group.id)}
                  >
                    invite
                  </button>
                  {group.is_owner
                    ? <button className="ss-danger-btn" onClick={e => handleDelete(e, group)}>delete</button>
                    : <button className="ss-danger-btn" onClick={e => handleLeave(e, group)}>leave</button>
                  }
                </div>
              </div>
              {expandedId === group.id && (
                <div className="ss-invite-section">
                  <span className="ss-invite-code">
                    {window.location.origin}/stillness/join/{group.invite_code}
                  </span>
                  <button className="ss-copy-inline" onClick={e => copyInvite(e, group)}>
                    {copiedId === group.id ? "copied ✓" : "copy link"}
                  </button>
                </div>
              )}
            </div>
          ))
        )}
 
        <div className="ss-join-form">
          <div className="ss-join-label">join via invite link</div>
          <form className="ss-join-row" onSubmit={handleJoin}>
            <input
              className="ss-input"
              placeholder="paste invite link or code"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value)}
            />
            <button className="ss-btn ss-btn--primary" type="submit" disabled={joining} style={{ whiteSpace: "nowrap" }}>
              {joining ? "joining…" : "join"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
 
// ─── Session Page ─────────────────────────────────────────────────────────────
 
export function StillnessSession() {
  const { groupId } = useParams();
  const [session, setSession] = useState(null);
  const [groupInfo, setGroupInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // localCountdown ticks independently but is resynced from server on each poll/fetch
  const [localCountdown, setLocalCountdown] = useState(0);
  const [checkingIn, setCheckingIn] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [copied, setCopied] = useState(false);
  const [streak, setStreak] = useState(() =>
    parseInt(localStorage.getItem(`ss_streak_${groupId}`) || "0", 10)
  );
 
  const pollRef = useRef(null);
  const tickRef = useRef(null);
  const windowWasOpen = useRef(false);
 
  const fetchSession = useCallback(async () => {
    try {
      const [sessionRes, groupsRes] = await Promise.all([
        api.get(`/stillness/groups/${groupId}/session`),
        api.get("/stillness/groups/mine"),
      ]);
      const s = sessionRes.data;
      setSession(s);
      const g = groupsRes.data.find(g => String(g.id) === String(groupId));
      if (g) setGroupInfo(g);
      // Sync countdown from server — this is the source of truth
      setLocalCountdown(Math.floor(s.window_open ? s.seconds_remaining : s.seconds_until_open));
      setError(null);
    } catch {
      setError("Couldn't load this group. You may not be a member.");
    } finally {
      setLoading(false);
    }
  }, [groupId]);
 
  const pollPresence = useCallback(async () => {
    try {
      const res = await api.get(`/stillness/groups/${groupId}/presence`);
      setSession(prev => prev ? {
        ...prev,
        window_open: res.data.window_open,
        seconds_remaining: res.data.seconds_remaining,
        present_members: res.data.present_members,
        your_checkin: res.data.your_checkin,
      } : prev);
      // Resync countdown from server every poll to prevent drift
      if (res.data.seconds_remaining != null) {
        setLocalCountdown(Math.floor(res.data.seconds_remaining));
      }
      if (!res.data.window_open && windowWasOpen.current) {
        windowWasOpen.current = false;
        clearInterval(pollRef.current);
        pollRef.current = null;
        // Refetch full session to get countdown to next window
        setTimeout(fetchSession, 1500);
      }
    } catch {}
  }, [groupId, fetchSession]);
 
  // Local second tick — just for smooth display between polls
  useEffect(() => {
    tickRef.current = setInterval(() => {
      setLocalCountdown(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(tickRef.current);
  }, []);
 
  useEffect(() => { fetchSession(); }, [fetchSession]);
 
  // Start polling when window opens, stop when it closes
  useEffect(() => {
    if (session?.window_open && !pollRef.current) {
      windowWasOpen.current = true;
      pollRef.current = setInterval(pollPresence, 3000);
    }
    return () => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    };
  }, [session?.window_open, pollPresence]);
 
  async function handleCheckin() {
    if (!session?.window_open || session?.your_checkin || checkingIn) return;
    setCheckingIn(true);
    try {
      await api.post(`/stillness/groups/${groupId}/checkin`);
      const next = streak + 1;
      setStreak(next);
      localStorage.setItem(`ss_streak_${groupId}`, String(next));
      await pollPresence();
    } catch {}
    finally { setCheckingIn(false); }
  }
 
  function copyInvite() {
    if (!groupInfo) return;
    navigator.clipboard.writeText(`${window.location.origin}/stillness/join/${groupInfo.invite_code}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
 
  if (loading) return <div className="ss-root"><style>{CSS}</style><div className="ss-error">…</div></div>;
  if (error)   return <div className="ss-root"><style>{CSS}</style><div className="ss-error">{error}</div></div>;
 
  const phase = session?.window_open ? "open" : localCountdown === 0 ? "closing" : "waiting";
  const presentOthers = session?.present_members || [];
 
  return (
    <div className="ss-root">
      <style>{CSS}</style>
      <div className="ss-session-root">
        <header className="ss-session-header">
          <Link to="/stillness" className="ss-back">← groups</Link>
          <span className="ss-session-group-name">{groupInfo?.name || "…"}</span>
          <button className="ss-invite-toggle" onClick={() => setShowInvite(v => !v)}>invite</button>
        </header>
 
        {showInvite && groupInfo && (
          <div className="ss-session-invite">
            <p>Share this link to invite someone:</p>
            <div className="ss-session-invite-row">
              <span className="ss-session-invite-url">
                {window.location.origin}/stillness/join/{groupInfo.invite_code}
              </span>
              <button className="ss-copy-inline" style={{ opacity: 0.7 }} onClick={copyInvite}>
                {copied ? "copied ✓" : "copy link"}
              </button>
            </div>
          </div>
        )}
 
        <main className="ss-main">
          <div className="ss-orb-wrap">
            <div
              className={`ss-orb ss-orb--${phase} ${session?.your_checkin ? "ss-orb--checked" : ""}`}
              onClick={phase === "open" && !session?.your_checkin ? handleCheckin : undefined}
            >
              <div className="ss-orb-inner">
                {phase === "waiting" && <span className="ss-orb-label">stillness<br/>approaching</span>}
                {phase === "open" && !session?.your_checkin && <span className="ss-orb-label ss-orb-label--tap">I'm<br/>here</span>}
                {phase === "open" && session?.your_checkin && <span className="ss-orb-label ss-orb-label--present">present</span>}
                {phase === "closing" && <span className="ss-orb-label">until<br/>next time</span>}
              </div>
            </div>
          </div>
 
          {/* Show the scheduled local time during waiting phase */}
          {phase === "waiting" && groupInfo?.daily_time_utc && (
            <div className="ss-scheduled-time">
              daily at {formatLocalTime(groupInfo.daily_time_utc)}
            </div>
          )}
 
          <div className="ss-timer-wrap">
            {phase === "waiting" && (
              <div className="ss-timer">
                <span className="ss-timer-label">next moment in</span>
                <span className="ss-timer-value">{formatCountdown(localCountdown)}</span>
              </div>
            )}
            {phase === "open" && (
              <div className="ss-timer">
                <span className="ss-timer-label">window closes in</span>
                <span className="ss-timer-value">{formatCountdown(localCountdown)}</span>
              </div>
            )}
            {phase === "closing" && (
              <div className="ss-timer ss-timer--closing">
                <span className="ss-timer-label">see you next time</span>
              </div>
            )}
          </div>
 
          <div className="ss-presence-wrap">
  {session?.present_members?.length === 0 && (
    <div className="ss-presence">
      <div className="ss-presence-dot ss-presence-dot--you" />
      <span className="ss-presence-name">waiting…</span>
    </div>
  )}
  {(session?.present_members || []).map((m, i) => (
    <div key={m.id} className="ss-presence ss-presence--arrived" style={{ transitionDelay: `${i * 300}ms` }}>
      <div className="ss-presence-dot" />
      <span className="ss-presence-name">{m.display_name}</span>
    </div>
  ))}
</div>

 
          {streak > 0 && (
            <div className="ss-streak">
              <span className="ss-streak-num">{streak}</span>
              <span className="ss-streak-label">{streak === 1 ? "moment shared" : "moments shared"}</span>
            </div>
          )}
 
          {phase === "waiting" && <p className="ss-note">When the moment arrives, open the app and tap the circle.{"\n"}No pressure if you miss one.</p>}
          {phase === "open" && !session?.your_checkin && <p className="ss-note">Tap the circle to show you're here.</p>}
          {phase === "open" && session?.your_checkin && <p className="ss-note">You're here. Breathe.</p>}
        </main>
      </div>
    </div>
  );
}
 
// ─── Join via invite link ─────────────────────────────────────────────────────
 
export function StillnessJoin() {
  const { inviteCode } = useParams();
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const [joinStatus, setJoinStatus] = useState("joining");
 
  useEffect(() => {
    if (!isLoggedIn) {
      navigate(`/login?next=/stillness/join/${inviteCode}`);
      return;
    }
    api.post(`/stillness/join/${inviteCode}`)
      .then(res => navigate(`/stillness/${res.data.id}`, { replace: true }))
      .catch(() => setJoinStatus("error"));
  }, [inviteCode, isLoggedIn]);
 
  return (
    <div className="ss-root">
      <style>{CSS}</style>
      <div className="ss-error">
        {joinStatus === "joining" ? "joining group…" : "invite link not found or expired."}
      </div>
    </div>
  );
}