// src/Pages/ElementArena.jsx
//
// Prototype: a turn-based competitive economy layered on the same AMM math
// as ElementLab.jsx. The core idea being tested here:
//
//   A "turn" is a block. Every turn, the human queues one action, every bot
//   decides one action from its archetype, and the whole thing resolves in
//   a FIXED ORDER — whales and bots before the human — against the same
//   shared pools. That ordering is what makes this a game and not just a
//   sandbox with NPCs painted on: your queued trade was quoted against the
//   pool *before* the bots moved it, so what actually executes can be worse
//   than what you saw. That gap is shown to you explicitly. It's the same
//   lesson as real MEV/front-running, and it falls straight out of turn
//   resolution order rather than needing its own mechanic.
//
// This file is intentionally self-contained (duplicates a small amount of
// AMM/UI code from ElementLab.jsx) so it can be iterated on independently
// as a prototype. If this direction sticks, RESOURCES / getAmountOut /
// Sparkline / Btn should get pulled into a shared module both files import.
//
// Bot archetypes map onto whitepaper groups, reusing flavor that's already
// written instead of inventing a generic "easy/medium/hard" slider:
//   Alkali   — trades almost every turn, chases whatever moved, small size.
//   Noble    — barely trades, just accumulates. Near-zero volatility impact.
//   Halogen  — quiet, then periodically dumps a big chunk of one holding —
//              predictable, learnable sell pressure.
//   Whale    — rare, huge, one-directional. Reshapes a pool when it moves,
//              and resolves FIRST every turn — the market mover you can't
//              out-run, only anticipate.
//
// Difficulty = which bots are in the arena, not a numeric multiplier.

import React, { useEffect, useMemo, useState } from "react";

const FEE_BPS = 30; // 0.3%, same constant-product fee as ElementLab
const FLUORINE_BURN_RATE = 0.05;
const TURN_SECONDS = 30;
const BLITZ_TOTAL_TURNS = 20;     // ~10 real minutes = one "day", resets daily
const STANDARD_TOTAL_TURNS = 15;  // manual pace = one "month", resets monthly
const RECORDS_KEY = "pe_elementarena_records_v1";

// ─── Shared resource / pool shape (same normalized form as ElementLab) ────
const RESOURCES = {
  hydrogen:  { label: "Hydrogen",  symbol: "H",  icon: "⚛️", color: "#6cc4ff" },
  helium:    { label: "Helium",    symbol: "He", icon: "🎈", color: "#ffd76c" },
  lithium:   { label: "Lithium",   symbol: "Li", icon: "🔋", color: "#c98cff" },
  fluorine:  { label: "Fluorine",  symbol: "F",  icon: "🧪", color: "#ff9d6c" },
  beryllium: { label: "Beryllium", symbol: "Be", icon: "🗝️", color: "#7dffb0" },
};
const POOL_KEYS = ["hydrogen", "helium", "lithium", "fluorine", "beryllium"];

function freshPools() {
  return {
    hydrogen:  { usd: 250, token: 500, priceHistory: [0.5] },
    helium:    { usd: 180, token: 30,  priceHistory: [6] },
    lithium:   { usd: 120, token: 30,  priceHistory: [4] },
    fluorine:  { usd: 140, token: 70,  priceHistory: [2] },
    beryllium: { usd: 180, token: 15,  priceHistory: [12] },
  };
}
function freshBalances() { return Object.fromEntries(POOL_KEYS.map(k => [k, 0])); }

// ─── Bot archetypes ─────────────────────────────────────────────────────────
const ARCHETYPES = {
  alkali:  { name: "Alkali",  icon: "⚡", desc: "Trades almost every turn, chases momentum, small size, high frequency.", tradeChance: 0.85, sizeRange: [5, 18] },
  noble:   { name: "Noble",   icon: "🧊", desc: "Rarely trades. Mostly accumulates and holds.", tradeChance: 0.12, sizeRange: [3, 8] },
  halogen: { name: "Halogen", icon: "🧪", desc: "Quiet, then periodically dumps a large chunk of one holding.", dumpEveryTurns: 5, dumpFraction: 0.45 },
  whale:   { name: "Whale",   icon: "🐋", desc: "Massive capital, rarely moves — but reshapes a pool completely when it does. Resolves first, every turn.", tradeChance: 0.10, sizeRange: [80, 220] },
};

const DIFFICULTIES = {
  easy:   { label: "Easy",   bots: [{ archetype: "noble", name: "Steady Rae" }] },
  medium: { label: "Medium", bots: [{ archetype: "alkali", name: "Quick Nova" }, { archetype: "noble", name: "Steady Rae" }] },
  hard:   { label: "Hard",   bots: [{ archetype: "alkali", name: "Quick Nova" }, { archetype: "alkali", name: "Blaze" }, { archetype: "halogen", name: "Corro" }, { archetype: "whale", name: "Treasury Multisig" }] },
};

// ─── AMM math — identical constant-product formula to ElementLab ──────────
function getAmountOut(amountIn, reserveIn, reserveOut) {
  if (amountIn <= 0 || reserveIn <= 0 || reserveOut <= 0) return 0;
  const amountInWithFee = amountIn * (10000 - FEE_BPS) / 10000;
  const numerator = amountInWithFee * reserveOut;
  const denominator = reserveIn + amountInWithFee;
  return numerator / denominator;
}
function randInt(min, max) { return Math.floor(min + Math.random() * (max - min + 1)); }
function calcNetWorth(actor, pools) {
  return actor.usd + POOL_KEYS.reduce((s, k) => s + (actor.balances[k] || 0) * (pools[k].usd / pools[k].token), 0);
}

// ─── Pure action application — same actor in, new actor out. No mutation. ─
// This is the one function both bots and the human route through: neither
// the caller's identity nor its intent changes the math. That's what makes
// "other players in the pool" possible without a rewrite later.
function applyAction(actor, pools, action) {
  const { tokenKey, direction, size } = action;
  const pool = pools[tokenKey];
  const r = RESOURCES[tokenKey];
  const newActor = { ...actor, balances: { ...actor.balances } };
  let newPools = pools;

  if (direction === "buy") {
    const usdAmt = Math.min(size, actor.usd);
    if (usdAmt <= 0.01) return { pools, actor, summary: `couldn't afford to buy ${r.symbol}`, executed: false };
    const amountOut = getAmountOut(usdAmt, pool.usd, pool.token);
    if (amountOut <= 0) return { pools, actor, summary: "trade too small to execute", executed: false };
    newActor.usd -= usdAmt;
    newActor.balances[tokenKey] = (newActor.balances[tokenKey] || 0) + amountOut;
    const newUsd = pool.usd + usdAmt;
    const newToken = pool.token - amountOut;
    newPools = { ...pools, [tokenKey]: { ...pool, usd: newUsd, token: newToken, priceHistory: [...pool.priceHistory, newUsd / newToken].slice(-40) } };
    return { pools: newPools, actor: newActor, summary: `bought ${amountOut.toFixed(2)} ${r.symbol} for $${usdAmt.toFixed(2)}`, execPrice: usdAmt / amountOut, tokenKey, executed: true };
  } else {
    const tokenAmt = Math.min(size, actor.balances[tokenKey] || 0);
    if (tokenAmt <= 0.01) return { pools, actor, summary: `had no ${r.symbol} to sell`, executed: false };
    const burnRate = tokenKey === "fluorine" ? FLUORINE_BURN_RATE : 0;
    const amtAfterBurn = tokenAmt * (1 - burnRate);
    const amountOut = getAmountOut(amtAfterBurn, pool.token, pool.usd);
    if (amountOut <= 0) return { pools, actor, summary: "trade too small to execute", executed: false };
    newActor.balances[tokenKey] -= tokenAmt;
    newActor.usd += amountOut;
    const newToken = pool.token + amtAfterBurn;
    const newUsd = pool.usd - amountOut;
    newPools = { ...pools, [tokenKey]: { ...pool, usd: newUsd, token: newToken, priceHistory: [...pool.priceHistory, newUsd / newToken].slice(-40) } };
    return { pools: newPools, actor: newActor, summary: `sold ${tokenAmt.toFixed(2)} ${r.symbol} for $${amountOut.toFixed(2)}`, execPrice: amountOut / tokenAmt, tokenKey, executed: true };
  }
}

// ─── Bot decision — pure function of (bot, pools, turnNumber) ─────────────
function decideBotAction(bot, pools, turnNumber) {
  const arch = ARCHETYPES[bot.archetype];

  if (bot.archetype === "halogen") {
    const dumpDue = ((turnNumber - bot.dumpOffset) % arch.dumpEveryTurns + arch.dumpEveryTurns) % arch.dumpEveryTurns === 0;
    if (dumpDue) {
      const held = POOL_KEYS.filter(k => (bot.balances[k] || 0) > 0.5);
      if (held.length > 0) {
        const tokenKey = held[randInt(0, held.length - 1)];
        return { tokenKey, direction: "sell", size: (bot.balances[tokenKey] || 0) * arch.dumpFraction };
      }
    }
    if (Math.random() < 0.3) {
      const tokenKey = POOL_KEYS[randInt(0, POOL_KEYS.length - 1)];
      return { tokenKey, direction: "buy", size: randInt(5, 15) };
    }
    return null;
  }

  if (Math.random() > arch.tradeChance) return null;
  const tokenKey = POOL_KEYS[randInt(0, POOL_KEYS.length - 1)];
  let direction = Math.random() < 0.5 ? "buy" : "sell";
  if (direction === "sell" && (!bot.balances[tokenKey] || bot.balances[tokenKey] < 0.5)) direction = "buy";
  const size = direction === "buy"
    ? randInt(...arch.sizeRange)
    : Math.min(randInt(...arch.sizeRange) / (pools[tokenKey].usd / pools[tokenKey].token), bot.balances[tokenKey] || 0);
  return { tokenKey, direction, size };
}

// ─── Turn resolution — whales/bots resolve before the human, always ───────
function resolveTurn(pools, human, bots, humanAction, turnNumber) {
  let curPools = pools;
  const newBots = bots.map(b => ({ ...b, balances: { ...b.balances } }));
  const events = [];

  const ordered = [...newBots.filter(b => b.archetype === "whale"), ...newBots.filter(b => b.archetype !== "whale")];
  for (const bot of ordered) {
    const action = decideBotAction(bot, curPools, turnNumber);
    if (action) {
      const result = applyAction(bot, curPools, action);
      curPools = result.pools;
      Object.assign(bot.balances, result.actor.balances);
      bot.usd = result.actor.usd;
      events.push({ actor: bot.name, icon: ARCHETYPES[bot.archetype].icon, summary: result.summary });
    } else {
      events.push({ actor: bot.name, icon: ARCHETYPES[bot.archetype].icon, summary: "held position" });
    }
  }

  let newHuman = human;
  if (humanAction) {
    const result = applyAction(human, curPools, humanAction);
    curPools = result.pools;
    newHuman = result.actor;
    let note = "";
    if (result.executed && humanAction.quotedSpot) {
      const dir = humanAction.direction;
      const slip = dir === "buy"
        ? (result.execPrice - humanAction.quotedSpot) / humanAction.quotedSpot
        : (humanAction.quotedSpot - result.execPrice) / humanAction.quotedSpot;
      if (slip > 0.005) note = ` — bots moved price ${(slip * 100).toFixed(1)}% against you before this landed.`;
      else if (slip < -0.005) note = ` — price actually moved ${(Math.abs(slip) * 100).toFixed(1)}% in your favor.`;
    }
    events.push({ actor: "You", icon: "🧑", summary: result.summary + note, isHuman: true, adverse: note.includes("against") });
  } else {
    events.push({ actor: "You", icon: "🧑", summary: "passed the turn", isHuman: true });
  }

  return { pools: curPools, human: newHuman, bots: newBots, events };
}

function loadRecords() {
  try { return JSON.parse(localStorage.getItem(RECORDS_KEY)) || []; } catch { return []; }
}
function saveRecords(records) {
  try { localStorage.setItem(RECORDS_KEY, JSON.stringify(records)); } catch {}
}

// ─── UI atoms ───────────────────────────────────────────────────────────────
function Sparkline({ data, color }) {
  if (!data || data.length < 2) return <svg viewBox="0 0 100 24" className="w-full h-6"><line x1="0" y1="12" x2="100" y2="12" stroke={color} strokeOpacity="0.3" /></svg>;
  const min = Math.min(...data), max = Math.max(...data), range = max - min || 1;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * 100},${23 - ((v - min) / range) * 21}`).join(" ");
  const up = data[data.length - 1] >= data[0];
  return <svg viewBox="0 0 100 24" className="w-full h-6" preserveAspectRatio="none"><polyline points={points} fill="none" stroke={up ? "#7dffb0" : "#ff8080"} strokeWidth="1.5" /></svg>;
}
function Btn({ children, onClick, disabled, tone = "default" }) {
  const style = tone === "accent"
    ? { background: "#5b9dff", color: "#050708", borderColor: "#5b9dff" }
    : { background: "var(--bg, #0a0d0f)", color: "var(--text, #f2f2f2)", borderColor: "var(--border, rgba(255,255,255,0.15))" };
  return <button type="button" onClick={onClick} disabled={disabled} style={style} className={`rounded-xl px-3 py-2 text-xs font-medium transition border hover:opacity-90 ${disabled ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}`}>{children}</button>;
}

// ─── Main component ─────────────────────────────────────────────────────────
export default function ElementArena() {
  const [phase, setPhase] = useState("lobby"); // 'lobby' | 'playing' | 'ended'
  const [mode, setMode] = useState("blitz");   // 'blitz' | 'standard'
  const [difficulty, setDifficulty] = useState("medium");

  const [turnNumber, setTurnNumber] = useState(1);
  const [pools, setPools] = useState(freshPools());
  const [human, setHuman] = useState({ usd: 150, balances: freshBalances() });
  const [bots, setBots] = useState([]);
  const [prevNetWorths, setPrevNetWorths] = useState({});
  const [turnLog, setTurnLog] = useState([]);
  const [secondsLeft, setSecondsLeft] = useState(TURN_SECONDS);

  const [actionTokenKey, setActionTokenKey] = useState("hydrogen");
  const [actionDirection, setActionDirection] = useState("buy");
  const [actionAmount, setActionAmount] = useState("");
  const [pendingAction, setPendingAction] = useState(null);

  const [seasonRecords, setSeasonRecords] = useState(() => loadRecords());
  const [finalBoard, setFinalBoard] = useState(null);

  const totalTurns = mode === "blitz" ? BLITZ_TOTAL_TURNS : STANDARD_TOTAL_TURNS;

  // ── Blitz auto-timer — resolves the turn when it hits zero ─────────────
  useEffect(() => {
    if (phase !== "playing" || mode !== "blitz") return;
    if (secondsLeft <= 0) { handleEndTurn(); return; }
    const t = setTimeout(() => setSecondsLeft(s => s - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, mode, secondsLeft]);

  function startSeason() {
    const roster = DIFFICULTIES[difficulty].bots.map((cfg, i) => ({
      id: `bot-${i}`,
      name: cfg.name,
      archetype: cfg.archetype,
      usd: cfg.archetype === "whale" ? 2000 : 300,
      balances: freshBalances(),
      dumpOffset: randInt(0, 4),
    }));
    setPools(freshPools());
    setHuman({ usd: 150, balances: freshBalances() });
    setBots(roster);
    setPrevNetWorths({});
    setTurnNumber(1);
    setTurnLog([]);
    setPendingAction(null);
    setSecondsLeft(TURN_SECONDS);
    setFinalBoard(null);
    setPhase("playing");
  }

  function queueAction() {
    const amt = parseFloat(actionAmount);
    if (!amt || amt <= 0) return;
    const spot = pools[actionTokenKey].usd / pools[actionTokenKey].token;
    setPendingAction({ tokenKey: actionTokenKey, direction: actionDirection, size: amt, quotedSpot: spot });
  }

  function handleEndTurn() {
    const result = resolveTurn(pools, human, bots, pendingAction, turnNumber);
    const nextNetWorths = {
      you: calcNetWorth(result.human, result.pools),
      ...Object.fromEntries(result.bots.map(b => [b.id, calcNetWorth(b, result.pools)])),
    };
    setPools(result.pools);
    setHuman(result.human);
    setBots(result.bots);
    setTurnLog(prev => [{ turnNumber, events: result.events }, ...prev].slice(0, 40));
    setPrevNetWorths(nextNetWorths);
    setPendingAction(null);
    setActionAmount("");
    setSecondsLeft(TURN_SECONDS);

    if (turnNumber >= totalTurns) {
      endSeason(result.human, result.bots, result.pools);
    } else {
      setTurnNumber(t => t + 1);
    }
  }

  function endSeason(finalHuman, finalBots, finalPools) {
    const board = [
      { id: "you", name: "You", icon: "🧑", netWorth: calcNetWorth(finalHuman, finalPools), isHuman: true },
      ...finalBots.map(b => ({ id: b.id, name: b.name, icon: ARCHETYPES[b.archetype].icon, netWorth: calcNetWorth(b, finalPools) })),
    ].sort((a, b) => b.netWorth - a.netWorth);
    const rank = board.findIndex(e => e.isHuman) + 1;

    const record = { mode, difficulty, turns: totalTurns, rank, of: board.length, netWorth: calcNetWorth(finalHuman, finalPools), endedAt: Date.now() };
    const nextRecords = [record, ...seasonRecords].slice(0, 20);
    setSeasonRecords(nextRecords);
    saveRecords(nextRecords);

    setFinalBoard(board);
    setPhase("ended");
  }

  const liveBoard = useMemo(() => {
    const board = [
      { id: "you", name: "You", icon: "🧑", netWorth: calcNetWorth(human, pools), isHuman: true },
      ...bots.map(b => ({ id: b.id, name: b.name, icon: ARCHETYPES[b.archetype].icon, netWorth: calcNetWorth(b, pools) })),
    ];
    board.sort((a, b) => b.netWorth - a.netWorth);
    return board;
  }, [human, bots, pools]);

  const quotedNow = pools[actionTokenKey].usd / pools[actionTokenKey].token;

  // ─── Lobby ────────────────────────────────────────────────────────────
  if (phase === "lobby") {
    return (
      <main className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
        <div className="mx-auto max-w-2xl px-5 py-10 space-y-6">
          <header className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">Element Arena — prototype</p>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">A turn-based fake economy, with other players in it.</h1>
            <p className="text-sm text-[var(--muted)] leading-6">
              Each turn is a block. You queue one trade; every bot decides one too, using the same pool math
              you use. Bots resolve first — so what actually executes for you can differ from the price you
              queued against. That gap is shown to you every turn.
            </p>
          </header>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)] p-4 space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--muted)]">Mode</p>
            <div className="flex gap-2">
              <button onClick={() => setMode("blitz")} className="flex-1 rounded-xl border p-3 text-left transition" style={mode === "blitz" ? { borderColor: "#5b9dff", background: "rgba(91,157,255,0.08)" } : { borderColor: "var(--border)" }}>
                <p className="text-sm font-semibold">⚡ Blitz</p>
                <p className="text-[11px] text-[var(--muted)] mt-1">30s per turn, auto-resolves. {BLITZ_TOTAL_TURNS} turns = one "day". Resets daily.</p>
              </button>
              <button onClick={() => setMode("standard")} className="flex-1 rounded-xl border p-3 text-left transition" style={mode === "standard" ? { borderColor: "#5b9dff", background: "rgba(91,157,255,0.08)" } : { borderColor: "var(--border)" }}>
                <p className="text-sm font-semibold">🗓️ Standard</p>
                <p className="text-[11px] text-[var(--muted)] mt-1">Manual turns, no clock. {STANDARD_TOTAL_TURNS} turns = one "month". Resets monthly.</p>
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)] p-4 space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--muted)]">Difficulty — who's in the market with you</p>
            <div className="space-y-2">
              {Object.entries(DIFFICULTIES).map(([key, d]) => (
                <button key={key} onClick={() => setDifficulty(key)} className="w-full rounded-xl border p-3 text-left transition" style={difficulty === key ? { borderColor: "#5b9dff", background: "rgba(91,157,255,0.08)" } : { borderColor: "var(--border)" }}>
                  <p className="text-sm font-semibold">{d.label}</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {d.bots.map((b, i) => (
                      <span key={i} className="text-[11px] text-[var(--muted)] rounded-full border border-[var(--border)] px-2 py-0.5">
                        {ARCHETYPES[b.archetype].icon} {b.name} <span className="opacity-60">({ARCHETYPES[b.archetype].name})</span>
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-[var(--muted)] leading-4">{ARCHETYPES[DIFFICULTIES[difficulty].bots[DIFFICULTIES[difficulty].bots.length - 1].archetype].desc}</p>
          </div>

          <Btn onClick={startSeason} tone="accent">Start Season</Btn>

          {seasonRecords.length > 0 && (
            <div className="pt-2">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--muted)] mb-2">Past seasons</p>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)] p-3 space-y-1.5">
                {seasonRecords.map((r, i) => (
                  <p key={i} className="text-xs text-[var(--muted)]">
                    {new Date(r.endedAt).toLocaleDateString()} — <span className="text-[var(--text)]">{r.mode}/{r.difficulty}</span>: finished #{r.rank} of {r.of}, ${r.netWorth.toFixed(2)} net worth
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    );
  }

  // ─── Season ended ─────────────────────────────────────────────────────
  if (phase === "ended" && finalBoard) {
    const rank = finalBoard.findIndex(e => e.isHuman) + 1;
    return (
      <main className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
        <div className="mx-auto max-w-xl px-5 py-10 space-y-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">Season complete</p>
          <h1 className="text-2xl font-semibold">You finished #{rank} of {finalBoard.length}</h1>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)] p-4 text-left space-y-1.5">
            {finalBoard.map((e, i) => (
              <div key={e.id} className="flex items-center justify-between text-sm" style={e.isHuman ? { color: "#5b9dff" } : {}}>
                <p>#{i + 1} {e.icon} {e.name}</p>
                <p className="tabular-nums font-medium">${e.netWorth.toFixed(2)}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-2 justify-center">
            <Btn onClick={startSeason} tone="accent">Play again ({mode}/{difficulty})</Btn>
            <Btn onClick={() => setPhase("lobby")}>New season setup</Btn>
          </div>
        </div>
      </main>
    );
  }

  // ─── Playing ──────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <div className="mx-auto max-w-3xl px-5 py-10 space-y-6">
        <header className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">Element Arena — {mode} / {difficulty}</p>
            <h1 className="text-xl font-semibold">Turn {turnNumber} of {totalTurns}</h1>
          </div>
          {mode === "blitz" ? (
            <div className="text-right">
              <p className="text-[11px] text-[var(--muted)]">turn resolves in</p>
              <p className="text-2xl font-semibold tabular-nums" style={{ color: secondsLeft <= 5 ? "#ff8080" : "#5b9dff" }}>{secondsLeft}s</p>
            </div>
          ) : (
            <Btn onClick={handleEndTurn} tone="accent">Resolve Turn</Btn>
          )}
        </header>

        {/* Pools */}
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {POOL_KEYS.map(k => {
            const r = RESOURCES[k];
            const p = pools[k];
            const price = p.usd / p.token;
            const active = actionTokenKey === k;
            return (
              <button key={k} onClick={() => setActionTokenKey(k)} className="rounded-xl border p-2 text-left transition" style={active ? { borderColor: "#5b9dff", background: "rgba(91,157,255,0.08)" } : { borderColor: "var(--border)" }}>
                <p className="text-[10px] text-[var(--muted)]">{r.icon} {r.symbol}</p>
                <p className="text-xs font-semibold tabular-nums">${price.toFixed(2)}</p>
                <Sparkline data={p.priceHistory} color={r.color} />
              </button>
            );
          })}
        </div>

        {/* Action queue */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)] p-4 space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--muted)]">Your move this turn</p>
          <p className="text-xs text-[var(--muted)]">Wallet: ${human.usd.toFixed(2)} — {RESOURCES[actionTokenKey].symbol} held: {(human.balances[actionTokenKey] || 0).toFixed(2)}</p>
          {pendingAction ? (
            <div className="rounded-xl border border-[var(--accent)] p-3 flex items-center justify-between">
              <p className="text-xs">
                Queued: {pendingAction.direction === "buy" ? "Buy" : "Sell"} {pendingAction.size} {pendingAction.direction === "buy" ? "USD of" : RESOURCES[pendingAction.tokenKey].symbol} — quoted at ${pendingAction.quotedSpot.toFixed(3)}
              </p>
              <Btn onClick={() => setPendingAction(null)}>Cancel</Btn>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <button onClick={() => setActionDirection("buy")} className="flex-1 rounded-lg py-1.5 text-xs font-medium border transition" style={actionDirection === "buy" ? { background: "#5b9dff", color: "#050708", borderColor: "#5b9dff" } : { borderColor: "var(--border)", color: "var(--muted)" }}>Buy {RESOURCES[actionTokenKey].symbol}</button>
                <button onClick={() => setActionDirection("sell")} className="flex-1 rounded-lg py-1.5 text-xs font-medium border transition" style={actionDirection === "sell" ? { background: "#5b9dff", color: "#050708", borderColor: "#5b9dff" } : { borderColor: "var(--border)", color: "var(--muted)" }}>Sell {RESOURCES[actionTokenKey].symbol}</button>
              </div>
              <div className="flex items-center gap-2">
                <input type="number" min="0" step="0.01" value={actionAmount} onChange={e => setActionAmount(e.target.value)} placeholder={actionDirection === "buy" ? "USD to spend" : `${RESOURCES[actionTokenKey].symbol} to sell`} className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]" />
                <Btn onClick={queueAction} tone="accent">Queue trade</Btn>
              </div>
              <p className="text-[10px] text-[var(--muted)]">Current quote: ${quotedNow.toFixed(3)} — bots act before you, so this can move before your trade lands.</p>
            </div>
          )}
          {mode === "blitz" && <Btn onClick={handleEndTurn} tone="accent">Resolve now</Btn>}
        </div>

        {/* Leaderboard */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--muted)] mb-2">Leaderboard</p>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)] p-3 space-y-1.5">
            {liveBoard.map((e, i) => {
              const prev = prevNetWorths[e.id];
              const delta = prev !== undefined ? e.netWorth - prev : null;
              return (
                <div key={e.id} className="flex items-center justify-between text-sm" style={e.isHuman ? { color: "#5b9dff" } : {}}>
                  <p>#{i + 1} {e.icon} {e.name}</p>
                  <p className="tabular-nums font-medium flex items-center gap-1">
                    ${e.netWorth.toFixed(2)}
                    {delta !== null && Math.abs(delta) > 0.005 && (
                      <span style={{ color: delta > 0 ? "#7dffb0" : "#ff8080" }} className="text-[10px]">{delta > 0 ? "▲" : "▼"}{Math.abs(delta).toFixed(2)}</span>
                    )}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Turn log */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--muted)] mb-2">Turn log</p>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)] p-3 space-y-3 max-h-64 overflow-y-auto">
            {turnLog.length === 0 && <p className="text-xs text-[var(--muted)]">No turns resolved yet.</p>}
            {turnLog.map((t, i) => (
              <div key={i}>
                <p className="text-[10px] text-[var(--muted)] uppercase tracking-widest mb-1">Turn {t.turnNumber}</p>
                {t.events.map((e, j) => (
                  <p key={j} className="text-xs leading-5" style={e.isHuman ? { color: e.adverse ? "#ff9d6c" : "#5b9dff" } : { color: "var(--muted)" }}>
                    {e.icon} {e.actor} {e.summary}
                  </p>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}