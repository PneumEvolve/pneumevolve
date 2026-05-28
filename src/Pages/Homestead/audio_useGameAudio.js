// src/Pages/Homestead/audio_useGameAudio.js
// Hook that handles game music: loads tracks, crossfades between homestead
// and run music when the phase changes, and exposes an unlock() for the
// first user interaction (WebAudio policy).
//
// Extracted from index.jsx.

import { useCallback, useEffect, useRef } from "react";

const AUDIO_HOMESTEAD  = "/audio/homestead.mp3";
const AUDIO_RUN_TRACKS = { default: "/audio/run.mp3" };
const FADE_S = 1.5;

export function useGameAudio(phase, runType) {
  const ctxRef    = useRef(null);
  const tracksRef = useRef({});
  const activeRef = useRef(null);
  const fadeRef   = useRef(null);

  const getCtx = useCallback(() => {
    if (!ctxRef.current) ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    return ctxRef.current;
  }, []);

  const loadTrack = useCallback(async (url) => {
    const existing = tracksRef.current[url];
    if (existing) return existing;
    const ctx   = getCtx();
    const entry = { buffer: null, gainNode: ctx.createGain(), sourceNode: null };
    entry.gainNode.gain.value = 0;
    entry.gainNode.connect(ctx.destination);
    tracksRef.current[url] = entry;
    try {
      const res = await fetch(url);
      const ab  = await res.arrayBuffer();
      entry.buffer = await ctx.decodeAudioData(ab);
    } catch (e) { console.warn("[audio] failed to load", url, e); }
    return entry;
  }, [getCtx]);

  const playTrack = useCallback((entry, ctx) => {
    if (!entry.buffer) return;
    if (entry.sourceNode) { try { entry.sourceNode.stop(); } catch {} entry.sourceNode.disconnect(); }
    const src = ctx.createBufferSource();
    src.buffer = entry.buffer; src.loop = true;
    src.connect(entry.gainNode); src.start(0);
    entry.sourceNode = src;
  }, []);

  const crossfadeTo = useCallback(async (targetUrl) => {
    const ctx = getCtx();
    if (ctx.state === "suspended") return;
    const [incoming, outgoing] = await Promise.all([
      loadTrack(targetUrl),
      activeRef.current ? loadTrack(activeRef.current) : Promise.resolve(null),
    ]);
    if (!incoming.buffer) return;
    if (!incoming.sourceNode) playTrack(incoming, ctx);
    if (fadeRef.current) cancelAnimationFrame(fadeRef.current);
    const inStart  = incoming.gainNode.gain.value;
    const outStart = outgoing?.gainNode.gain.value ?? 0;
    const t0 = performance.now();
    function tick() {
      const p    = Math.min((performance.now() - t0) / 1000 / FADE_S, 1);
      const ease = p * p * (3 - 2 * p);
      incoming.gainNode.gain.value = inStart + (1 - inStart) * ease;
      if (outgoing) outgoing.gainNode.gain.value = outStart * (1 - ease);
      if (p < 1) { fadeRef.current = requestAnimationFrame(tick); }
      else {
        incoming.gainNode.gain.value = 1;
        if (outgoing) { outgoing.gainNode.gain.value = 0; try { outgoing.sourceNode?.stop(); } catch {} outgoing.sourceNode = null; }
        fadeRef.current = null;
      }
    }
    fadeRef.current = requestAnimationFrame(tick);
    activeRef.current = targetUrl;
  }, [getCtx, loadTrack, playTrack]);

  useEffect(() => {
    const isRun = phase === "run" || phase === "run_lobby";
    const target = isRun ? (AUDIO_RUN_TRACKS[runType] ?? AUDIO_RUN_TRACKS.default) : AUDIO_HOMESTEAD;
    loadTrack(AUDIO_HOMESTEAD);
    loadTrack(AUDIO_RUN_TRACKS[runType] ?? AUDIO_RUN_TRACKS.default);
    crossfadeTo(target);
  }, [phase, runType, crossfadeTo, loadTrack]);

  useEffect(() => () => {
    if (fadeRef.current) cancelAnimationFrame(fadeRef.current);
    Object.values(tracksRef.current).forEach(t => { try { t.sourceNode?.stop(); } catch {} });
    ctxRef.current?.close();
  }, []);

  const unlockAudio = useCallback(async () => {
    const ctx = getCtx();
    if (ctx.state === "suspended") {
      await ctx.resume();
      if (activeRef.current) {
        const entry = tracksRef.current[activeRef.current];
        if (entry?.buffer && !entry.sourceNode) { playTrack(entry, ctx); entry.gainNode.gain.value = 1; }
      }
    }
  }, [getCtx, playTrack]);

  return { unlockAudio };
}
