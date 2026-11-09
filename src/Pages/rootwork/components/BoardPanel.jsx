// src/Pages/rootwork/components/BoardPanel.jsx — Town → Board tab
// Inner tabs: 📜 Contracts · 🏗️ Projects · 🏅 Seal Shop

import React, { useState } from "react";
import {
  isContractsUnlocked, getSeals, getContractSlotCount, getContractView, getActiveContractBoosts,
  getDeliverableContractCount, CONTRACT_REFILL_SECONDS,
  SEAL_SHOP_ITEMS, SEAL_SHOP_ORDER, getSealShopCost, getSealShopTimesBought, canBuySealShopItem,
  PROJECT_ORDER, PROJECTS, isProjectUnlocked, getProjectView,
} from "../gameEngine";
import ProjectsPanel from "./ProjectsPanel";

function fmt(n) {
  const v = Math.floor(n ?? 0);
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(v >= 10_000_000 ? 0 : 1)}M`;
  if (v >= 10_000) return `${Math.round(v / 1000)}k`;
  if (v >= 1_000) return `${(v / 1000).toFixed(1)}k`;
  return `${v}`;
}

function fmtTime(seconds) {
  const s = Math.max(0, Math.ceil(seconds ?? 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

function SealBadge({ seals }) {
  return (
    <span style={{
      fontSize: "0.72rem", fontWeight: 700, padding: "0.2rem 0.6rem", borderRadius: "999px",
      background: "rgba(250,204,21,0.15)", border: "1px solid rgba(250,204,21,0.5)", color: "#b45309",
    }}>
      🏅 {seals} seal{seals !== 1 ? "s" : ""}
    </span>
  );
}

// ─── Contracts ────────────────────────────────────────────────────────────────

function ContractCard({ view, slotIndex, onDeliver, onAbandon }) {
  const [confirmAbandon, setConfirmAbandon] = useState(false);
  const tier = view.tierDef;
  const timePct = view.totalSeconds > 0 ? view.secondsLeft / view.totalSeconds : 0;
  const urgent = view.secondsLeft < 120;

  return (
    <div className="card p-4" style={{
      marginBottom: "0.6rem",
      border: view.canDeliver ? "1px solid #4ade80" : undefined,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: "0.82rem", fontWeight: 700 }}>{view.requesterEmoji} {view.requester}</div>
          <div style={{ fontSize: "0.66rem", color: "var(--muted)" }}>
            {tier.emoji} {tier.name} contract
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: urgent ? "#ef4444" : "var(--text)" }}>
            ⏳ {fmtTime(view.secondsLeft)}
          </div>
          <div style={{ fontSize: "0.66rem", color: "#b45309", fontWeight: 600 }}>
            🏅 {view.totalSeals}{view.givesBoost ? " + boost" : ""}
          </div>
        </div>
      </div>

      <div style={{ marginTop: "0.4rem", height: 3, borderRadius: 3, background: "var(--border)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${Math.min(100, timePct * 100)}%`, background: urgent ? "#ef4444" : "#a78bfa" }} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", marginTop: "0.5rem" }}>
        {view.items.map((item) => (
          <div key={item.key} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            fontSize: "0.72rem", padding: "0.3rem 0.5rem", borderRadius: "7px",
            background: item.enough ? "rgba(74,222,128,0.08)" : "var(--bg)",
            border: `1px solid ${item.enough ? "rgba(74,222,128,0.3)" : "var(--border)"}`,
          }}>
            <span>{item.enough ? "✅" : item.emoji} <strong>{fmt(item.amount)}</strong> {item.name}</span>
            <span style={{ color: item.enough ? "#4ade80" : "var(--muted)", fontSize: "0.66rem" }}>
              have {fmt(item.have)}
            </span>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.55rem" }}>
        <button
          onClick={() => onDeliver(slotIndex)}
          disabled={!view.canDeliver}
          className="btn"
          style={{ flex: 1, fontSize: "0.78rem", padding: "0.45rem", opacity: view.canDeliver ? 1 : 0.45 }}>
          {view.canDeliver ? "📦 Deliver" : "Not enough yet"}
        </button>
        <button
          onClick={() => {
            if (confirmAbandon) { setConfirmAbandon(false); onAbandon(slotIndex); }
            else { setConfirmAbandon(true); setTimeout(() => setConfirmAbandon(false), 3000); }
          }}
          className="btn btn-secondary"
          style={{ fontSize: "0.68rem", padding: "0.45rem 0.6rem", color: confirmAbandon ? "#ef4444" : undefined, borderColor: confirmAbandon ? "#ef4444" : undefined }}>
          {confirmAbandon ? "Tap again" : "Tear up"}
        </button>
      </div>
    </div>
  );
}

function ContractsTab({ game, onDeliver, onAbandon }) {
  if (!isContractsUnlocked(game)) {
    return (
      <div className="card p-4" style={{ fontSize: "0.75rem", color: "var(--muted)", lineHeight: 1.6 }}>
        <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text)", marginBottom: "0.25rem" }}>📜 Contracts</div>
        Build the <strong style={{ color: "var(--text)" }}>Market Hall</strong> to open the contracts board.
        Towns will send you orders for things you already make — fill them before the timer runs out
        to earn 🏅 Charter Seals for the Seal Shop.
      </div>
    );
  }

  const slotCount = getContractSlotCount(game);
  const slots = game.contracts?.slots ?? [];
  const refill = game.contracts?.refill ?? [];
  const boosts = getActiveContractBoosts(game);

  return (
    <div>
      <div className="card p-4" style={{ marginBottom: "0.6rem", fontSize: "0.7rem", color: "var(--muted)", lineHeight: 1.5 }}>
        Deliver everything on a contract before time runs out. Easy pays 🏅1, Standard 🏅2, Rush 🏅4 plus a
        15-minute boost. Torn-up or expired contracts are replaced after {Math.round(CONTRACT_REFILL_SECONDS / 60)} min.
        {(game.contracts?.completed ?? 0) > 0 && (
          <div style={{ marginTop: "0.2rem" }}>Delivered so far: {game.contracts.completed}</div>
        )}
      </div>

      {boosts.length > 0 && (
        <div className="card p-3" style={{ marginBottom: "0.6rem" }}>
          <div style={{ fontSize: "0.72rem", fontWeight: 600, marginBottom: "0.3rem" }}>⚡ Active boosts</div>
          {boosts.map((b, i) => (
            <div key={`${b.key}_${i}`} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem" }}>
              <span>{b.emoji} {b.label}</span>
              <span style={{ color: "var(--muted)" }}>{fmtTime(b.secondsLeft)}</span>
            </div>
          ))}
        </div>
      )}

      {Array.from({ length: slotCount }).map((_, i) => {
        const contract = slots[i];
        if (contract) {
          return (
            <ContractCard key={contract.id} view={getContractView(game, contract)} slotIndex={i}
              onDeliver={onDeliver} onAbandon={onAbandon} />
          );
        }
        return (
          <div key={`empty_${i}`} className="card p-3" style={{ marginBottom: "0.6rem", fontSize: "0.72rem", color: "var(--muted)", textAlign: "center", opacity: 0.7 }}>
            📭 New contract arriving in {fmtTime(refill[i] ?? 0)}
          </div>
        );
      })}
    </div>
  );
}

// ─── Seal Shop ────────────────────────────────────────────────────────────────

function ShopTab({ game, onBuy }) {
  const seals = getSeals(game);
  const unlockedProjects = PROJECT_ORDER.filter((id) => isProjectUnlocked(game, id));

  return (
    <div>
      <div className="card p-4" style={{ marginBottom: "0.6rem", fontSize: "0.7rem", color: "var(--muted)", lineHeight: 1.5 }}>
        Spend 🏅 Charter Seals from contracts. Everything here is permanent or goes straight into your stock.
      </div>
      {SEAL_SHOP_ORDER.map((id) => {
        const def = SEAL_SHOP_ITEMS[id];
        const cost = getSealShopCost(game, id);
        const bought = getSealShopTimesBought(game, id);
        const soldOut = cost == null;
        const affordable = !soldOut && seals >= cost;
        return (
          <div key={id} className="card p-4" style={{ marginBottom: "0.6rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: "0.82rem", fontWeight: 700 }}>{def.emoji} {def.name}</div>
                <div style={{ fontSize: "0.68rem", color: "var(--muted)", marginTop: "0.1rem" }}>{def.description}</div>
                {bought > 0 && <div style={{ fontSize: "0.62rem", color: "var(--muted)", marginTop: "0.1rem" }}>Bought {bought}×</div>}
              </div>
              <span style={{ flexShrink: 0, fontSize: "0.75rem", fontWeight: 700, color: soldOut ? "var(--muted)" : affordable ? "#b45309" : "var(--muted)" }}>
                {soldOut ? "Sold out" : `🏅 ${cost}`}
              </span>
            </div>

            {!soldOut && !def.needsProject && (
              <button onClick={() => onBuy(id, null)} disabled={!affordable} className="btn w-full"
                style={{ marginTop: "0.5rem", fontSize: "0.75rem", padding: "0.4rem", opacity: affordable ? 1 : 0.45 }}>
                {affordable ? "Buy" : `Need ${cost - seals} more 🏅`}
              </button>
            )}

            {!soldOut && def.needsProject && (
              unlockedProjects.length === 0 ? (
                <div style={{ fontSize: "0.66rem", color: "var(--muted)", marginTop: "0.4rem" }}>Unlock a Town Project first.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", marginTop: "0.5rem" }}>
                  {unlockedProjects.map((pid) => {
                    const p = PROJECTS[pid];
                    const view = getProjectView(game, pid);
                    const ok = canBuySealShopItem(game, id, pid).ok;
                    return (
                      <button key={pid} onClick={() => onBuy(id, pid)} disabled={!ok} className="btn"
                        style={{ fontSize: "0.72rem", padding: "0.35rem 0.5rem", opacity: ok ? 1 : 0.45, display: "flex", justifyContent: "space-between" }}>
                        <span>{p.emoji} {p.name} · stage {view.stage + 1}</span>
                        <span>{Math.round(view.pct * 100)}% built</span>
                      </button>
                    );
                  })}
                </div>
              )
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Board ────────────────────────────────────────────────────────────────────

export default function BoardPanel({ game, onProjectDeposit, onDeliverContract, onAbandonContract, onBuySealShopItem }) {
  const [tab, setTab] = useState("contracts");
  const deliverable = getDeliverableContractCount(game);
  const seals = getSeals(game);

  const tabs = [
    ["contracts", "📜 Contracts", deliverable],
    ["projects", "🏗️ Projects", 0],
    ["shop", "🏅 Seal Shop", 0],
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
        <span style={{ fontSize: "0.95rem", fontWeight: 700 }}>📋 Town Board</span>
        <SealBadge seals={seals} />
      </div>
      <div style={{ display: "flex", gap: "0.35rem", marginBottom: "0.75rem" }}>
        {tabs.map(([id, label, badge]) => (
          <button key={id} onClick={() => setTab(id)} className="btn"
            style={{
              flex: 1, fontSize: "0.7rem", padding: "0.35rem", position: "relative",
              background: tab === id ? "var(--accent)" : "var(--card)",
              color: tab === id ? "#fff" : "var(--text)",
              border: `1px solid ${tab === id ? "var(--accent)" : "var(--border)"}`,
            }}>
            {label}
            {badge > 0 && (
              <span style={{
                position: "absolute", top: "2px", right: "4px", background: "#4ade80", color: "#14532d",
                fontSize: "0.5rem", fontWeight: 700, borderRadius: "999px", padding: "1px 4px", lineHeight: 1.4,
              }}>{badge}</span>
            )}
          </button>
        ))}
      </div>

      {tab === "contracts" && <ContractsTab game={game} onDeliver={onDeliverContract} onAbandon={onAbandonContract} />}
      {tab === "projects" && <ProjectsPanel game={game} onDeposit={onProjectDeposit} />}
      {tab === "shop" && <ShopTab game={game} onBuy={onBuySealShopItem} />}
    </div>
  );
}