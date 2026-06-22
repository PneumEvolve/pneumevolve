// src/lib/slalomLeaderboard.js
//
// Shared helpers so the in-game leaderboard prompt (FreeskateSlalom.jsx)
// and the "you just logged in, let's finish that submission" resume flow
// (SlalomLobby.jsx) don't duplicate the same login/name/submit logic.
//
// Why this exists: clicking "log in" from the game-over screen navigates
// to a different route entirely, which unmounts FreeskateSlalom and throws
// away that run's score — it only ever lived in component state. The fix
// is to stash the score in localStorage right before navigating away, then
// pick it back up (from wherever the player lands after logging in) and
// submit it then.

import { api } from "@/lib/api";

export const LEADERBOARD_API = "/slalom/leaderboard";
// NOTE: assumes the auth router is mounted at /auth (matches /auth/login,
// /auth/refresh already used in lib/api.ts) — double check against your
// main.py and adjust both of these if needed.
export const ACCOUNT_ME = "/auth/account/me";
export const ACCOUNT_USERNAME = "/auth/account/username";

const PENDING_KEY = "slalom_pending_score";
const PENDING_MAX_AGE_MS = 24 * 60 * 60 * 1000; // give up on a stale pending score after 24h

// ── Pending-score persistence ───────────────────────────────────────────────

export function savePendingScore({ lbMode, gates, gems, durationMs, roomId = null }) {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify({
      lbMode, gates, gems, durationMs, roomId,
      savedAt: Date.now(),
    }));
  } catch {}
}

export function loadPendingScore() {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.savedAt || Date.now() - parsed.savedAt > PENDING_MAX_AGE_MS) {
      localStorage.removeItem(PENDING_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingScore() {
  try { localStorage.removeItem(PENDING_KEY); } catch {}
}

// ── Leaderboard API calls ───────────────────────────────────────────────────

export async function fetchLeaderboardEntries(lbMode, limit = 20) {
  const { data } = await api.get(LEADERBOARD_API, { params: { mode: lbMode, limit } });
  return data?.entries || [];
}

export function qualifiesForLeaderboard(entries, gates, gems) {
  const last = entries[entries.length - 1];
  return entries.length < 20 || !last
    || gates > last.gates_passed
    || (gates === last.gates_passed && gems > last.gems);
}

export async function submitScoreToLeaderboard({ lbMode, gates, gems, durationMs, roomId = null }) {
  return api.post(LEADERBOARD_API, {
    mode: lbMode,
    gates_passed: gates,
    gems,
    duration_ms: durationMs,
    ...(lbMode === "coop" && roomId ? { room_id: roomId } : {}),
  });
}

export async function fetchMyUsername() {
  const { data } = await api.get(ACCOUNT_ME);
  return data?.username || null;
}

export async function setMyUsername(username) {
  await api.put(ACCOUNT_USERNAME, { username });
}