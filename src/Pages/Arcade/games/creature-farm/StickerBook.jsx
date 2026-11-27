// src/Pages/Arcade/games/creature-farm/StickerBook.jsx
//
// The Sticker Book: a page per number of types. Found mixes show the creature;
// missing ones are dark silhouettes with the "recipe" (which types to mix).
// Rewards along the top: claim them with a big button.
// Used in the Ranch panel (Stickers tab) and as a full-screen book in walk mode.

import React, { useState } from "react";
import { C } from "../../ui";
import { SPECIES } from "./species";
import { Portrait } from "./RanchPanel";
import { lookFor } from "./eggs";
import { STICKERS, PAGES, stickerGenes, stickerName, rewardsFor, stickerCount, pageCount, pageSize } from "./stickers";

const btn = (active = false, extra = {}) => ({
  padding: "8px 12px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 800,
  background: active ? C.accent : "rgba(255,255,255,0.06)", color: active ? "#1a1300" : C.text,
  border: active ? "none" : "1px solid rgba(255,255,255,0.15)", ...extra,
});

function Sticker({ s, got, big }) {
  const dom = s.types[0];
  const genes = stickerGenes(s.types);
  const look = lookFor(genes, dom);
  const size = big ? 74 : 60;
  return (
    <div title={stickerName(s)} style={{
      width: size + 22, padding: "6px 4px 5px", borderRadius: 14, display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
      background: got ? "linear-gradient(160deg, rgba(255,255,255,0.14), rgba(255,255,255,0.04))" : "rgba(0,0,0,0.25)",
      border: got ? "2px solid rgba(255,214,90,0.55)" : "2px dashed rgba(255,255,255,0.12)",
      boxShadow: got ? "0 3px 0 rgba(0,0,0,0.35)" : "none", transform: got ? "rotate(-1.5deg)" : "none",
    }}>
      <div style={{ filter: got ? "none" : "brightness(0) opacity(0.35)", position: "relative" }}>
        <Portrait species={dom} traits={{ hue: SPECIES[dom].hue, size: 1, ...(look ? { look } : {}) }} size={size} />
        {!got && <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 900, color: "rgba(255,255,255,0.5)", filter: "none" }}>?</span>}
      </div>
      <div style={{ fontSize: 10, fontWeight: 800, textAlign: "center", lineHeight: 1.15, color: got ? C.text : C.faint, minHeight: 23 }}>
        {s.types.map(t => SPECIES[t].name).join(" + ")}
      </div>
    </div>
  );
}

export default function StickerBook({ world, W, big = false }) {
  const [page, setPage] = useState(1);
  const total = STICKERS.length, n = stickerCount(world);
  const rewards = rewardsFor(world);
  const ready = rewards.filter(r => r.ready && !r.claimed);
  const next = rewards.filter(r => !r.ready && r.at != null).sort((a, b) => a.at - b.at)[0];
  const list = STICKERS.filter(s => s.page === page);
  const got = (s) => !!(world.stickers || {})[s.key];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{ fontSize: big ? 22 : 16, fontWeight: 900 }}>Sticker Book · {n}/{total}</div>
        <div style={{ flex: 1, minWidth: 120, height: 10, borderRadius: 6, background: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${(n / total) * 100}%`, background: "linear-gradient(90deg, #ffd65a, #ff8ab8)" }} />
        </div>
      </div>

      {ready.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {ready.map(r => (
            <button key={r.id} data-claim={r.id} disabled={!W.canAct} onClick={() => W.dispatch({ type: "claim_sticker", id: r.id })}
              style={{ ...btn(true, { padding: big ? "12px 16px" : "9px 12px", fontSize: big ? 16 : 13, background: "linear-gradient(90deg, #ffd65a, #ff9ac6)", textAlign: "left" }) }}>
              Claim: {r.text}
            </button>
          ))}
        </div>
      )}
      {next && (
        <div style={{ fontSize: 12, color: C.dim }}>
          Next prize at {next.at} stickers ({next.at - n} to go): <b style={{ color: C.text }}>{next.text}</b>
        </div>
      )}

      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {PAGES.map(p => {
          const done = pageCount(world, p.n), size = pageSize(p.n);
          return (
            <button key={p.n} onClick={() => setPage(p.n)} style={btn(page === p.n, { padding: "6px 10px", fontSize: 12 })}>
              {p.name} <span style={{ opacity: 0.75 }}>{done}/{size}</span>
            </button>
          );
        })}
      </div>
      <div style={{ fontSize: 11, color: C.faint }}>
        {page === 1 ? "Have one of each kind of creature." : `Hatch babies that mix ${page} types. Dark stickers show which types to mix.`}
        {" "}{rewards.find(r => r.page === page)?.text}{rewards.find(r => r.page === page)?.claimed ? " (claimed)" : ""}.
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {list.map(s => <Sticker key={s.key} s={s} got={got(s)} big={big} />)}
      </div>
    </div>
  );
}

// little helper so other screens can show "2 prizes to claim"
export function StickerBadge({ world }) {
  const n = rewardsFor(world).filter(r => r.ready && !r.claimed).length;
  if (!n) return null;
  return <span style={{ marginLeft: 6, padding: "1px 7px", borderRadius: 9, background: "#ff8ab8", color: "#3a0020", fontSize: 11, fontWeight: 900 }}>{n}</span>;
}