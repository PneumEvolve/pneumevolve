// src/Pages/Slalom/FreeskateSlalom.jsx
//
// Multiplayer model:
//   P1 owns the game loop. Broadcasts game_state to P2 at ~20fps.
//   P2 receives game_state and renders it. Only sends p2_input (angle) back to P1.
//   Solo mode (no roomId) works identically to before — both skates on keyboard.
//
// Changes:
//   - Gate: each skate is checked independently at the moment ITS OWN row crosses
//     the gate line (top skate first, bottom skate later). Passes only if both
//     clear it; fails as soon as either one doesn't.
//   - Easier start: gates wider + slower speed ramp at the beginning
//   - Mobile controls: touch L/R buttons wired into keysRef
//   - P2 lag: client-side prediction extrapolates skate positions between server frames
//   - Leaderboard: on game over, checks whether the run qualifies for the
//     solo/coop leaderboard, then either auto-submits (already has a
//     username), prompts once for a name, or nudges a logged-out player to
//     log in. See the "Leaderboard" section below.
//   - Bugfix: P2's React `gameOver` state never flipped to true before (only
//     the ref-backed s.gameOver did), so P2 never saw a leaderboard check AND
//     never got the "GO AGAIN" touch button. Fixed by calling setGameOver()
//     from the onGameState/onGameOver handlers, and resetting it on restart.
//   - Practice mode now actually has no lives: wipeouts and missed gates
//     still happen (and still show visually) but no longer increment misses
//     or trigger game over. The 3-dot miss indicator is hidden in practice
//     since there's nothing for it to track.
//   - Bugfix: clicking "log in" from the leaderboard nudge navigated away
//     and unmounted this component, silently losing the qualifying score.
//     Now it's stashed via savePendingScore() (src/lib/slalomLeaderboard.js)
//     before navigating, and SlalomLobby resumes the submission once a
//     token actually exists.

import { useEffect, useRef, useState, useCallback } from "react";
import { useSlalomRoom } from "@/lib/useSlalomRoom";
import { api } from "@/lib/api";
import { Link } from "react-router-dom";
import {
  fetchLeaderboardEntries,
  qualifiesForLeaderboard,
  submitScoreToLeaderboard,
  fetchMyUsername,
  setMyUsername,
  savePendingScore,
  clearPendingScore,
} from "@/lib/slalomLeaderboard";

const CANVAS_W = 480;
const CANVAS_H = 700;
const BASE_SPEED = 2.5;           // slightly slower start
const MAX_SPREAD = 130;
const MAX_ANGLE = Math.PI / 3;
const GATE_WIDTH = 100;           // wider gates (was 80)
const SKATE_SPREAD = 55;
const BROADCAST_EVERY = 2;        // broadcast every 2 frames (~30fps) instead of 3

// ─── Drawing helpers ──────────────────────────────────────────────────────────

function drawCharacter(ctx, cx, cy, topSkateX, botSkateX) {
  const forkX = cx + 30, forkY = cy;
  const headX = forkX - 72;
  ctx.strokeStyle = "#e8e0d0"; ctx.lineWidth = 3; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(headX + 15, forkY); ctx.lineTo(forkX, forkY); ctx.stroke();
  ctx.beginPath(); ctx.arc(headX, forkY, 15, 0, Math.PI * 2);
  ctx.fillStyle = "#1a1a2e"; ctx.fill();
  ctx.strokeStyle = "#e8e0d0"; ctx.lineWidth = 2.5; ctx.stroke();
  const armX = forkX - 38;
  ctx.beginPath(); ctx.moveTo(armX, forkY - 20); ctx.lineTo(armX, forkY + 20);
  ctx.strokeStyle = "#e8e0d0"; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(forkX, forkY); ctx.lineTo(topSkateX, cy - SKATE_SPREAD);
  ctx.strokeStyle = "#e8e0d0"; ctx.lineWidth = 3; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(forkX, forkY); ctx.lineTo(botSkateX, cy + SKATE_SPREAD);
  ctx.strokeStyle = "#e8e0d0"; ctx.lineWidth = 3; ctx.stroke();
}

function drawSkate(ctx, x, y, angle, color, glowColor) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
  ctx.shadowColor = glowColor; ctx.shadowBlur = 14;
  ctx.beginPath(); ctx.ellipse(0, 0, 6, 14, 0, 0, Math.PI * 2);
  ctx.fillStyle = color; ctx.fill();
  ctx.strokeStyle = "#ffffff55"; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.shadowBlur = 0; ctx.restore();
}

function drawCarveTrail(ctx, points, color) {
  if (points.length < 2) return;
  ctx.save(); ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.setLineDash([5, 6]);
  for (let i = 1; i < points.length; i++) {
    ctx.strokeStyle = color;
    ctx.globalAlpha = (i / points.length) * 0.7;
    ctx.beginPath();
    ctx.moveTo(points[i-1].x, points[i-1].y);
    ctx.lineTo(points[i].x, points[i].y);
    ctx.stroke();
  }
  ctx.setLineDash([]); ctx.globalAlpha = 1; ctx.restore();
}

function drawGate(ctx, gate, screenY) {
  if (screenY < -30 || screenY > CANVAS_H + 30) return;
  const cx = gate.cx, half = GATE_WIDTH / 2;
  const x1 = cx - half, x2 = cx + half;
  let color, alpha, lineW;
  if (gate.missed)       { color = "#ff3333"; alpha = 0.6; lineW = 2; }
  else if (gate.passed)  { color = "#44ff88"; alpha = 0.3; lineW = 1.5; }
  else                   { color = "#ffdd44"; alpha = 1;   lineW = 2.5; }
  ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = lineW;
  ctx.shadowColor = (!gate.passed && !gate.missed) ? "#ffdd44" : "transparent";
  ctx.shadowBlur  = (!gate.passed && !gate.missed) ? 10 : 0;
  ctx.beginPath(); ctx.moveTo(x1, screenY); ctx.lineTo(Math.max(10, x1 - 40), screenY); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x2, screenY); ctx.lineTo(Math.min(CANVAS_W-10, x2 + 40), screenY); ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(x1, screenY, 7, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(x2, screenY, 7, 0, Math.PI*2); ctx.fill();
  ctx.shadowBlur = 0; ctx.globalAlpha = 1;
}

function drawGem(ctx, gem, screenY) {
  if (screenY < -20 || screenY > CANVAS_H + 20 || gem.collected) return;
  ctx.save(); ctx.translate(gem.x, screenY);
  ctx.rotate((Date.now() / 600) % (Math.PI * 2));
  ctx.shadowColor = gem.color; ctx.shadowBlur = 12;
  ctx.fillStyle = gem.color; ctx.strokeStyle = "#ffffffaa"; ctx.lineWidth = 1;
  const s = 9;
  ctx.beginPath();
  ctx.moveTo(0,-s); ctx.lineTo(s*0.6,0); ctx.lineTo(0,s); ctx.lineTo(-s*0.6,0);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.shadowBlur = 0; ctx.restore();
}

function drawMisses(ctx, misses) {
  for (let i = 0; i < 3; i++) {
    const x = CANVAS_W - 20 - i * 22, y = 28;
    ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI*2);
    if (i < misses) { ctx.fillStyle="#ff3333"; ctx.shadowColor="#ff3333"; ctx.shadowBlur=8; }
    else            { ctx.fillStyle="#ffffff22"; ctx.shadowBlur=0; }
    ctx.fill(); ctx.shadowBlur=0;
  }
}

function drawSpreadBar(ctx, spread) {
  const ratio = Math.min(spread / MAX_SPREAD, 1);
  const bw=180, bh=7, bx=(CANVAS_W-bw)/2, by=CANVAS_H-22;
  ctx.fillStyle="#ffffff10"; ctx.beginPath(); ctx.roundRect(bx,by,bw,bh,4); ctx.fill();
  const col = ratio<0.5?"#44ff88":ratio<0.8?"#ffaa22":"#ff4444";
  ctx.fillStyle=col; ctx.shadowColor=col; ctx.shadowBlur=5;
  ctx.beginPath(); ctx.roundRect(bx,by,bw*ratio,bh,4); ctx.fill();
  ctx.shadowBlur=0; ctx.fillStyle="#ffffff33";
  ctx.font="9px monospace"; ctx.textAlign="center";
  ctx.fillText("SPREAD", CANVAS_W/2, by-3);
}

function rand(min, max) { return min + Math.random()*(max-min); }

function generateChunk(startDist, count, prevCx = null) {
  const items = [];
  let d = startDist;
  let lastCx = prevCx ?? (CANVAS_W / 2);
  const MAX_GATE_DRIFT = 150; // max horizontal jump between consecutive gates
  for (let i = 0; i < count; i++) {
    const spacing = rand(240, 340);  // slightly more spacing (was 220-320)
    d += spacing;
    const minCx = Math.max(GATE_WIDTH/2+40, lastCx - MAX_GATE_DRIFT);
    const maxCx = Math.min(CANVAS_W-GATE_WIDTH/2-40, lastCx + MAX_GATE_DRIFT);
    const cx = rand(minCx, maxCx);
    lastCx = cx;
    items.push({
      type:"gate", worldDist:d, cx, passed:false, missed:false, id:Math.random(),
      // Each skate is checked independently, at the moment ITS row reaches the gate line
      // (top skate's row arrives first, bottom skate's row arrives later).
      topChecked:false, topOk:null,
      botChecked:false, botOk:null,
    });
    const gemCount = Math.floor(rand(0,3));
    for (let g = 0; g < gemCount; g++) {
      const colors = ["#44eeff","#ff44cc","#aaff44","#ffaa22","#aa88ff"];
      items.push({
        type:"gem", worldDist:d+rand(40,spacing*0.8),
        x:rand(30,CANVAS_W-30),
        color:colors[Math.floor(rand(0,colors.length))],
        collected:false, id:Math.random(),
      });
    }
  }
  return items;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function FreeskateSlalom({ roomId = null, role = null, roomData = null, mode = "solo" }) {
  const canvasRef   = useRef(null);
  const sRef        = useRef(null);
  const keysRef     = useRef({});
  const animRef     = useRef(null);
  const frameRef    = useRef(0);
  const p2AngleRef  = useRef(0);

  // P2 client-side prediction: store last received server state + timestamp
  const p2LastServerRef = useRef(null); // { state, receivedAt }

  const [gems, setGems]         = useState(0);
  const [misses, setMisses]     = useState(0);
  const [gatesPassed, setGatesPassed] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [p2Ready, setP2Ready]   = useState(false);
  // solo: both skates ready immediately
  // P1 multiplayer: waits for onPlayerReady (P2 joining)
  // P2 multiplayer: ready immediately — P2 is by definition present
  const [bothReady, setBothReady] = useState(!roomId || role === "p2");

  // Hi-score persists via localStorage across sessions.
  // { gates, gems } — gates is primary sort key, gems is tiebreaker.
  const hiScoreRef = useRef(null);
  // Load from localStorage once on mount (useRef init runs only once)
  if (hiScoreRef.current === null) {
    try {
      const saved = localStorage.getItem("slalom_hiscore");
      if (saved) hiScoreRef.current = JSON.parse(saved);
    } catch {}
  }
  const newBestRef = useRef(false);  // true on the game-over screen when a new best was just set

  // Tracks how many gem milestones (multiples of 10) have been cashed in this run.
  // Each milestone removes 1 miss and triggers a brief flash.
  const gemMilestoneRef = useRef(0);
  const missEraseFlashRef = useRef(0); // countdown frames for the "miss erased" flash
  const inputLockRef = useRef(0);      // countdown frames during which skate input is ignored (post-wipeout / restart)

  // ── Leaderboard ──────────────────────────────────────────────────────────────
  // idle | checking | none | needs_login | needs_name | submitted | error
  const [lbStatus, setLbStatus] = useState("idle");
  const lbStatusRef = useRef("idle");
  useEffect(() => { lbStatusRef.current = lbStatus; }, [lbStatus]);
  const [nameInput, setNameInput] = useState("");
  const [nameError, setNameError] = useState(null);
  const pendingSubmitRef = useRef(null);
  const scoreCheckedRef = useRef(false);  // guards against re-checking every frame while gameOver stays true
  const runStartRef = useRef(Date.now());

  const isMultiplayer = !!roomId;
  const isP1 = !isMultiplayer || role === "p1";
  const isP2 = isMultiplayer && role === "p2";

  const PLAYER_CY       = CANVAS_H * 0.80;
  const PLAYER_CX_BASE  = CANVAS_W / 2 + 20;

  const mkState = useCallback(() => ({
    cx: PLAYER_CX_BASE, cy: PLAYER_CY,
    topSkate: { x: PLAYER_CX_BASE, angle:0, vx:0 },
    botSkate: { x: PLAYER_CX_BASE, angle:0, vx:0 },
    topTrail: [], botTrail: [],
    dist: 0, speed: BASE_SPEED,
    items: generateChunk(200, 40),
    gems: 0, misses: 0, gatesPassed: 0,
    wipeout: false, wipeoutTimer: 0,
    gameOver: false,
  }), [PLAYER_CX_BASE, PLAYER_CY]);

  // Submit a run to the leaderboard. Called either immediately (player
  // already has a username) or after the one-time name prompt is filled in.
  const submitScore = useCallback(async (lbMode, gatesPassedVal, gemsVal, durationMs) => {
    try {
      await submitScoreToLeaderboard({
        lbMode, gates: gatesPassedVal, gems: gemsVal, durationMs,
        roomId: roomData?.id ?? null,
      });
      clearPendingScore(); // in case a stale one from a previous session was sitting around
      setLbStatus("submitted");
    } catch {
      setLbStatus("error");
    }
  }, [roomData]);

  // Runs once per finished run (guarded by scoreCheckedRef). Decides whether
  // this score is good enough to matter, then routes to auto-submit / name
  // prompt / login nudge accordingly.
  const checkLeaderboardQualification = useCallback(async () => {
    if (scoreCheckedRef.current) return;
    scoreCheckedRef.current = true;
    if (mode === "practice") return; // practice runs never hit the leaderboard

    const lbMode = isMultiplayer ? "coop" : "solo";
    const s = sRef.current;
    if (!s) return;
    const gatesPassedVal = s.gatesPassed;
    const gemsVal = s.gems;
    const durationMs = Date.now() - runStartRef.current;

    setLbStatus("checking");
    try {
      const entries = await fetchLeaderboardEntries(lbMode);
      if (!qualifiesForLeaderboard(entries, gatesPassedVal, gemsVal)) { setLbStatus("none"); return; }

      const token = localStorage.getItem("access_token");
      if (!token) {
        // Stash it — clicking "log in" below navigates to a different route
        // and unmounts this whole component, so this score would otherwise
        // just be lost. SlalomLobby picks it back up once a token exists.
        savePendingScore({
          lbMode, gates: gatesPassedVal, gems: gemsVal, durationMs,
          roomId: roomData?.id ?? null,
        });
        setLbStatus("needs_login");
        return;
      }

      const username = await fetchMyUsername();
      if (username) {
        await submitScore(lbMode, gatesPassedVal, gemsVal, durationMs);
      } else {
        // First-time-ever case: no username yet. Ask once, then submit.
        pendingSubmitRef.current = { lbMode, gates: gatesPassedVal, gems: gemsVal, durationMs };
        setNameInput("");
        setNameError(null);
        setLbStatus("needs_name");
      }
    } catch {
      setLbStatus("error");
    }
  }, [mode, isMultiplayer, roomData, submitScore]);

  const handleNameSubmit = useCallback(async () => {
    const name = nameInput.trim();
    if (!name) return;
    try {
      await setMyUsername(name);
    } catch (e) {
      setNameError(e?.response?.data?.detail || "That name didn't work — try another.");
      return;
    }
    const p = pendingSubmitRef.current;
    setLbStatus("idle");
    if (p) await submitScore(p.lbMode, p.gates, p.gems, p.durationMs);
  }, [nameInput, submitScore]);

  // ── Supabase room ──────────────────────────────────────────────────────────
  const { sendP2Input, sendGameState, sendGameOver, sendRestart, sendPlayerReady } = useSlalomRoom(
    roomId,
    {
      onP2Input: ({ angle }) => {
        p2AngleRef.current = angle;
      },

      // P2 receives game state — lerp skate positions for smooth motion
      onGameState: (state) => {
        if (!isP2) return;
        const s = sRef.current;
        if (!s) return;

        // Compute velocity from delta between consecutive server packets (for prediction)
        const prev = p2LastServerRef.current;
        const now = performance.now();
        const dt = prev ? Math.max(1, now - prev.receivedAt) : 33;
        const topVx = prev ? (state.topSkate.x - prev.state.topSkate.x) / (dt / 16.67) : 0;
        const botVx = prev ? (state.botSkate.x - prev.state.botSkate.x) / (dt / 16.67) : 0;
        p2LastServerRef.current = { state, receivedAt: now };

        // Items: only overwrite when P1 sends a diff (on mutations)
        if (state.items !== undefined) s.items = state.items;

        // Scalar authoritative fields
        s.gems      = state.gems;
        s.misses    = state.misses;
        s.speed     = state.speed;
        s.wipeout   = state.wipeout;
        s.gameOver  = state.gameOver;
        s.gatesPassed = state.gatesPassed ?? s.gatesPassed;

        // BUGFIX: mirror game-over into React state too, not just the ref.
        // Without this, P2 never saw the GO AGAIN button and the new
        // leaderboard check (which watches the `gameOver` state) never ran.
        if (state.gameOver) setGameOver(true);

        // Smooth dist: only snap if we've drifted more than 0.5s of speed
        const distDelta = state.dist - s.dist;
        if (Math.abs(distDelta) > s.speed * 30) {
          s.dist = state.dist; // large drift — hard snap
        } else {
          s.dist += distDelta * 0.2; // gentle correction
        }

        // Store target positions; prediction loop will lerp toward them
        s._topTarget = { x: state.topSkate.x, angle: state.topSkate.angle, vx: topVx };
        s._botTarget = { x: state.botSkate.x, angle: state.botSkate.angle, vx: botVx };
        // Ensure current positions exist if this is first packet
        if (!s.topSkate.vx) s.topSkate = { ...s._topTarget };
        if (!s.botSkate.vx) s.botSkate = { ...s._botTarget };

        s.cx = state.cx;
        setGems(state.gems);
        setMisses(state.misses);
      },

      onGameOver: ({ final_gems }) => {
        const s = sRef.current;
        if (s) { s.gameOver = true; s.gems = final_gems; }
        setGems(final_gems);
        setGameOver(true); // BUGFIX: see note in onGameState above
      },

      onRestart: () => {
        sRef.current = mkState();
        p2LastServerRef.current = null;
        gemMilestoneRef.current = 0;
        missEraseFlashRef.current = 0;
        runStartRef.current = Date.now();
        scoreCheckedRef.current = false;
        setLbStatus("idle");
        setGems(0); setMisses(0); setGatesPassed(0);
        setGameOver(false); // BUGFIX: this was missing, so once fixed-above
                             // gameOver could flip true it would've stuck forever
      },

      onPlayerReady: () => {
        setP2Ready(true);
        setBothReady(true); // P1 fast path: realtime beat the poll
      },
    }
  );

  useEffect(() => {
    sRef.current = mkState();
    runStartRef.current = Date.now();
    scoreCheckedRef.current = false;
  }, [mkState]);

  // P1: poll room status as a guaranteed fallback for when the realtime
  // player_ready message is lost (fires before both sides are subscribed).
  const bothReadyRef = useRef(!roomId || role === "p2");
  useEffect(() => {
    if (!isP1 || !roomId || !isMultiplayer) return;
    const interval = setInterval(async () => {
      if (bothReadyRef.current) { clearInterval(interval); return; }
      try {
        const { data } = await api.get(`/slalom/rooms/${roomId}`);
        if (data.status === "active") {
          bothReadyRef.current = true;
          setP2Ready(true);
          setBothReady(true);
          clearInterval(interval);
        }
      } catch {}
    }, 1000);
    return () => clearInterval(interval);
  }, [isP1, roomId, isMultiplayer]);

  // Keep bothReadyRef in sync with state (for the realtime fast path)
  useEffect(() => { bothReadyRef.current = bothReady; }, [bothReady]);

  useEffect(() => {
    if (isP2) sendPlayerReady();
  }, [isP2, sendPlayerReady]);

  useEffect(() => {
    const down = (e) => {
      keysRef.current[e.key] = true;
      if (["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(e.key)) e.preventDefault();
    };
    const up = (e) => { keysRef.current[e.key] = false; };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  // Trigger a leaderboard qualification check exactly once per run, right
  // when gameOver flips true (works for P1 directly, and for P2 thanks to
  // the setGameOver() bugfixes above).
  useEffect(() => {
    if (gameOver) checkLeaderboardQualification();
  }, [gameOver, checkLeaderboardQualification]);

  // ── Game loop ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    const loop = () => {
      const s = sRef.current;
      if (!s) { animRef.current = requestAnimationFrame(loop); return; }
      const k = keysRef.current;
      frameRef.current++;

      // ── P2: send angle + client-side prediction ─────────────────────────
      if (isP2) {
        let angle = p2AngleRef.current;
        if (k["ArrowLeft"])  angle = Math.max(angle - 0.04, -MAX_ANGLE);
        if (k["ArrowRight"]) angle = Math.min(angle + 0.04,  MAX_ANGLE);
        // Only send when angle changed or every 2 frames (avoid flooding)
        if (angle !== p2AngleRef.current || frameRef.current % 2 === 0) {
          p2AngleRef.current = angle;
          if (isMultiplayer) sendP2Input(angle);
        } else {
          p2AngleRef.current = angle;
        }

        if (!s.wipeout && !s.gameOver) {
          // Advance dist locally so scroll is smooth
          if (s.speed) s.dist += s.speed;

          // Lerp skate positions toward latest server target (smooth, no snapping)
          // Falls back to velocity extrapolation when no target yet
          const LERP = 0.35; // how aggressively to pull toward server position each frame
          if (s._topTarget) {
            s.topSkate.x += (s._topTarget.x - s.topSkate.x) * LERP;
            s.topSkate.angle += (s._topTarget.angle - s.topSkate.angle) * LERP;
          } else if (s.topSkate.vx) {
            s.topSkate.x = Math.max(30, Math.min(CANVAS_W-30, s.topSkate.x + s.topSkate.vx));
          }
          if (s._botTarget) {
            s.botSkate.x += (s._botTarget.x - s.botSkate.x) * LERP;
            s.botSkate.angle += (s._botTarget.angle - s.botSkate.angle) * LERP;
          } else if (s.botSkate.vx) {
            s.botSkate.x = Math.max(30, Math.min(CANVAS_W-30, s.botSkate.x + s.botSkate.vx));
          }

          s.cx = (s.topSkate.x + s.botSkate.x) / 2 - 10;

          // P2 builds its own trails locally — never received from P1
          s.topTrail = s.topTrail || [];
          s.botTrail = s.botTrail || [];
          for (const pt of s.topTrail) pt.y += s.speed || BASE_SPEED;
          for (const pt of s.botTrail) pt.y += s.speed || BASE_SPEED;
          s.topTrail.push({ x: s.topSkate.x, y: s.cy - SKATE_SPREAD });
          s.botTrail.push({ x: s.botSkate.x, y: s.cy + SKATE_SPREAD });
          s.topTrail = s.topTrail.filter(pt => pt.y < CANVAS_H + 20);
          s.botTrail = s.botTrail.filter(pt => pt.y < CANVAS_H + 20);
          if (s.topTrail.length > 80) s.topTrail.shift();
          if (s.botTrail.length > 80) s.botTrail.shift();
        }
      }

      // ── P1 / solo: own the game loop ────────────────────────────────────
      if (isP1 && !s.wipeout && !s.gameOver && bothReady) {
        // Speed ramp: slower start, gentler curve
        const speed = BASE_SPEED + Math.min(s.dist / 6000, 2.5);
        s.speed = speed;

        // Tick down input lock (set after wipeout recovery and restart)
        if (inputLockRef.current > 0) inputLockRef.current--;
        const inputLocked = inputLockRef.current > 0;

        if (!inputLocked) {
          if (k["a"]||k["A"]) s.topSkate.angle = Math.max(s.topSkate.angle - 0.04, -MAX_ANGLE);
          if (k["d"]||k["D"]) s.topSkate.angle = Math.min(s.topSkate.angle + 0.04,  MAX_ANGLE);
        }

        const botAngle = isMultiplayer
          ? p2AngleRef.current
          : (() => {
              if (!inputLocked) {
                if (k["ArrowLeft"])  s.botSkate.angle = Math.max(s.botSkate.angle - 0.04, -MAX_ANGLE);
                if (k["ArrowRight"]) s.botSkate.angle = Math.min(s.botSkate.angle + 0.04,  MAX_ANGLE);
              }
              return s.botSkate.angle;
            })();
        s.botSkate.angle = botAngle;

        const prevTopX = s.topSkate.x;
        const prevBotX = s.botSkate.x;

        s.topSkate.x += Math.sin(s.topSkate.angle) * 3.5;
        s.botSkate.x += Math.sin(s.botSkate.angle) * 3.5;
        s.topSkate.x = Math.max(30, Math.min(CANVAS_W-30, s.topSkate.x));
        s.botSkate.x = Math.max(30, Math.min(CANVAS_W-30, s.botSkate.x));

        // Store per-frame velocity for P2 prediction
        s.topSkate.vx = s.topSkate.x - prevTopX;
        s.botSkate.vx = s.botSkate.x - prevBotX;

        s.cx = (s.topSkate.x + s.botSkate.x) / 2 - 10;
        s.dist += speed;

        for (const pt of s.topTrail) pt.y += speed;
        for (const pt of s.botTrail) pt.y += speed;
        s.topTrail.push({ x: s.topSkate.x, y: s.cy - SKATE_SPREAD });
        s.botTrail.push({ x: s.botSkate.x, y: s.cy + SKATE_SPREAD });
        s.topTrail = s.topTrail.filter(pt => pt.y < CANVAS_H+20);
        s.botTrail = s.botTrail.filter(pt => pt.y < CANVAS_H+20);
        if (s.topTrail.length > 80) s.topTrail.shift();
        if (s.botTrail.length > 80) s.botTrail.shift();

        if (Math.abs(s.topSkate.x - s.botSkate.x) > MAX_SPREAD) {
  s.wipeout = true; s.wipeoutTimer = 90;

  // Practice mode: wipeouts still interrupt the run (you feel it), but
  // they're free — no lives, no game over, ever.
  if (mode !== "practice") {
    s.misses += 1;
    setMisses(s.misses);
    if (s.misses >= 3) {
      s.gameOver = true;
      setGameOver(true);
      const prev = hiScoreRef.current;
      const isNewBest = !prev
        || s.gatesPassed > prev.gates
        || (s.gatesPassed === prev.gates && s.gems > prev.gems);
      if (isNewBest) {
        hiScoreRef.current = { gates: s.gatesPassed, gems: s.gems };
        newBestRef.current = true;
        try { localStorage.setItem("slalom_hiscore", JSON.stringify(hiScoreRef.current)); } catch {}
      } else {
        newBestRef.current = false;
      }
      if (isMultiplayer) {
        sendGameOver(s.gems);
        api.patch(`/slalom/rooms/${roomData.id}`, { final_gems: s.gems }).catch(()=>{});
      }
    }
  }

  // Reset angles immediately so recovery isn't a chain wipeout
  s.topSkate.angle = 0; s.botSkate.angle = 0;
  s.topSkate.vx = 0;   s.botSkate.vx = 0;
  const nextGate = s.items.find(i => i.type === "gate" && !i.passed && !i.missed && i.worldDist > s.dist);
  const snapX = nextGate ? nextGate.cx : s.cx;
  s.cx = snapX;
  s.topSkate.x = snapX; s.botSkate.x = snapX;
  s.topTrail = []; s.botTrail = [];
  p2AngleRef.current = 0;
  keysRef.current = {};  // drop any held keys so input lock isn't immediately bypassed
  inputLockRef.current = 40; // ignore input for ~0.7s after wipeout clears
}

        const half = GATE_WIDTH / 2;
        for (const item of s.items) {
          const screenY = s.cy - (item.worldDist - s.dist);
          if (item.type === "gate" && !item.passed && !item.missed) {
            // Each skate is evaluated independently, at the moment ITS OWN row
            // reaches the gate line — not when the player's center does.
            // Top skate's row reaches the gate first; bottom skate's row reaches it later.
            const topTarget = item.worldDist - SKATE_SPREAD;
            const botTarget = item.worldDist + SKATE_SPREAD;

            if (!item.topChecked && Math.abs(topTarget - s.dist) < 18) {
              item.topChecked = true;
              item.topOk = s.topSkate.x >= item.cx - half && s.topSkate.x <= item.cx + half;
            }
            if (!item.botChecked && Math.abs(botTarget - s.dist) < 18) {
              item.botChecked = true;
              item.botOk = s.botSkate.x >= item.cx - half && s.botSkate.x <= item.cx + half;
            }

            // Fail as soon as either skate is known to have missed — no need to wait
            // for the other skate's check. Pass only once BOTH have individually cleared.
            const failed = (item.topChecked && !item.topOk) || (item.botChecked && !item.botOk);
            const clearedBoth = item.topChecked && item.botChecked && item.topOk && item.botOk;

            if (failed) {
              item.missed = true;
              s._itemDirty = true;
              // Practice mode: still mark the gate as missed for visual
              // feedback, but it's free — no lives, no game over.
              if (mode !== "practice") {
                s.misses += 1;
                setMisses(s.misses);
                if (s.misses >= 3) {
                  s.gameOver = true;
                  setGameOver(true);
                  // Update session hi-score
                  const prev = hiScoreRef.current;
                  const isNewBest = !prev
                    || s.gatesPassed > prev.gates
                    || (s.gatesPassed === prev.gates && s.gems > prev.gems);
                  if (isNewBest) {
                    hiScoreRef.current = { gates: s.gatesPassed, gems: s.gems };
                    newBestRef.current = true;
                    try { localStorage.setItem("slalom_hiscore", JSON.stringify(hiScoreRef.current)); } catch {}
                  } else {
                    newBestRef.current = false;
                  }
                  if (isMultiplayer) {
                    sendGameOver(s.gems);
                    api.patch(`/slalom/rooms/${roomData.id}`, { final_gems: s.gems }).catch(()=>{});
                  }
                }
              }
            } else if (clearedBoth) {
              item.passed = true;
              s.gatesPassed += 1;
              s._itemDirty = true;
              setGatesPassed(s.gatesPassed);
            }
          }
          if (item.type === "gem" && !item.collected) {
            const topDist = Math.hypot(s.topSkate.x - item.x, (s.cy-SKATE_SPREAD) - screenY);
            const botDist = Math.hypot(s.botSkate.x - item.x, (s.cy+SKATE_SPREAD) - screenY);
            if (topDist < 22 || botDist < 22) {
              item.collected = true; s.gems += 1; s._itemDirty = true; setGems(s.gems);
              // Every 10 gems: erase a miss (if any)
              const milestone = Math.floor(s.gems / 10);
              if (milestone > gemMilestoneRef.current && s.misses > 0) {
                gemMilestoneRef.current = milestone;
                s.misses -= 1;
                setMisses(s.misses);
                missEraseFlashRef.current = 60; // flash for 60 frames (~1s)
              } else if (milestone > gemMilestoneRef.current) {
                // Hit milestone but no miss to erase — still advance so next miss-erase is at next +10
                gemMilestoneRef.current = milestone;
              }
            }
          }
        }

        const maxW = Math.max(...s.items.map(i => i.worldDist));
        if (maxW - s.dist < CANVAS_H*2) {
          const lastGate = [...s.items].reverse().find(i => i.type === "gate");
          s.items.push(...generateChunk(maxW+100, 20, lastGate?.cx ?? null));
          s._itemDirty = true;
        }
        const prevLen = s.items.length;
        s.items = s.items.filter(i => s.dist - i.worldDist < 500);
        if (s.items.length !== prevLen) s._itemDirty = true;

        if (isMultiplayer && frameRef.current % BROADCAST_EVERY === 0) {
          // Only send what P2 can't compute itself:
          // - skate positions/angles (authoritative)
          // - scalar game state (dist, speed, misses, gems, flags)
          // - item mutations since last broadcast (diff, not full array)
          // Trails are intentionally excluded — P2 builds its own locally.
          const itemDiff = s._itemDirty ? s.items : undefined;
          s._itemDirty = false;
          sendGameState({
            topSkate: { x: s.topSkate.x, angle: s.topSkate.angle, vx: s.topSkate.vx },
            botSkate: { x: s.botSkate.x, angle: s.botSkate.angle, vx: s.botSkate.vx },
            gems: s.gems, misses: s.misses,
            dist: s.dist, speed: s.speed, cx: s.cx,
            wipeout: s.wipeout, gameOver: s.gameOver,
            gatesPassed: s.gatesPassed,
            ...(itemDiff !== undefined && { items: itemDiff }),
          });
        }

      } else if (isP1 && s.wipeout) {
        s.wipeoutTimer--;
        if (s.wipeoutTimer <= 0) {
          s.wipeout = false;
          // Re-zero angles and lock input so held keys don't immediately re-wipeout
          s.topSkate.angle = 0; s.botSkate.angle = 0;
          s.topSkate.vx = 0;   s.botSkate.vx = 0;
          p2AngleRef.current = 0;
          keysRef.current = {};  // drop held keys so they don't fire the instant lock expires
          inputLockRef.current = 40;
          const nextGate = s.items.find(i => i.type === "gate" && !i.passed && !i.missed && i.worldDist > s.dist);
          const snapX = nextGate ? nextGate.cx : s.cx;
          s.cx = snapX;
          s.topSkate.x = snapX; s.botSkate.x = snapX;
        }
      }

      // Don't let a held space/enter restart the run while the leaderboard
      // name/login prompt is open — that input is for the form, not the game.
      const lbBlocking = lbStatusRef.current === "needs_login" || lbStatusRef.current === "needs_name";
      if (s.gameOver && !lbBlocking && (k[" "] || k["Enter"])) {
        sRef.current = mkState();
        keysRef.current = {};
        p2AngleRef.current = 0;
        p2LastServerRef.current = null;
        newBestRef.current = false;
        gemMilestoneRef.current = 0;
        missEraseFlashRef.current = 0;
        inputLockRef.current = 40; // brief lock so held keys don't immediately steer
        runStartRef.current = Date.now();
        scoreCheckedRef.current = false;
        setLbStatus("idle");
        setGems(0); setMisses(0); setGatesPassed(0); setGameOver(false);
        if (isMultiplayer) sendRestart();
      }

      // ── DRAW ────────────────────────────────────────────────────────────
      ctx.fillStyle="#0b0b18"; ctx.fillRect(0,0,CANVAS_W,CANVAS_H);
      ctx.strokeStyle="#ffffff04"; ctx.lineWidth=1;
      for (let x=60; x<CANVAS_W; x+=80) {
        ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,CANVAS_H); ctx.stroke();
      }

      // Waiting-for-P2 overlay (shown before both players are ready)
      if (isMultiplayer && !bothReady && isP1) {
        ctx.fillStyle="rgba(100,180,255,0.08)"; ctx.fillRect(0,0,CANVAS_W,CANVAS_H);
        ctx.fillStyle="rgba(100,180,255,0.9)"; ctx.font="bold 22px monospace"; ctx.textAlign="center";
        ctx.fillText("ROOM " + (roomData?.join_code ?? ""), CANVAS_W/2, CANVAS_H/2 - 40);
        ctx.fillStyle="rgba(255,255,255,0.35)"; ctx.font="13px monospace";
        ctx.fillText("waiting for player 2…", CANVAS_W/2, CANVAS_H/2);
        ctx.fillStyle="rgba(255,255,255,0.15)"; ctx.font="11px monospace";
        ctx.fillText("game starts when they join", CANVAS_W/2, CANVAS_H/2 + 24);
        animRef.current = requestAnimationFrame(loop);
        return;
      }

      const s2 = sRef.current;
      if (!s2.gameOver) {
        for (const item of s2.items) {
          const screenY = s2.cy - (item.worldDist - s2.dist);
          if (item.type === "gate") drawGate(ctx, item, screenY);
          else drawGem(ctx, item, screenY);
        }
        drawCarveTrail(ctx, s2.topTrail, "#4499ff");
        drawCarveTrail(ctx, s2.botTrail, "#ff4466");
        drawSkate(ctx, s2.topSkate.x, s2.cy-SKATE_SPREAD, s2.topSkate.angle, "#5599ff","#4488ff");
        drawSkate(ctx, s2.botSkate.x, s2.cy+SKATE_SPREAD, s2.botSkate.angle, "#ff5566","#ff4455");
        drawCharacter(ctx, s2.cx, s2.cy, s2.topSkate.x, s2.botSkate.x);
        drawSpreadBar(ctx, Math.abs(s2.topSkate.x - s2.botSkate.x));

        ctx.fillStyle="#44eeffcc"; ctx.font="bold 20px monospace"; ctx.textAlign="left";
        ctx.fillText(`💎 ${s2.gems}`, 16, 30);
        // Show progress toward next miss-erase milestone
        const msLeft = 10 - (s2.gems % 10);
        if (s2.misses > 0 && msLeft < 10) {
          ctx.fillStyle="#44eeff55"; ctx.font="9px monospace"; ctx.textAlign="left";
          ctx.fillText(`${msLeft} to erase miss`, 16, 44);
        }
        // Gate counter
        ctx.fillStyle="#ffffff55"; ctx.font="bold 14px monospace"; ctx.textAlign="left";
        ctx.fillText(`🚩 ${s2.gatesPassed}`, 16, 58);
        if (mode !== "practice") drawMisses(ctx, s2.misses);

        // Miss-erase flash overlay
        if (missEraseFlashRef.current > 0) {
          missEraseFlashRef.current--;
          const t = missEraseFlashRef.current / 60;
          if (Math.floor(missEraseFlashRef.current / 8) % 2 === 0) {
            ctx.fillStyle = `rgba(68,255,136,${t * 0.18})`;
            ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
          }
          ctx.fillStyle = `rgba(68,255,136,${Math.min(t * 2, 1) * 0.9})`;
          ctx.font = "bold 18px monospace"; ctx.textAlign = "center";
          ctx.fillText("✦ MISS ERASED ✦", CANVAS_W / 2, 60);
        }

        if (isMultiplayer) {
          ctx.fillStyle = isP1 ? "rgba(100,180,255,0.5)" : "rgba(255,80,100,0.5)";
          ctx.font="10px monospace"; ctx.textAlign="left";
          ctx.fillText(isP1 ? "P1 — A/D" : "P2 — ←/→", 16, CANVAS_H-14);
        } else {
          ctx.fillStyle="#ffffff1a"; ctx.font="10px monospace"; ctx.textAlign="right";
          ctx.fillText("P1: A/D   P2: ←/→", CANVAS_W-12, CANVAS_H-14);
        }

        if (s2.wipeout) {
          const flash = Math.floor(s2.wipeoutTimer/6)%2===0;
          if (flash) { ctx.fillStyle="#ff113322"; ctx.fillRect(0,0,CANVAS_W,CANVAS_H); }
          ctx.fillStyle="#ffffff99"; ctx.font="bold 28px monospace"; ctx.textAlign="center";
          ctx.fillText("WIPEOUT", CANVAS_W/2, CANVAS_H/2);
        }

      } else {
        const hi = hiScoreRef.current;
        const isNewBest = newBestRef.current;

        ctx.fillStyle="#ffffff"; ctx.font="bold 38px monospace"; ctx.textAlign="center";
        ctx.fillText("GAME OVER", CANVAS_W/2, CANVAS_H/2-80);

        // NEW BEST flash (alternates every 20 frames)
        if (isNewBest && Math.floor(Date.now()/400)%2===0) {
          ctx.fillStyle="#ffdd44"; ctx.font="bold 15px monospace";
          ctx.fillText("✦ NEW BEST ✦", CANVAS_W/2, CANVAS_H/2-52);
        }

        // This run
        ctx.fillStyle="#44eeffcc"; ctx.font="bold 22px monospace";
        ctx.fillText(`💎 ${s2.gems}  🚩 ${s2.gatesPassed}`, CANVAS_W/2, CANVAS_H/2-18);

        // Hi-score line — always shown once a best exists
        if (hi) {
          ctx.fillStyle = isNewBest ? "#ffdd44bb" : "#ffffff33";
          ctx.font="12px monospace";
          ctx.fillText(`best  🚩 ${hi.gates}  💎 ${hi.gems}`, CANVAS_W/2, CANVAS_H/2+12);
        }

        ctx.fillStyle="#ff3333aa"; ctx.font="14px monospace";
        ctx.fillText("3 gates missed", CANVAS_W/2, CANVAS_H/2+40);
        ctx.fillStyle="#ffffff44"; ctx.font="13px monospace";
        ctx.fillText("SPACE or ENTER to go again", CANVAS_W/2, CANVAS_H/2+68);

        // Leaderboard status line (needs_login / needs_name show a DOM overlay instead)
        const lb = lbStatusRef.current;
        if (lb === "submitted" || lb === "checking" || lb === "error") {
          ctx.font = "11px monospace"; ctx.textAlign = "center";
          if (lb === "submitted") {
            ctx.fillStyle = "#44ff8899";
            ctx.fillText("🏆 added to leaderboard", CANVAS_W/2, CANVAS_H/2+92);
          } else if (lb === "checking") {
            ctx.fillStyle = "#ffffff33";
            ctx.fillText("checking leaderboard…", CANVAS_W/2, CANVAS_H/2+92);
          } else {
            ctx.fillStyle = "#ff666688";
            ctx.fillText("couldn't reach the leaderboard", CANVAS_W/2, CANVAS_H/2+92);
          }
        }
      }

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [isP1, isP2, isMultiplayer, bothReady, mode, mkState, sendGameState, sendGameOver, sendRestart, sendP2Input, roomData]);

  // ── Responsive scaling ────────────────────────────────────────────────────
  // The canvas stays at its logical 480×700 size; we CSS-scale the wrapper
  // to fill whatever viewport is available, leaving room for touch buttons.
  // Solo needs two pairs of buttons (one per skate); multiplayer only one pair.
  const BTN_AREA = 120;
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const recalc = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const availH = vh - BTN_AREA;
      const scaleW = vw / CANVAS_W;
      const scaleH = availH / CANVAS_H;
      setScale(Math.min(scaleW, scaleH, 1));
    };
    recalc();
    window.addEventListener("resize", recalc);
    window.addEventListener("orientationchange", recalc);
    return () => {
      window.removeEventListener("resize", recalc);
      window.removeEventListener("orientationchange", recalc);
    };
  }, []);

  // ── Mobile touch handlers ──────────────────────────────────────────────────
  const handleTouchStart = useCallback((key) => (e) => {
    e.preventDefault();
    keysRef.current[key] = true;
  }, []);
  const handleTouchEnd = useCallback((key) => (e) => {
    e.preventDefault();
    keysRef.current[key] = false;
  }, []);

  const doRestart = useCallback(() => {
    // Don't let a tap on GO AGAIN blow past an open leaderboard name/login prompt.
    if (lbStatusRef.current === "needs_login" || lbStatusRef.current === "needs_name") return;
    sRef.current = mkState();
    keysRef.current = {};
    p2AngleRef.current = 0;
    p2LastServerRef.current = null;
    newBestRef.current = false;
    gemMilestoneRef.current = 0;
    missEraseFlashRef.current = 0;
    inputLockRef.current = 40;
    runStartRef.current = Date.now();
    scoreCheckedRef.current = false;
    setLbStatus("idle");
    setGems(0); setMisses(0); setGatesPassed(0); setGameOver(false);
    if (isMultiplayer) sendRestart();
  }, [mkState, isMultiplayer, sendRestart]);

  // Button factory — color varies by which skate it controls
  const mkBtn = (key, label, skate, direction) => {
    const isTop = skate === "top";
    const bg = direction === "left"
      ? (isTop ? "rgba(100,180,255,0.15)" : "rgba(255,80,100,0.15)")
      : (isTop ? "rgba(100,180,255,0.15)" : "rgba(255,80,100,0.15)");
    const border = isTop
      ? "1px solid rgba(100,180,255,0.25)"
      : "1px solid rgba(255,80,100,0.25)";
    return (
      <button
        key={key}
        style={{
          width: 88,
          height: 64,
          borderRadius: 14,
          border,
          background: bg,
          color: "rgba(255,255,255,0.75)",
          fontSize: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          userSelect: "none",
          WebkitUserSelect: "none",
          touchAction: "none",
          flexShrink: 0,
        }}
        onTouchStart={handleTouchStart(key)}
        onTouchEnd={handleTouchEnd(key)}
        onMouseDown={handleTouchStart(key)}
        onMouseUp={handleTouchEnd(key)}
        onMouseLeave={handleTouchEnd(key)}
        aria-label={`${skate} skate steer ${direction}`}
      >
        {direction === "left" ? "◀" : "▶"}
      </button>
    );
  };

  // Which button groups to render
  // Solo: both groups. Multiplayer P1: top only. Multiplayer P2: bottom only.
  const showTopBtns = !isMultiplayer || isP1;
  const showBotBtns = !isMultiplayer || isP2;

  const groupLabel = (label, color) => (
    <div style={{
      color,
      fontSize: 8,
      fontFamily: "monospace",
      letterSpacing: 2,
      textAlign: "center",
      lineHeight: 1.5,
      marginBottom: 2,
    }}>
      {label}
    </div>
  );

  const btnGroup = (skate, leftKey, rightKey, label, color) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      {groupLabel(label, color)}
      <div style={{ display: "flex", gap: 8 }}>
        {mkBtn(leftKey,  "◀", skate, "left")}
        {mkBtn(rightKey, "▶", skate, "right")}
      </div>
    </div>
  );

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "flex-start",
      width: "100vw",
      height: "100vh",
      background: "#060610",
      userSelect: "none",
      overflow: "hidden",
    }}>
      {/* Header label */}
      <div style={{
        color: "#ffffff22",
        fontSize: 9,
        letterSpacing: 3,
        fontFamily: "monospace",
        paddingTop: 6,
        paddingBottom: 4,
        flexShrink: 0,
      }}>
        {isMultiplayer
          ? `ROOM ${roomData?.join_code} — ${isP1 ? "PLAYER 1" : "PLAYER 2"}`
          : "FREESKATE SLALOM"}
        {isMultiplayer && isP1 && !p2Ready && (
          <span style={{ color: "#ffdd4466", marginLeft: 10 }}>waiting for P2…</span>
        )}
      </div>

      {/* Scaled canvas wrapper */}
      <div style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        width: "100%",
        position: "relative",
      }}>
        <div style={{
          width: CANVAS_W,
          height: CANVAS_H,
          transform: `scale(${scale})`,
          transformOrigin: "center center",
          flexShrink: 0,
        }}>
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            style={{ border: "1px solid #ffffff10", borderRadius: 4, display: "block" }}
          />
        </div>

        {/* Leaderboard name / login prompt — deliberately outside the canvas
            scale transform above, so it stays a fixed, readable size no
            matter how small the canvas has been scaled down for the viewport. */}
        {(lbStatus === "needs_login" || lbStatus === "needs_name") && (
          <div style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(6,6,16,0.55)",
            padding: 24,
          }}>
            <div style={{
              width: "100%",
              maxWidth: 280,
              background: "#0b0b18",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 16,
              padding: 20,
              textAlign: "center",
            }}>
              <div style={{ color: "rgba(255,200,50,0.9)", fontSize: 14, fontFamily: "monospace", marginBottom: 6 }}>
                Nice run!
              </div>

              {lbStatus === "needs_login" ? (
                <>
                  <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginBottom: 16, lineHeight: 1.5 }}>
                    That score would make the leaderboard. Log in to save it.
                  </div>
                  <Link
                    to="/login"
                    style={{
                      display: "block",
                      padding: "10px 0",
                      borderRadius: 10,
                      background: "rgba(100,180,255,0.12)",
                      border: "1px solid rgba(100,180,255,0.3)",
                      color: "rgba(100,180,255,0.9)",
                      fontSize: 13,
                      marginBottom: 8,
                      textDecoration: "none",
                    }}
                  >
                    Log in
                  </Link>
                  <button
                    onClick={() => { clearPendingScore(); setLbStatus("none"); }}
                    style={{ background: "none", border: "none", color: "rgba(255,255,255,0.25)", fontSize: 11, padding: 6, cursor: "pointer" }}
                  >
                    skip
                  </button>
                </>
              ) : (
                <>
                  <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginBottom: 12, lineHeight: 1.5 }}>
                    Pick a name for the leaderboard. You can change it later in your account.
                  </div>
                  <input
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleNameSubmit()}
                    maxLength={30}
                    autoFocus
                    placeholder="your name"
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "10px 12px",
                      borderRadius: 10,
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      color: "rgba(255,255,255,0.85)",
                      fontSize: 13,
                      marginBottom: 8,
                      textAlign: "center",
                    }}
                  />
                  {nameError && (
                    <div style={{ color: "rgba(255,100,100,0.8)", fontSize: 11, marginBottom: 8 }}>
                      {nameError}
                    </div>
                  )}
                  <button
                    onClick={handleNameSubmit}
                    disabled={!nameInput.trim()}
                    style={{
                      width: "100%",
                      padding: "10px 0",
                      borderRadius: 10,
                      background: "rgba(100,180,255,0.12)",
                      border: "1px solid rgba(100,180,255,0.3)",
                      color: "rgba(100,180,255,0.9)",
                      fontSize: 13,
                      marginBottom: 8,
                      cursor: "pointer",
                      opacity: nameInput.trim() ? 1 : 0.4,
                    }}
                  >
                    Save &amp; submit
                  </button>
                  <button
                    onClick={() => setLbStatus("none")}
                    style={{ background: "none", border: "none", color: "rgba(255,255,255,0.25)", fontSize: 11, padding: 6, cursor: "pointer" }}
                  >
                    skip
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Touch controls */}
      <div style={{
        flexShrink: 0,
        height: BTN_AREA,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: isMultiplayer ? 40 : 24,
        paddingBottom: "env(safe-area-inset-bottom, 8px)",
        width: "100%",
        paddingLeft: 12,
        paddingRight: 12,
      }}>
        {gameOver ? (
          <button
            onTouchStart={(e) => { e.preventDefault(); doRestart(); }}
            onClick={doRestart}
            style={{
              padding: "16px 48px",
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.2)",
              background: "rgba(255,255,255,0.07)",
              color: "rgba(255,255,255,0.85)",
              fontSize: 16,
              fontFamily: "monospace",
              letterSpacing: 3,
              cursor: "pointer",
              touchAction: "none",
            }}
          >
            GO AGAIN
          </button>
        ) : (
          <>
            {showTopBtns && btnGroup("top", "a", "d", "TOP SKATE", "rgba(100,180,255,0.45)")}
            {!isMultiplayer && (
              <div style={{ color: "#ffffff10", fontSize: 7, fontFamily: "monospace", letterSpacing: 1 }}>
                vs
              </div>
            )}
            {showBotBtns && btnGroup("bot", "ArrowLeft", "ArrowRight", "BOT SKATE", "rgba(255,80,100,0.45)")}
          </>
        )}
      </div>
    </div>
  );
}