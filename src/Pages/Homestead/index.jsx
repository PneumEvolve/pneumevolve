// src/Pages/Homestead/index.jsx
import React, { useState, useRef, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { Link } from "react-router-dom";
import HomesteadView from "./HomesteadView";
import RunLobby      from "./RunLobby";
import ForestRun     from "./ForestRun";
import MiningRun     from "./MiningRun";
import FruitRun      from "./FruitRun";
import FishingRun    from "./FishingRun";
import LootSummary   from "./LootSummary";
import { fullEmptyInventory, defaultObjects, defaultCharacter, emptyHotbar } from "./gameEngine";

const SAVE_KEY = "hearthroot_room";

// ─── Audio paths ──────────────────────────────────────────────────────────────
// Drop your audio files in /public/audio/ and update these paths.
// Run tracks is a map so you can add per-run-type music later:
//   { forest: "/audio/run_forest.mp3", mining: "/audio/run_cave.mp3", ... }
// Any runType not listed falls back to the "default" key.
const AUDIO_HOMESTEAD  = "/audio/homestead.mp3";
const AUDIO_RUN_TRACKS = {
  default: "/audio/run.mp3",
  // forest:  "/audio/run_forest.mp3",
  // mining:  "/audio/run_cave.mp3",
  // fruit:   "/audio/run_orchard.mp3",
  // fishing: "/audio/run_lake.mp3",
};
// ─── useGameAudio ─────────────────────────────────────────────────────────────
// Uses Web Audio API for gapless looping. Crossfades between homestead/run music.
const FADE_S = 1.5;

function useGameAudio(phase, runType) {
  const ctxRef      = useRef(null);
  const tracksRef   = useRef({});   // url -> { buffer, gainNode, sourceNode | null }
  const activeRef   = useRef(null); // currently playing url
  const fadeRef     = useRef(null); // cancelAnimationFrame handle

  // Lazy-init AudioContext (must happen inside a user gesture on first use,
  // but we create it here and resume it in unlockAudio)
  const getCtx = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return ctxRef.current;
  }, []);

  // Pre-fetch & decode a url, cache the buffer
  const loadTrack = useCallback(async (url) => {
    const existing = tracksRef.current[url];
    if (existing) return existing;

    const ctx = getCtx();
    const entry = { buffer: null, gainNode: ctx.createGain(), sourceNode: null };
    entry.gainNode.gain.value = 0;
    entry.gainNode.connect(ctx.destination);
    tracksRef.current[url] = entry;

    try {
      const res = await fetch(url);
      const ab  = await res.arrayBuffer();
      entry.buffer = await ctx.decodeAudioData(ab);
    } catch (e) {
      console.warn("[audio] failed to load", url, e);
    }
    return entry;
  }, [getCtx]);

  // Start playing a track (gapless loop via BufferSourceNode)
  const playTrack = useCallback((entry, ctx, offset = 0) => {
    if (!entry.buffer) return;
    // Stop existing source cleanly
    if (entry.sourceNode) {
      try { entry.sourceNode.stop(); } catch {}
      entry.sourceNode.disconnect();
    }
    const src = ctx.createBufferSource();
    src.buffer = entry.buffer;
    src.loop   = true;           // BufferSourceNode loops with ZERO gap
    src.connect(entry.gainNode);
    src.start(0, offset);
    entry.sourceNode = src;
  }, []);

  // Smooth crossfade to a new url
  const crossfadeTo = useCallback(async (targetUrl) => {
    const ctx = getCtx();
    if (ctx.state === "suspended") return; // not unlocked yet — will retry in unlockAudio

    const [incoming, outgoing] = await Promise.all([
      loadTrack(targetUrl),
      activeRef.current ? loadTrack(activeRef.current) : Promise.resolve(null),
    ]);

    if (!incoming.buffer) return; // file not loaded

    // Start incoming track if not already running
    if (!incoming.sourceNode) {
      playTrack(incoming, ctx);
    }

    if (fadeRef.current) cancelAnimationFrame(fadeRef.current);

    const inStart  = incoming.gainNode.gain.value;
    const outStart = outgoing?.gainNode.gain.value ?? 0;
    const t0 = performance.now();

    function tick() {
      const p    = Math.min((performance.now() - t0) / 1000 / FADE_S, 1);
      // Smooth S-curve (smoothstep) — no sudden jump, no fade-in artefact
      const ease = p * p * (3 - 2 * p);

      incoming.gainNode.gain.value = inStart  + (1 - inStart)  * ease;
      if (outgoing) {
        outgoing.gainNode.gain.value = outStart * (1 - ease);
      }

      if (p < 1) {
        fadeRef.current = requestAnimationFrame(tick);
      } else {
        incoming.gainNode.gain.value = 1;
        if (outgoing) {
          outgoing.gainNode.gain.value = 0;
          // Stop the outgoing source to save resources
          try { outgoing.sourceNode?.stop(); } catch {}
          outgoing.sourceNode = null;
        }
        fadeRef.current = null;
      }
    }
    fadeRef.current = requestAnimationFrame(tick);
    activeRef.current = targetUrl;
  }, [getCtx, loadTrack, playTrack]);

  // Pre-load tracks and crossfade on phase/runType change
  useEffect(() => {
    const isRun = phase === "run" || phase === "run_lobby";
    const target = isRun
      ? (AUDIO_RUN_TRACKS[runType] ?? AUDIO_RUN_TRACKS.default)
      : AUDIO_HOMESTEAD;

    // Pre-load both tracks silently
    loadTrack(AUDIO_HOMESTEAD);
    loadTrack(AUDIO_RUN_TRACKS[runType] ?? AUDIO_RUN_TRACKS.default);

    crossfadeTo(target);
  }, [phase, runType, crossfadeTo, loadTrack]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (fadeRef.current) cancelAnimationFrame(fadeRef.current);
      Object.values(tracksRef.current).forEach(t => {
        try { t.sourceNode?.stop(); } catch {}
      });
      ctxRef.current?.close();
    };
  }, []);

  // Unlock AudioContext on first user gesture
  const unlockAudio = useCallback(async () => {
    const ctx = getCtx();
    if (ctx.state === "suspended") {
      await ctx.resume();
      // Retry crossfade now that context is running
      const isRun = ["run", "run_lobby"].includes(
        // read phase from a ref so we don't need it as a dep
        document.querySelector("[data-phase]")?.dataset?.phase ?? ""
      );
      // simpler: just re-trigger by playing whatever should be active
      if (activeRef.current) {
        const entry = tracksRef.current[activeRef.current];
        if (entry?.buffer && !entry.sourceNode) {
          playTrack(entry, ctx);
          entry.gainNode.gain.value = 1;
        }
      }
    }
  }, [getCtx, playTrack]);

  return { unlockAudio };
}

function loadSave() {
  try { const raw = localStorage.getItem(SAVE_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
function writeSave(room, role) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ id:room.id, join_code:room.join_code, role, savedAt:Date.now() })); } catch {}
}
function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch {} }

// ─── Entry lobby ──────────────────────────────────────────────────────────────
function HomesteadLobby({ onRoomReady }) {
  const [save]      = useState(() => loadSave());
  const [mode,      setMode]     = useState(save ? "saved" : "fresh");
  const [joinCode,  setJoinCode] = useState("");
  const [loading,   setLoading]  = useState(false);
  const [error,     setError]    = useState(null);
  const [lostMsg,   setLostMsg]  = useState(false);

  async function handleCreate() {
    setLoading(true); setError(null);
    try { const { data } = await api.post("/homestead/rooms"); onRoomReady(data, "p1"); }
    catch (e) { setError(e?.response?.data?.detail || "Couldn't create room."); }
    finally { setLoading(false); }
  }
  async function handleJoin() {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    setLoading(true); setError(null);
    try { const { data } = await api.post("/homestead/rooms/join", { join_code: code }); onRoomReady(data, "p2"); }
    catch (e) { setError(e?.response?.data?.detail || "Room not found."); }
    finally { setLoading(false); }
  }
  async function handleResume() {
    if (!save) return;
    setLoading(true); setError(null);
    try { const { data } = await api.get(`/homestead/rooms/${save.id}`); onRoomReady(data, save.role); }
    catch { clearSave(); setLostMsg(true); setMode("fresh"); }
    finally { setLoading(false); }
  }
  function handleStartFresh() { clearSave(); setMode("fresh"); setLostMsg(false); setError(null); }

  return (
    <main style={{
      minHeight:"100svh", background:"#0a120a", color:"#f5e6c8",
      display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
      padding:"0 24px", fontFamily:"monospace",
    }}>
      <div style={{ width:"100%", maxWidth:360, display:"flex", flexDirection:"column", gap:28 }}>
        <div style={{ textAlign:"center" }}>
          <h1 style={{ fontSize:28, fontWeight:400, letterSpacing:"0.12em", color:"rgba(200,230,120,0.9)", marginBottom:6 }}>🌿 hearthroot</h1>
          <p style={{ fontSize:11, letterSpacing:"0.16em", color:"rgba(245,230,200,0.25)", textTransform:"uppercase" }}>a shared homestead</p>
        </div>
        {lostMsg && (
          <div style={{ borderRadius:10, border:"1px solid rgba(255,160,80,0.25)", padding:"10px 14px", fontSize:11, lineHeight:1.6, color:"rgba(255,180,100,0.7)", textAlign:"center" }}>
            your previous homestead couldn't be found — it may have expired.
          </div>
        )}
        {mode === "saved" && save && (
          <>
            <div style={{ borderRadius:12, border:"1px solid rgba(200,230,120,0.15)", padding:"18px 20px", background:"rgba(200,230,120,0.04)" }}>
              <p style={{ fontSize:10, letterSpacing:"0.16em", color:"rgba(200,230,160,0.4)", textTransform:"uppercase", marginBottom:10 }}>saved homestead</p>
              <div style={{ display:"flex", alignItems:"baseline", gap:10, marginBottom:6 }}>
                <span style={{ fontSize:22, letterSpacing:"0.14em", color:"rgba(200,230,120,0.9)", fontWeight:400 }}>{save.join_code}</span>
                <span style={{ fontSize:10, color:"rgba(245,230,200,0.3)" }}>· {save.role === "p1" ? "host" : "guest"}{save.savedAt ? ` · ${timeSince(save.savedAt)}` : ""}</span>
              </div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <button onClick={handleResume} disabled={loading} style={{ padding:"16px", borderRadius:12, cursor:"pointer", background:"rgba(200,230,120,0.08)", border:"1px solid rgba(200,230,120,0.25)", color:"rgba(200,230,120,0.9)", fontSize:13, fontFamily:"monospace", opacity:loading?0.4:1 }}>
                {loading ? "loading…" : "resume homestead →"}
              </button>
              <div style={{ display:"flex", alignItems:"center", gap:12, margin:"4px 0" }}>
                <div style={{ flex:1, height:1, background:"rgba(255,255,255,0.06)" }} />
                <span style={{ fontSize:10, color:"rgba(255,255,255,0.15)" }}>or</span>
                <div style={{ flex:1, height:1, background:"rgba(255,255,255,0.06)" }} />
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} onKeyDown={e => e.key==="Enter"&&handleJoin()} placeholder="JOIN CODE" maxLength={6} disabled={loading}
                  style={{ flex:1, padding:"11px 14px", borderRadius:10, outline:"none", background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.08)", color:"rgba(255,255,255,0.7)", fontSize:12, fontFamily:"monospace", letterSpacing:"0.14em", textAlign:"center", opacity:loading?0.4:1 }} />
                <button onClick={handleJoin} disabled={loading||!joinCode.trim()} style={{ padding:"11px 16px", borderRadius:10, cursor:"pointer", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)", color:"rgba(255,255,255,0.5)", fontSize:12, fontFamily:"monospace", opacity:loading||!joinCode.trim()?0.3:1 }}>join</button>
              </div>
              <button onClick={handleStartFresh} disabled={loading} style={{ padding:"8px", borderRadius:8, cursor:"pointer", background:"transparent", border:"none", color:"rgba(255,255,255,0.2)", fontSize:11, fontFamily:"monospace", opacity:loading?0.4:1 }}>start a new homestead</button>
            </div>
          </>
        )}
        {mode === "fresh" && (
          <>
            <div style={{ borderRadius:12, border:"1px solid rgba(255,255,255,0.07)", padding:"14px 18px", fontSize:12, lineHeight:1.7, color:"rgba(245,230,200,0.38)" }}>
              <p style={{ marginBottom:8 }}><span style={{ color:"rgba(200,230,120,0.8)" }}>Build</span> a shared homestead together. Craft, farm, decorate.</p>
              <p><span style={{ color:"rgba(255,180,80,0.8)" }}>Run</span> solo or co-op — forest, cave, orchard, or lake — and bring loot back for your partner to build with.</p>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <button onClick={handleCreate} disabled={loading} style={{ padding:"16px", borderRadius:12, cursor:"pointer", background:"rgba(200,230,120,0.08)", border:"1px solid rgba(200,230,120,0.25)", color:"rgba(200,230,120,0.9)", fontSize:13, fontFamily:"monospace", opacity:loading?0.4:1 }}>
                {loading ? "creating…" : "new homestead"}
              </button>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{ flex:1, height:1, background:"rgba(255,255,255,0.07)" }} />
                <span style={{ fontSize:11, color:"rgba(255,255,255,0.18)" }}>or join</span>
                <div style={{ flex:1, height:1, background:"rgba(255,255,255,0.07)" }} />
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} onKeyDown={e => e.key==="Enter"&&handleJoin()} placeholder="JOIN CODE" maxLength={6}
                  style={{ flex:1, padding:"12px 16px", borderRadius:10, outline:"none", background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.1)", color:"rgba(255,255,255,0.8)", fontSize:13, fontFamily:"monospace", letterSpacing:"0.14em", textAlign:"center" }} />
                <button onClick={handleJoin} disabled={loading||!joinCode.trim()} style={{ padding:"12px 18px", borderRadius:10, cursor:"pointer", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", color:"rgba(255,255,255,0.6)", fontSize:13, fontFamily:"monospace", opacity:loading||!joinCode.trim()?0.4:1 }}>join</button>
              </div>
            </div>
          </>
        )}
        {error && <p style={{ textAlign:"center", fontSize:12, color:"rgba(255,100,100,0.8)" }}>{error}</p>}
        <Link to="/" style={{ textAlign:"center", fontSize:11, color:"rgba(255,255,255,0.18)", textDecoration:"none" }}>← home</Link>
      </div>
    </main>
  );
}

function timeSince(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s/60)}m ago`;
  if (s < 86400) return `${Math.floor(s/3600)}h ago`;
  return `${Math.floor(s/86400)}d ago`;
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function HomesteadGame() {
  const [phase,    setPhase]    = useState("lobby");
  const [room,     setRoom]     = useState(null);
  const [role,     setRole]     = useState(null);
  const [runSeed,  setRunSeed]  = useState(null);
  const [runType,  setRunType]  = useState("forest");
  const [runLoot,  setRunLoot]  = useState(null);
  const [runKills, setRunKills] = useState(0);
  const [chestOpen, setChestOpen] = useState(false);

  const [chest,         setChest]         = useState(() => fullEmptyInventory());
  const [placedObjects, setPlacedObjects] = useState(defaultObjects);

  const chestRef   = useRef(chest);
  const objectsRef = useRef(placedObjects);
  const roomRef    = useRef(room);

  useEffect(() => { chestRef.current   = chest; },        [chest]);
  useEffect(() => { objectsRef.current = placedObjects; }, [placedObjects]);
  useEffect(() => { roomRef.current    = room; },          [room]);

  // Character customization (per-player, localStorage)
  const [character, setCharacter] = useState(() => {
    try { const s = localStorage.getItem("hearthroot_character"); return s ? JSON.parse(s) : defaultCharacter(); }
    catch { return defaultCharacter(); }
  });
  const handleCharacterUpdate = useCallback((next) => {
    setCharacter(next);
    try { localStorage.setItem("hearthroot_character", JSON.stringify(next)); } catch {}
  }, []);

  // Equipment
  const [equipment, setEquipment] = useState(() => {
    try { const s = localStorage.getItem("hearthroot_equipment"); return s ? JSON.parse(s) : { weapon:null, armor:null, accessory:null }; }
    catch { return { weapon:null, armor:null, accessory:null }; }
  });
  const handleEquipItem = useCallback((item) => {
    setEquipment(prev => {
      const eq = { axe:"weapon", pickaxe:"weapon", fishing_rod:"weapon", leather_armor:"armor", potion_table:"accessory" };
      const slot = eq[item];
      if (!slot) return prev;
      const next = { ...prev, [slot]: prev[slot] === item ? null : item };
      try { localStorage.setItem("hearthroot_equipment", JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  // Hotbar
  const [hotbar, setHotbar] = useState(() => {
    try { const s = localStorage.getItem("hearthroot_hotbar"); return s ? JSON.parse(s) : emptyHotbar(); }
    catch { return emptyHotbar(); }
  });
  const handleHotbarChange = useCallback((newHotbar) => {
    setHotbar(newHotbar);
    try { localStorage.setItem("hearthroot_hotbar", JSON.stringify(newHotbar)); } catch {}
  }, []);

  function handleRoomReady(roomData, assignedRole) {
    setRoom(roomData);
    setRole(assignedRole);
    writeSave(roomData, assignedRole);
    if (roomData.chest_inventory && Object.keys(roomData.chest_inventory).length > 0) {
      setChest({ ...fullEmptyInventory(), ...roomData.chest_inventory });
    }
    if (roomData.placed_objects && roomData.placed_objects.length > 0) {
      setPlacedObjects(roomData.placed_objects);
    }
    setPhase("homestead");
  }

  const [isJoiningRun, setIsJoiningRun] = useState(false);
  const [joinRunSeed,  setJoinRunSeed]  = useState(null);
  const [joinRunType,  setJoinRunType]  = useState(null);

  const handleStartRun = useCallback(() => {
    setIsJoiningRun(false); setJoinRunSeed(null); setJoinRunType(null);
    setPhase("run_lobby");
  }, []);

  const handleJoinRun = useCallback((seed, rtype) => {
    setIsJoiningRun(true); setJoinRunSeed(seed ?? null); setJoinRunType(rtype ?? "forest");
    setPhase("run_lobby");
  }, []);

  const handleOpenChest  = useCallback(() => setChestOpen(true),  []);
  const handleCloseChest = useCallback(() => setChestOpen(false), []);

  const handleChestUpdate = useCallback(async (newInv) => {
    setChest(newInv); chestRef.current = newInv;
    try { await api.patch(`/homestead/rooms/${roomRef.current?.id}/chest`, { chest_inventory: newInv }); }
    catch (e) { console.warn("[Hearthroot] Failed to save chest:", e); }
  }, []);

  const handleObjectsUpdate = useCallback(async (newObjects) => {
    setPlacedObjects(newObjects); objectsRef.current = newObjects;
    try { await api.patch(`/homestead/rooms/${roomRef.current?.id}/objects`, { placed_objects: newObjects }); }
    catch (e) { console.warn("[Hearthroot] Failed to save objects:", e); }
  }, []);

  const [runCoOp, setRunCoOp] = useState(false);

  const handleRunStart = useCallback(({ seed, coOp = false, runType: rt = "forest" }) => {
    setRunSeed(seed); setRunCoOp(coOp); setRunType(rt);
    setPhase("run");
  }, []);

  const handleLobbyCancel  = useCallback(() => setPhase("homestead"), []);
  const handleRunComplete  = useCallback((loot) => { setRunLoot(loot); setRunKills(loot.kills ?? 0); setPhase("loot"); }, []);
  const handleReturnHome   = useCallback(() => setPhase("homestead"), []);

  // ── Audio ────────────────────────────────────────────────────────────────────
  const { unlockAudio } = useGameAudio(phase, runType);
  // Unlock on first user gesture anywhere in the game (browser autoplay policy)
  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown",     unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown",     unlock);
    };
  }, [unlockAudio]);

  if (phase === "lobby") return <HomesteadLobby onRoomReady={handleRoomReady} />;

  if (phase === "homestead") return (
    <HomesteadView
      key={room?.id}
      room={room} role={role}
      chestInventory={chest} chestOpen={chestOpen}
      placedObjects={placedObjects}
      equipment={equipment} character={character}
      hotbar={hotbar} onHotbarChange={handleHotbarChange}
      onStartRun={handleStartRun}
      onJoinRun={handleJoinRun}
      onOpenChest={handleOpenChest} onCloseChest={handleCloseChest}
      onChestUpdate={handleChestUpdate}
      onEquipItem={handleEquipItem}
      onObjectsUpdate={handleObjectsUpdate}
      onCharacterUpdate={handleCharacterUpdate}
    />
  );

  if (phase === "run_lobby") return (
    <RunLobby
      room={room} role={role}
      joining={isJoiningRun} joinSeed={joinRunSeed} runType={joinRunType}
      onRunStart={handleRunStart} onCancel={handleLobbyCancel}
    />
  );

  if (phase === "run") {
    const runKey = `run_${runSeed}`;
    const sharedProps = { room, seed:runSeed, coOp:runCoOp, onRunComplete:handleRunComplete, character, equipment, hotbar, onHotbarChange: handleHotbarChange };
    if (runType === "mining")  return <MiningRun  key={runKey} {...sharedProps} />;
    if (runType === "fruit")   return <FruitRun   key={runKey} {...sharedProps} />;
    if (runType === "fishing") return <FishingRun key={runKey} {...sharedProps} />;
    return <ForestRun key={runKey} {...sharedProps} />;
  }

  if (phase === "loot") return (
    <LootSummary
      room={room} runLoot={runLoot} kills={runKills}
      chestInventory={chestRef.current}
      onReturnHome={handleReturnHome}
      onChestUpdate={handleChestUpdate}
    />
  );

  return null;
}