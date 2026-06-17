// gameview_render.js — canvas rendering layer extracted from GameView.jsx
// Pure-ish draw functions. `draw` receives a `deps` object carrying the
// two component refs it reads ({ stateRef, joystickRef }).


import {
  DOOR_MAX_HP, FRAGMENT_PULSE_RANGE, MELEE_ARC, MELEE_RANGE,
  REPAIR_RANGE, SURVIVOR_HARVEST_CAST, SURVIVOR_INTERACT_RANGE, SURVIVOR_REPAIR_CAST,
  TURRET_RANGE, VEHICLE_TYPES, WORLD_H, WORLD_W,
  dist, getBuildingWallSegments, getCurrentWeather, getDoorCenter,
  isInsideBuilding, worldToCanvas,
} from "./deadMilesEngine";
import {
  drawJoystick,
} from "../Stronghold/mobileControls";

export const COL = {
  player:      "rgba(255,180,60,0.95)",
  player2:     "rgba(120,200,255,0.95)",
  zombie:      "#cc2222",
  zombieChase: "#ff4444",
};

export function drawPathToTarget(ctx, player, target, cam, W, H, s) {
  if (!target || !target.x || !target.y) return;
  
  const playerX = player.inVehicle ? s.vehicle.x : player.x;
  const playerY = player.inVehicle ? s.vehicle.y : player.y;
  const distToTarget = Math.hypot(target.x - playerX, target.y - playerY);
  
  if (distToTarget < 500) return;
  
  const start = worldToCanvas(playerX, playerY, cam);
  const end = worldToCanvas(target.x, target.y, cam);
  
  if (start.cx < -100 || start.cx > W + 100 || start.cy < -100 || start.cy > H + 100) return;
  if (end.cx < -100 || end.cx > W + 100 || end.cy < -100 || end.cy > H + 100) return;
  
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(start.cx, start.cy);
  ctx.lineTo(end.cx, end.cy);
  ctx.strokeStyle = "rgba(255,220,80,0.35)";
  ctx.lineWidth = 2.5;
  ctx.setLineDash([8, 12]);
  ctx.stroke();
  
  const angle = Math.atan2(end.cy - start.cy, end.cx - start.cx);
  const arrowSize = 10;
  const arrowX = end.cx;
  const arrowY = end.cy;
  ctx.beginPath();
  ctx.moveTo(arrowX, arrowY);
  ctx.lineTo(arrowX - arrowSize * Math.cos(angle - Math.PI / 6), arrowY - arrowSize * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(arrowX - arrowSize * Math.cos(angle + Math.PI / 6), arrowY - arrowSize * Math.sin(angle + Math.PI / 6));
  ctx.fillStyle = "rgba(255,220,80,0.5)";
  ctx.fill();
  ctx.setLineDash([]);
  ctx.restore();
}

export function draw(ctx, s, t, W, H, zoom = 1, deps = {}) {
    const { cam, player, player2, vehicle, buildings, zombies, floaters,
            gardenPlots, crops, lootPiles, wells, isNight } = s;

    ctx.fillStyle = isNight ? "#040609" : "#08090c";
    ctx.fillRect(0, 0, W, H);

    // ── Power zoom: scale around screen centre ────────────────────────────────
    if (zoom !== 1) {
      ctx.save();
      ctx.translate(W / 2, H / 2);
      ctx.scale(zoom, zoom);
      ctx.translate(-W / 2, -H / 2);
    }

    const { cx: wox, cy: woy } = worldToCanvas(0, 0, cam);
    ctx.fillStyle = isNight ? "#0d100b" : "#111510";
    ctx.fillRect(wox, woy, WORLD_W, WORLD_H);

    // Roads
    ctx.save();
    ctx.strokeStyle = isNight ? "#181c18" : "#1e2220";
    ctx.lineWidth = 42; ctx.lineCap = "round";
    s.roads.forEach(r => {
      const a = worldToCanvas(r.x1, r.y1, cam), b2 = worldToCanvas(r.x2, r.y2, cam);
      ctx.beginPath(); ctx.moveTo(a.cx, a.cy); ctx.lineTo(b2.cx, b2.cy); ctx.stroke();
    });
    ctx.strokeStyle = "rgba(255,255,255,0.03)"; ctx.lineWidth = 1.5;
    ctx.setLineDash([14, 18]);
    s.roads.forEach(r => {
      const a = worldToCanvas(r.x1, r.y1, cam), b2 = worldToCanvas(r.x2, r.y2, cam);
      ctx.beginPath(); ctx.moveTo(a.cx, a.cy); ctx.lineTo(b2.cx, b2.cy); ctx.stroke();
    });
    ctx.setLineDash([]); ctx.restore();

    // Garden plots
    gardenPlots.forEach(plot => {
      const { cx, cy } = worldToCanvas(plot.x, plot.y, cam);
      const crop = crops.find(c => c.plotId === plot.id);
      ctx.save();
      ctx.fillStyle = crop?.stage === "ready" ? "rgba(80,180,40,0.22)" : "rgba(40,90,20,0.22)";
      ctx.strokeStyle = crop?.stage === "ready" ? "rgba(100,210,60,0.6)" : "rgba(60,120,30,0.4)";
      ctx.lineWidth = 1.5; ctx.setLineDash([5, 5]);
      ctx.fillRect(cx, cy, plot.w, plot.h);
      ctx.strokeRect(cx, cy, plot.w, plot.h);
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.font = "10px sans-serif"; ctx.textAlign = "center";
      if (crop) {
        const pct = Math.min(1, crop.growTimer / crop.growTime);
        ctx.fillText(crop.stage === "ready" ? "🌿 F to harvest" : `${Math.floor(pct*100)}% grown`, cx + plot.w/2, cy + plot.h/2 + 4);
      } else {
        ctx.fillText("garden plot · F to plant", cx + plot.w/2, cy + plot.h/2 + 4);
      }
      ctx.restore();
    });

    // Wells
    if (wells) {
      wells.forEach(well => {
        const { cx: wx, cy: wy } = worldToCanvas(well.x, well.y, cam);
        ctx.save();
        ctx.beginPath(); ctx.arc(wx, wy, 12, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(160,145,120,0.92)"; ctx.fill();
        ctx.beginPath(); ctx.arc(wx, wy, 8, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(30,60,100,0.85)"; ctx.fill();
        ctx.beginPath(); ctx.arc(wx - 2, wy - 2, 4 + 1.5 * Math.sin(t * 2.2), 0, Math.PI * 2);
        ctx.fillStyle = "rgba(80,160,255,0.35)"; ctx.fill();
        ctx.beginPath(); ctx.arc(wx, wy, 12, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(200,185,155,0.7)"; ctx.lineWidth = 2; ctx.stroke();
        ctx.strokeStyle = "rgba(140,100,55,0.85)"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(wx - 13, wy - 10); ctx.lineTo(wx - 13, wy + 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(wx + 13, wy - 10); ctx.lineTo(wx + 13, wy + 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(wx - 13, wy - 10); ctx.lineTo(wx + 13, wy - 10); ctx.stroke();
        ctx.fillStyle = "rgba(180,230,255,0.7)"; ctx.font = "bold 9px sans-serif"; ctx.textAlign = "center";
        ctx.fillText("💧 well", wx, wy + 22);
        ctx.restore();
      });
    }

    // Deposit chest (homebase only)
    if (s.depositChest) {
      const ch = s.depositChest;
      const { cx: chx, cy: chy } = worldToCanvas(ch.x, ch.y, cam);
      if (chx > -60 && chx < W + 60 && chy > -60 && chy < H + 60) {
        ctx.save();
        // Pulsing glow
        const pulse = 0.25 + 0.1 * Math.sin(t * 3.0);
        ctx.globalAlpha = pulse;
        ctx.beginPath(); ctx.arc(chx, chy, 28, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(120,220,150,1)"; ctx.fill();
        ctx.globalAlpha = 1;
        // Crate body
        ctx.fillStyle = "rgba(180,140,70,0.95)";
        ctx.strokeStyle = "rgba(255,220,100,0.9)";
        ctx.lineWidth = 2;
        const hw = 18, hh = 14;
        ctx.beginPath();
        ctx.roundRect(chx - hw, chy - hh, hw * 2, hh * 2, 3);
        ctx.fill(); ctx.stroke();
        // Cross banding
        ctx.strokeStyle = "rgba(255,200,60,0.7)"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(chx, chy - hh); ctx.lineTo(chx, chy + hh); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(chx - hw, chy); ctx.lineTo(chx + hw, chy); ctx.stroke();
        // Label
        ctx.fillStyle = "rgba(120,255,160,0.95)";
        ctx.font = "bold 9px sans-serif"; ctx.textAlign = "center";
        ctx.fillText("📦 DEPOSIT [E]", chx, chy + hh + 14);
        ctx.restore();
      }
    }

    // Settlement aura rings (visible from distance as orientation landmarks)
    if (s.settlements) {
      s.settlements.forEach(st => {
        const { cx: scx, cy: scy } = worldToCanvas(st.cx, st.cy, cam);
        if (scx < -600 || scx > W + 600 || scy < -600 || scy > H + 600) return;
        const cleared = s.fragmentsCollected?.includes(st.id);
        ctx.save();
        ctx.globalAlpha = 0.06;
        ctx.beginPath(); ctx.arc(scx, scy, 500, 0, Math.PI * 2);
        ctx.fillStyle = cleared ? "rgba(120,255,150,1)" : "rgba(255,220,80,1)";
        ctx.fill();
        ctx.globalAlpha = 0.18;
        ctx.beginPath(); ctx.arc(scx, scy, 500, 0, Math.PI * 2);
        ctx.strokeStyle = cleared ? "rgba(120,255,150,0.7)" : "rgba(255,220,80,0.5)";
        ctx.lineWidth = 1.5; ctx.setLineDash([6, 10]); ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = cleared ? "rgba(120,255,150,0.85)" : "rgba(255,220,80,0.75)";
        ctx.font = "bold 11px sans-serif"; ctx.textAlign = "center";
        ctx.fillText((cleared ? "✓ " : "") + st.name, scx, scy - 520);
        ctx.restore();
      });
    }

    // Buildings
    buildings.forEach(b => { drawBuilding(ctx, b, cam, isNight, player); });

    // Blueprint ghosts (Task 2.3) — shown on homebase run when blueprints are queued
    if (s.blueprints?.length > 0) {
      const pulse = 0.6 + 0.4 * Math.sin(t * 2.5);
      s.blueprints.forEach(bp => {
        const { cx: bx, cy: by } = worldToCanvas(bp.x, bp.y, cam);
        ctx.save();
        ctx.globalAlpha = 0.55 + 0.2 * pulse;
        if (bp.type === "turret") {
          // Range ring
          ctx.beginPath(); ctx.arc(bx, by, TURRET_RANGE, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(255,200,80,0.12)"; ctx.lineWidth = 1; ctx.stroke();
          // Ghost body
          ctx.beginPath(); ctx.arc(bx, by, 14, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(255,200,60,0.22)"; ctx.fill();
          ctx.strokeStyle = "rgba(255,200,60,0.6)"; ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]);
          ctx.fillStyle = "rgba(255,220,80,0.9)"; ctx.font = "12px sans-serif"; ctx.textAlign = "center";
          ctx.fillText("🗼", bx, by + 4);
        } else if (bp.type === "crop_plot") {
          const pw = 80, ph = 70;
          ctx.fillStyle = "rgba(80,200,60,0.12)";
          ctx.strokeStyle = "rgba(120,220,60,0.55)"; ctx.lineWidth = 1.5;
          ctx.setLineDash([5, 5]);
          ctx.fillRect(bx - pw / 2, by - ph / 2, pw, ph);
          ctx.strokeRect(bx - pw / 2, by - ph / 2, pw, ph);
          ctx.setLineDash([]);
          ctx.fillStyle = "rgba(180,255,120,0.9)"; ctx.font = "12px sans-serif"; ctx.textAlign = "center";
          ctx.fillText("🌱", bx, by + 5);
        } else {
          // Workshop structure ghost (kitchen, workshop, farm, guard_post)
          const WORKSHOP_ICONS = { kitchen: "🍳", workshop: "🔧", farm: "🌾", guard_post: "🛡️" };
          const WORKSHOP_COLORS = {
            kitchen:    "rgba(255,160,60,0.55)",
            workshop:   "rgba(255,200,60,0.55)",
            farm:       "rgba(120,210,80,0.55)",
            guard_post: "rgba(255,100,80,0.55)",
          };
          const col = WORKSHOP_COLORS[bp.type] ?? "rgba(180,180,255,0.55)";
          const icon = WORKSHOP_ICONS[bp.type] ?? "🏗";
          const hw = 36, hh = 36;
          ctx.fillStyle = col.replace("0.55", "0.10");
          ctx.strokeStyle = col;
          ctx.lineWidth = 1.5;
          ctx.setLineDash([5, 5]);
          ctx.fillRect(bx - hw, by - hh, hw * 2, hh * 2);
          ctx.strokeRect(bx - hw, by - hh, hw * 2, hh * 2);
          ctx.setLineDash([]);
          ctx.font = "18px sans-serif"; ctx.textAlign = "center";
          ctx.fillText(icon, bx, by + 6);
        }
        // Build-progress bar if being built by a survivor
        if (bp._buildProgress > 0) {
          const pct = Math.min(1, bp._buildProgress / 3.0);
          ctx.globalAlpha = 0.9;
          ctx.fillStyle = "rgba(0,0,0,0.5)";
          ctx.fillRect(bx - 22, by - 26, 44, 5);
          ctx.fillStyle = "rgba(120,255,150,0.9)";
          ctx.fillRect(bx - 22, by - 26, 44 * pct, 5);
        }
        // "[F] Build" label for nearby player
        const playerDist = Math.hypot(bp.x - (player.inVehicle ? s.vehicle?.x ?? player.x : player.x),
                                      bp.y - (player.inVehicle ? s.vehicle?.y ?? player.y : player.y));
        if (playerDist < 90) {
          ctx.globalAlpha = 0.85;
          ctx.fillStyle = "rgba(0,0,0,0.55)";
          ctx.beginPath(); ctx.roundRect?.(bx - 34, by - 42, 68, 14, 3); ctx.fill();
          ctx.fillStyle = "rgba(255,220,80,0.95)"; ctx.font = "10px sans-serif"; ctx.textAlign = "center";
          ctx.fillText("[F] Build", bx, by - 31);
        }
        ctx.restore();
      });
    }

    // Built workshop structures (kitchen, workshop, farm, guard_post) — solid icons.
    // These live in s.homeBase.builtStructures once a blueprint is completed. Without
    // this pass the icon vanishes the instant the ghost is removed from s.blueprints.
    const builtStructs = s.homeBase?.builtStructures ?? [];
    if (builtStructs.length > 0) {
      const STRUCT_ICONS = { kitchen: "🍳", workshop: "🔧", farm: "🌾", guard_post: "🛡️" };
      const STRUCT_COLORS = {
        kitchen:    "rgba(255,160,60,1)",
        workshop:   "rgba(255,200,60,1)",
        farm:       "rgba(120,210,80,1)",
        guard_post: "rgba(255,100,80,1)",
      };
      builtStructs.forEach(st => {
        if (st.x == null || st.y == null) return;
        const { cx: bx, cy: by } = worldToCanvas(st.x, st.y, cam);
        const col = STRUCT_COLORS[st.type] ?? "rgba(180,180,255,1)";
        const icon = STRUCT_ICONS[st.type] ?? "🏗";
        const hw = 36, hh = 36;
        ctx.save();
        // Solid filled footprint with a bright border to read as "built".
        ctx.fillStyle = col.replace(",1)", ",0.16)");
        ctx.strokeStyle = col.replace(",1)", ",0.85)");
        ctx.lineWidth = 2;
        ctx.fillRect(bx - hw, by - hh, hw * 2, hh * 2);
        ctx.strokeRect(bx - hw, by - hh, hw * 2, hh * 2);
        // Corner accents so it clearly differs from a dashed ghost.
        ctx.fillStyle = col.replace(",1)", ",0.85)");
        const a = 8;
        ctx.fillRect(bx - hw, by - hh, a, 2); ctx.fillRect(bx - hw, by - hh, 2, a);
        ctx.fillRect(bx + hw - a, by - hh, a, 2); ctx.fillRect(bx + hw - 2, by - hh, 2, a);
        ctx.fillRect(bx - hw, by + hh - 2, a, 2); ctx.fillRect(bx - hw, by + hh - a, 2, a);
        ctx.fillRect(bx + hw - a, by + hh - 2, a, 2); ctx.fillRect(bx + hw - 2, by + hh - a, 2, a);
        ctx.font = "22px sans-serif"; ctx.textAlign = "center";
        ctx.fillText(icon, bx, by + 8);
        ctx.restore();
      });
    }

    // Turrets
    if (s.turrets) {
      s.turrets.forEach(t => drawTurret(ctx, t, cam, t.x, t.y, isNight, s, t));
    }

    // Loot piles (glow)
    lootPiles.forEach(pile => {
      if (pile.collected) return;
      const { cx, cy } = worldToCanvas(pile.x, pile.y, cam);
      const pulse = 0.6 + 0.4 * Math.sin(t * 3.5);
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, 14 * pulse, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,220,60,${0.08 * pulse})`; ctx.fill();
      ctx.beginPath(); ctx.arc(cx, cy, 7, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,220,60,${0.8 * pulse})`; ctx.fill();
      ctx.beginPath(); ctx.arc(cx - 2, cy - 2, 3, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,200,0.6)"; ctx.fill();
      ctx.restore();
    });

    // Vehicles (all — player fleet + convoy)
    const allVehicles = s.vehicles ?? [vehicle];
    // Build a combined list: fleet vehicles + convoy vehicles (with isConvoy flag)
    const convoyCfg = (s.convoyVehicles ?? []).map(e => ({ v: e.vehicle, isConvoy: true, svName: e.survivor?.name ?? "?" }));
    const fleetCfg  = allVehicles.map(v => ({ v, isConvoy: false, svName: null }));
    const allVehicleCfg = [...fleetCfg, ...convoyCfg];

    allVehicleCfg.forEach(({ v, isConvoy, svName }) => {
      const { cx: vcx, cy: vcy } = worldToCanvas(v.x, v.y, cam);
      const cfg = VEHICLE_TYPES[v.vehicleType] ?? VEHICLE_TYPES.car;
      const hw = cfg.width  / 2;
      const hh = cfg.height / 2;
      ctx.save(); ctx.translate(vcx, vcy); ctx.rotate(v.facing + Math.PI / 2);

      // Body colour — dimmer when not the active vehicle
      const isActive = v === vehicle;
      const bodyColor = v.hp < v.maxHp * 0.3 ? cfg.damageColor : cfg.color;
      ctx.globalAlpha = isActive ? 1 : isConvoy ? 0.82 : 0.75;
      ctx.fillStyle = bodyColor;
      ctx.fillRect(-hw, -hh, cfg.width, cfg.height);

      // Convoy vehicles: teal tint overlay to distinguish from player fleet
      if (isConvoy) {
        ctx.fillStyle = "rgba(80,220,200,0.18)";
        ctx.fillRect(-hw, -hh, cfg.width, cfg.height);
      }

      // Windscreen tint
      if (v.vehicleType !== "bike") {
        ctx.fillStyle = "rgba(120,180,255,0.3)";
        ctx.fillRect(-hw + 3, -hh + 4, cfg.width - 6, cfg.height * 0.28);
      }

      // Monster truck: big wheels hint
      if (v.vehicleType === "monster_truck") {
        ctx.fillStyle = "rgba(80,50,30,0.7)";
        ctx.fillRect(-hw - 5, -hh + 4, 5, 14);
        ctx.fillRect(hw,      -hh + 4, 5, 14);
        ctx.fillRect(-hw - 5,  hh - 18, 5, 14);
        ctx.fillRect(hw,       hh - 18, 5, 14);
      }

      if (v.hp < v.maxHp) {
        ctx.rotate(-(v.facing + Math.PI / 2));
        ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(-hw - 2, -hh - 10, (hw + 2) * 2, 3);
        ctx.fillStyle = v.hp / v.maxHp > 0.5 ? "#88ff88" : "#ff5555";
        ctx.fillRect(-hw - 2, -hh - 10, (hw + 2) * 2 * (v.hp / v.maxHp), 3);
      }
      ctx.restore();

      if (isConvoy) {
        // Convoy badge: teal label with survivor name
        ctx.save();
        ctx.font = "bold 9px sans-serif"; ctx.textAlign = "center";
        ctx.fillStyle = "rgba(80,220,200,0.9)";
        ctx.fillText(`🚗 ${svName}`, vcx, vcy - hh - 10);
        ctx.restore();
      } else {
        // Survivor passenger badge
        const svPassengers = v.survivorPassengers?.length ?? 0;
        if (svPassengers > 0) {
          ctx.save();
          ctx.font = "bold 9px sans-serif"; ctx.textAlign = "center";
          ctx.fillStyle = "rgba(255,200,60,0.9)";
          ctx.fillText(`👥 ${svPassengers}`, vcx + hh + 8, vcy);
          ctx.restore();
        }
      }
      if (!player.inVehicle) {
        const d = Math.sqrt((player.x - v.x)**2 + (player.y - v.y)**2);
        if (d < 70) {
          const driverFree    = v.driver === null;
          const passengerFree = v.passenger === null;
          const bothFull      = !driverFree && !passengerFree;
          ctx.save();
          ctx.font = "bold 11px sans-serif"; ctx.textAlign = "center";
          if (bothFull) {
            ctx.fillStyle = "rgba(255,100,100,0.75)";
            ctx.fillText("full", vcx, vcy - hh - 12);
          } else {
            ctx.fillStyle = "rgba(255,220,80,0.85)";
            ctx.fillText(driverFree ? `[F] ${cfg.label}` : "[F] ride shotgun", vcx, vcy - hh - 12);
          }
          if (d < REPAIR_RANGE && v.hp < v.maxHp) {
            ctx.fillStyle = "rgba(120,255,150,0.75)";
            ctx.fillText("[E] repair", vcx, vcy - hh - 24);
          }
          ctx.restore();
        }
      }
    });

    // Zombies
    zombies.forEach(z => {
      if (z.dead) return;
      const { cx, cy } = worldToCanvas(z.x, z.y, cam);
      if (cx < -20 || cx > W + 20 || cy < -20 || cy > H + 20) return;
      ctx.save(); ctx.globalAlpha = 0.88;

      // ── Dormant zombies: crouched, dark, only a faint red eye glow ────────
      if (z.state === "dormant") {
        const eyePulse = 0.3 + 0.25 * Math.sin(t * 1.8 + z.id * 0.7);
        ctx.globalAlpha = 0.38 + 0.12 * eyePulse;
        ctx.beginPath(); ctx.arc(cx, cy, z.radius * 0.8, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(60,10,10,0.95)"; ctx.fill();
        // Red pinprick eyes
        ctx.globalAlpha = 0.55 + 0.4 * eyePulse;
        ctx.beginPath(); ctx.arc(cx - 2.5, cy - 1, 1.5, 0, Math.PI * 2);
        ctx.arc(cx + 2.5, cy - 1, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,30,0,${0.7 + 0.3 * eyePulse})`; ctx.fill();
        ctx.restore();
        return;
      }

      const isBoss = z.type === "boss";
      const isBashing = z.state === "bash_door";
      const offX = isBashing ? (Math.random() - 0.5) * 3 : 0;
      const offY = isBashing ? (Math.random() - 0.5) * 3 : 0;

      if (isBoss) {
        // Boss: pulsing red with thick ring and skull
        const pulse = 0.7 + 0.3 * Math.sin(t * 6);
        ctx.globalAlpha = pulse;
        // Outer glow ring
        ctx.beginPath(); ctx.arc(cx, cy, z.radius + 8, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,30,30,0.5)"; ctx.lineWidth = 3; ctx.stroke();
        // Body
        ctx.beginPath(); ctx.arc(cx, cy, z.radius, 0, Math.PI * 2);
        ctx.fillStyle = z.state === "chase" || z.state === "attack"
          ? "rgba(255,30,30,0.98)" : "rgba(200,20,20,0.9)";
        ctx.fill();
        ctx.strokeStyle = "rgba(255,80,80,0.9)"; ctx.lineWidth = 2.5; ctx.stroke();
        ctx.globalAlpha = 0.95;
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.font = "bold 14px sans-serif"; ctx.textAlign = "center";
        ctx.fillText("☠", cx, cy + 5);
        // HP bar — wider for boss
        const hpFrac = z.hp / z.maxHp;
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(cx - 22, cy - z.radius - 8, 44, 4);
        ctx.fillStyle = hpFrac > 0.5 ? "#ff4444" : hpFrac > 0.25 ? "#ff8800" : "#ffcc00";
        ctx.fillRect(cx - 22, cy - z.radius - 8, 44 * hpFrac, 4);
        ctx.fillStyle = "rgba(255,80,80,0.9)"; ctx.font = "bold 9px sans-serif"; ctx.textAlign = "center";
        ctx.fillText("BOSS", cx, cy - z.radius - 10);
        ctx.restore();
        return;
      }

      ctx.beginPath(); ctx.arc(cx + offX, cy + offY, z.radius, 0, Math.PI * 2);
      ctx.fillStyle = isBashing ? "rgba(255,80,0,0.95)"
        : z.state === "chase" || z.state === "attack" ? COL.zombieChase : COL.zombie;
      ctx.fill();
      if (isBashing) {
        ctx.globalAlpha = 0.4 + 0.3 * Math.sin(t * 12);
        ctx.strokeStyle = "rgba(255,140,0,0.9)"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(cx + offX, cy + offY, z.radius + 4, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 0.88;
        ctx.fillStyle = "rgba(255,180,0,0.9)"; ctx.font = "bold 11px sans-serif"; ctx.textAlign = "center";
        ctx.fillText("💥", cx, cy - z.radius - 3);
      } else if (z.state === "alert") {
        ctx.globalAlpha = 0.9; ctx.fillStyle = "rgba(255,220,40,0.9)";
        ctx.font = "bold 11px sans-serif"; ctx.textAlign = "center";
        ctx.fillText("!", cx, cy - z.radius - 3);
      }
      const hpFrac = z.hp / z.maxHp;
      if (hpFrac < 1) {
        ctx.globalAlpha = 0.75;
        ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(cx - 8, cy - z.radius - 5, 16, 2.5);
        ctx.fillStyle = "#ff4444"; ctx.fillRect(cx - 8, cy - z.radius - 5, 16 * hpFrac, 2.5);
      }
      ctx.restore();
    });

    // Survivors
    if (s.survivors) {
      s.survivors.forEach(sv => {
        if (sv.hp <= 0) return;
        // Survivors riding in a vehicle are rendered on the vehicle, not separately
        if (sv.inVehicle && sv._ridingVehicle) return;
        const { cx, cy } = worldToCanvas(sv.x, sv.y, cam);
        if (cx < -30 || cx > W + 30 || cy < -30 || cy > H + 30) return;
        // Colour by command/state
        const col = sv.barricaded ? "rgba(255,100,100,0.95)"
          : sv.command === "assign" && sv.assignedTo?.structureType === "turret" ? "rgba(80,220,255,0.95)"
          : sv.command === "assign" && sv.assignedTo?.structureType === "crop"   ? "rgba(120,220,80,0.95)"
          : "rgba(255,200,60,0.95)"; // follow / unassigned = gold
        ctx.save();
        // Glow ring
        ctx.beginPath(); ctx.arc(cx, cy, 12 + 1.5 * Math.sin(t * 2.5), 0, Math.PI * 2);
        ctx.fillStyle = col.replace("0.95", "0.08"); ctx.fill();
        // Body
        ctx.beginPath(); ctx.arc(cx, cy, 7, 0, Math.PI * 2);
        ctx.fillStyle = col; ctx.fill();
        // HP bar
        if (sv.hp < sv.maxHp) {
          ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(cx - 10, cy - 14, 20, 2.5);
          ctx.fillStyle = sv.hp / sv.maxHp > 0.5 ? "#88ff88" : "#ff5555";
          ctx.fillRect(cx - 10, cy - 14, 20 * (sv.hp / sv.maxHp), 2.5);
        }
        // Name label
        ctx.fillStyle = "rgba(255,255,255,0.7)"; ctx.font = "bold 9px sans-serif"; ctx.textAlign = "center";
        ctx.fillText(sv.name, cx, cy - 17);
        // State icon
        const stateIcon = sv.barricaded ? "🔒"
          : sv._castType === "repair" ? "🔧"
          : sv._castType === "harvest" ? "🌿"
          : sv.state === "fleeing" ? "💨"
          : "";
        if (stateIcon) {
          ctx.font = "10px sans-serif";
          ctx.fillText(stateIcon, cx + 10, cy - 6);
        }
        // Cast bar for survivor working
        if (sv._castType && sv._castTimer > 0) {
          const castDur = sv._castType === "repair" ? SURVIVOR_REPAIR_CAST : SURVIVOR_HARVEST_CAST;
          const pct = Math.min(1, sv._castTimer / castDur);
          ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(cx - 14, cy + 10, 28, 3);
          ctx.fillStyle = sv._castType === "repair" ? "rgba(120,200,255,0.85)" : "rgba(120,220,80,0.85)";
          ctx.fillRect(cx - 14, cy + 10, 28 * pct, 3);
        }
        // Interaction prompt
        const dToPlayer = dist(sv.x, sv.y, player.x, player.y);
        if (dToPlayer < SURVIVOR_INTERACT_RANGE) {
          ctx.fillStyle = "rgba(255,220,80,0.85)"; ctx.font = "bold 10px sans-serif";
          ctx.fillText("[T] command", cx, cy - 28);
        }
        ctx.restore();
      });
    }

    // P2
    if (player2 && !player2.inVehicle) {
      const { cx, cy } = worldToCanvas(player2.x, player2.y, cam);
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, 11 + 1.5*Math.sin(t*3), 0, Math.PI*2);
      ctx.fillStyle = "rgba(120,200,255,0.1)"; ctx.fill();
      ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI*2);
      ctx.fillStyle = COL.player2; ctx.fill();
      ctx.restore();
    }

    if (!player.inVehicle) {
      const { cx, cy } = worldToCanvas(player.x, player.y, cam);
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, 13 + 2*Math.sin(t*3), 0, Math.PI*2);
      ctx.fillStyle = "rgba(255,180,60,0.08)"; ctx.fill();
      ctx.beginPath(); ctx.arc(cx, cy, 7, 0, Math.PI*2);
      ctx.fillStyle = player.hp <= 0 ? "rgba(255,80,80,0.5)" : COL.player; ctx.fill();

      // ── Bat swing arc animation ──────────────────────────────────────────
      if (player.weapon && player.swingTimer > 0) {
        const SWING_DUR = 1 / 1.8; // must match MELEE_RATE
        const progress  = Math.min(1, 1 - player.swingTimer / SWING_DUR);
        const arcStart  = player.swingAngle  ?? (player.facing - MELEE_ARC / 2);
        const arcEnd    = player.swingTarget ?? (player.facing + MELEE_ARC / 2);
        const sweepNow  = arcStart + progress * (arcEnd - arcStart);
        const alpha     = Math.max(0, 1 - progress * 1.5);

        // Filled wedge (swing zone)
        ctx.globalAlpha = alpha * 0.20;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, MELEE_RANGE * 0.9, arcStart, sweepNow);
        ctx.closePath();
        ctx.fillStyle = "rgba(255,220,80,1)";
        ctx.fill();

        // Bat stick — sweeps with the arc
        ctx.globalAlpha = alpha * 0.9;
        ctx.strokeStyle = "rgba(255,210,60,0.95)";
        ctx.lineWidth = 3.5;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(sweepNow) * MELEE_RANGE * 0.86, cy + Math.sin(sweepNow) * MELEE_RANGE * 0.86);
        ctx.stroke();

        // Tip glow
        ctx.globalAlpha = alpha * 0.75;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(sweepNow) * MELEE_RANGE * 0.86, cy + Math.sin(sweepNow) * MELEE_RANGE * 0.86, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,240,120,0.95)";
        ctx.fill();
      } else if (player.weapon) {
        // Idle: faint aim indicator
        ctx.globalAlpha = 0.20;
        ctx.strokeStyle = "rgba(255,220,80,0.9)";
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(player.facing) * 9, cy + Math.sin(player.facing) * 9);
        ctx.lineTo(cx + Math.cos(player.facing) * 22, cy + Math.sin(player.facing) * 22);
        ctx.stroke();
      }

      ctx.restore();
    }

    // ── Settlement compass arrow ───────────────────────────────────────────
    drawCompassArrow(ctx, s, t, W, H);

    // ── Downed partner arrow (P1 sees this when P2 is down, and vice versa) ─
    if (s.player2?.isDowned) {
      drawDownedPartnerArrow(ctx, s, t, W, H);
    }

    // Floaters
    floaters.forEach(f => {
      const { cx, cy } = worldToCanvas(f.x, f.y, cam);
      ctx.save(); ctx.globalAlpha = 1 - f.age / f.ttl;
      ctx.fillStyle = f.color ?? "rgba(255,220,80,0.95)";
      ctx.font = `${f.size ?? 12}px sans-serif`; ctx.textAlign = "center";
      ctx.fillText(f.text, cx, cy - f.age * 24); ctx.restore();
    });

    // Placement ghost (drawn in screen-space via placingHint — updated each React render)
    // We pass placingHintRef so we can read it from inside the draw call
    if (s._placingHint && s._placingMode) {
      const { x: gx, y: gy } = s._placingHint;
      ctx.save();
      if (s._placingMode === "turret") {
        ctx.globalAlpha = 0.55;
        ctx.beginPath(); ctx.arc(gx, gy, TURRET_RANGE, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(180,255,120,0.25)"; ctx.lineWidth = 1; ctx.stroke();
        ctx.beginPath(); ctx.arc(gx, gy, 14, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(100,180,60,0.7)"; ctx.fill();
        ctx.fillStyle = "rgba(180,255,120,0.9)"; ctx.font = "bold 11px sans-serif"; ctx.textAlign = "center";
        ctx.fillText("🗼", gx, gy - 18);
      } else if (s._placingMode === "crop_plot") {
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = "rgba(80,180,40,0.3)";
        ctx.strokeStyle = "rgba(100,210,60,0.7)";
        ctx.lineWidth = 1.5; ctx.setLineDash([5, 5]);
        ctx.fillRect(gx - 40, gy - 35, 80, 70);
        ctx.strokeRect(gx - 40, gy - 35, 80, 70);
        ctx.setLineDash([]);
        ctx.fillStyle = "rgba(180,255,120,0.9)"; ctx.font = "bold 10px sans-serif"; ctx.textAlign = "center";
        ctx.fillText("🌱", gx, gy + 4);
      } else {
        // Workshop structure ghost (kitchen, workshop, farm, guard_post, etc.)
        const WORKSHOP_PLACE_ICONS   = { kitchen: "🍳", workshop: "🔧", farm: "🌾", guard_post: "🛡️" };
        const WORKSHOP_PLACE_COLORS  = {
          kitchen:    "rgba(255,160,60,0.55)",
          workshop:   "rgba(255,200,60,0.55)",
          farm:       "rgba(120,210,80,0.55)",
          guard_post: "rgba(255,100,80,0.55)",
        };
        const col  = WORKSHOP_PLACE_COLORS[s._placingMode] ?? "rgba(180,180,255,0.55)";
        const icon = WORKSHOP_PLACE_ICONS[s._placingMode] ?? "🏗";
        const hw = 36, hh = 36;
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = col.replace("0.55", "0.15");
        ctx.strokeStyle = col;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.fillRect(gx - hw, gy - hh, hw * 2, hh * 2);
        ctx.strokeRect(gx - hw, gy - hh, hw * 2, hh * 2);
        ctx.setLineDash([]);
        ctx.font = "22px sans-serif"; ctx.textAlign = "center";
        ctx.fillText(icon, gx, gy + 7);
      }
      ctx.restore();
    }

    // Night vignette
    if (isNight) {
      const grad = ctx.createRadialGradient(W/2, H/2, H*0.14, W/2, H/2, H*0.78);
      grad.addColorStop(0, "rgba(0,0,0,0)");
      grad.addColorStop(1, "rgba(0,0,12,0.76)");
      ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
    }

    // ── Close power zoom transform ─────────────────────────────────────────
    if (zoom !== 1) ctx.restore();

    // ── Beacon vehicle golden pulse (draws in screen-space, outside zoom) ──
    if (!s.firstVehicleEntered) {
      const allV = s.vehicles ?? [vehicle];
      allV.forEach(v => {
        if (!v.isBeacon) return;
        const { cx: bvx, cy: bvy } = worldToCanvas(v.x, v.y, cam);
        const pulse = 0.5 + 0.5 * Math.sin(t * 4.5);
        ctx.save();
        ctx.globalAlpha = 0.15 + 0.25 * pulse;
        ctx.beginPath(); ctx.arc(bvx, bvy, 36 + 18 * pulse, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,220,60,1)"; ctx.fill();
        ctx.globalAlpha = 0.5 + 0.45 * pulse;
        ctx.beginPath(); ctx.arc(bvx, bvy, 6, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,220,60,1)"; ctx.fill();
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = "rgba(255,220,60,0.95)"; ctx.font = "bold 11px sans-serif"; ctx.textAlign = "center";
        ctx.fillText("GET IN (F)", bvx, bvy - 30);
        ctx.restore();
      });
    }

    drawMinimap(ctx, s, W, H);
    drawPathToTarget(ctx, s.player, s.compassTarget, cam, W, H, s);

    const weather = getCurrentWeather(deps.stateRef.current);
if (weather.colorTint && s.isNight === false) {
  ctx.fillStyle = weather.colorTint;
  ctx.fillRect(0, 0, W, H);
}

    drawJoystick(ctx, deps.joystickRef.current, W, H);
  }

  // ── Compass arrow toward next settlement fragment / boss ──────────────────

export function drawCompassArrow(ctx, s, t, W, H) {
    if (!s.mapFragmentCollected) return; // hidden until first fragment picked up
    const target = s.compassTarget;
    if (!target) return; // no target (shouldn't happen with boss endgame)

    const isBoss = !!target.isBoss;

    const playerX = s.player.inVehicle ? s.vehicle.x : s.player.x;
    const playerY = s.player.inVehicle ? s.vehicle.y : s.player.y;

    const dx = target.x - playerX;
    const dy = target.y - playerY;
    const angle = Math.atan2(dy, dx);
    const distToTarget = Math.sqrt(dx * dx + dy * dy);

    // Pulse when close to target
    const nearPulse = distToTarget < FRAGMENT_PULSE_RANGE;
    const alpha = nearPulse
      ? 0.7 + 0.3 * Math.sin(t * 8)
      : isBoss
        ? 0.75 + 0.25 * Math.sin(t * 5) // boss pulses faster always
        : 0.7 + 0.15 * Math.sin(t * 2);

    const arrowX = W - 54;
    const arrowY = 130;
    const arrowLen = 26;

    // Color scheme: red for boss, gold for fragments
    const ringColor   = isBoss ? "rgba(255,60,60,0.5)"    : nearPulse ? "rgba(120,255,150,0.5)"  : "rgba(255,220,80,0.25)";
    const bgColor     = isBoss ? "rgba(60,0,0,0.55)"      : nearPulse ? "rgba(120,255,150,0.15)" : "rgba(0,0,0,0.45)";
    const strokeColor = isBoss ? "rgba(255,60,60,0.95)"   : nearPulse ? "rgba(120,255,150,0.95)" : "rgba(255,220,80,0.95)";
    const fillColor   = isBoss ? "rgba(255,60,60,0.85)"   : nearPulse ? "rgba(120,255,150,0.85)" : "rgba(255,220,80,0.85)";
    const labelColor  = isBoss ? "rgba(255,80,80,0.95)"   : nearPulse ? "rgba(120,255,150,0.9)"  : "rgba(255,220,80,0.9)";

    // Background circle
    ctx.save();
    ctx.globalAlpha = alpha * 0.8;
    ctx.beginPath(); ctx.arc(arrowX, arrowY, 22, 0, Math.PI * 2);
    ctx.fillStyle = bgColor; ctx.fill();
    ctx.strokeStyle = ringColor;
    ctx.lineWidth = isBoss ? 2.5 : 1.5; ctx.stroke();

    ctx.globalAlpha = alpha;
    ctx.translate(arrowX, arrowY);
    ctx.rotate(angle + Math.PI / 2);

    ctx.strokeStyle = strokeColor;
    ctx.fillStyle   = fillColor;
    ctx.lineWidth   = 2.5; ctx.lineCap = "round"; ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.moveTo(0, -arrowLen / 2);
    ctx.lineTo(9, arrowLen / 2 - 4);
    ctx.lineTo(0, arrowLen / 2 - 12);
    ctx.lineTo(-9, arrowLen / 2 - 4);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.restore();

    // Label + distance below compass circle
    const fragCollected = s.fragmentsCollected?.length ?? 0;
    const totalFrag = s.totalFragments ?? 1;
    const nextSettlement = s.settlements?.find(st => st.id === target.settlementId);
    const label = isBoss ? "☠ BOSS" : (nextSettlement ? nextSettlement.name : "?");

    ctx.save();
    ctx.globalAlpha = alpha * 0.9;
    ctx.textAlign = "center";
    ctx.fillStyle = labelColor;
    ctx.font = isBoss ? "bold 10px sans-serif" : "bold 9px sans-serif";
    ctx.fillText(label, arrowX, arrowY + 32);

    if (!isBoss) {
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.font = "8px sans-serif";
      ctx.fillText(`${fragCollected}/${totalFrag}`, arrowX, arrowY + 42);
    }
    if (distToTarget < 3000) {
      ctx.fillStyle = isBoss ? "rgba(255,120,120,0.55)" : "rgba(255,255,255,0.45)";
      ctx.font = "8px sans-serif";
      ctx.fillText(`${Math.round(distToTarget / 10)}m`, arrowX, arrowY + (isBoss ? 42 : 52));
    }
    ctx.restore();
  }

  // ── Downed partner directional arrow ─────────────────────────────────────
  // Shown to the non-downed player so they know where to run to revive.
export function drawDownedPartnerArrow(ctx, s, t, W, H) {
    if (!s.player2?.isDowned) return;
    const playerX = s.player.inVehicle ? s.vehicle.x : s.player.x;
    const playerY = s.player.inVehicle ? s.vehicle.y : s.player.y;
    const dx = s.player2.x - playerX;
    const dy = s.player2.y - playerY;
    const distToP2 = Math.sqrt(dx * dx + dy * dy);

    // Position compass just to the left of the main compass (which is at W-54)
    const arrowX = W - 54 - 56; // 56px gap to the left
    const arrowY = 130;
    const arrowLen = 26;
    const angle = Math.atan2(dy, dx);

    // Urgent pulsing
    const pulse = 0.65 + 0.35 * Math.sin(t * 6);

    // Red/orange partner-downed scheme
    ctx.save();
    ctx.globalAlpha = pulse * 0.85;
    ctx.beginPath(); ctx.arc(arrowX, arrowY, 22, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(60,0,0,0.65)"; ctx.fill();
    ctx.strokeStyle = "rgba(255,60,60,0.7)";
    ctx.lineWidth = 2; ctx.stroke();

    ctx.globalAlpha = pulse;
    ctx.translate(arrowX, arrowY);
    ctx.rotate(angle + Math.PI / 2);
    ctx.strokeStyle = "rgba(255,80,80,0.95)";
    ctx.fillStyle   = "rgba(255,80,80,0.85)";
    ctx.lineWidth = 2.5; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(0, -arrowLen / 2);
    ctx.lineTo(9, arrowLen / 2 - 4);
    ctx.lineTo(0, arrowLen / 2 - 12);
    ctx.lineTo(-9, arrowLen / 2 - 4);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.restore();

    // Label
    ctx.save();
    ctx.globalAlpha = pulse * 0.95;
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,100,100,0.95)";
    ctx.font = "bold 9px sans-serif";
    ctx.fillText("💀 P2", arrowX, arrowY + 32);
    if (distToP2 < 3000) {
      ctx.fillStyle = "rgba(255,160,160,0.55)";
      ctx.font = "8px sans-serif";
      ctx.fillText(`${Math.round(distToP2 / 10)}m`, arrowX, arrowY + 42);
    }
    ctx.restore();
  }

export function drawTurret(ctx, t, cam) {
    const { cx, cy } = worldToCanvas(t.x, t.y, cam);

    if (t.destroyed) {
      // Rubble
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = "rgba(120,80,40,0.7)";
      ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(180,80,40,0.8)"; ctx.font = "11px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("💀", cx, cy + 4);
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = "rgba(255,100,60,0.7)"; ctx.font = "bold 8px sans-serif";
      ctx.fillText("DESTROYED", cx, cy + 18);
      ctx.restore();
      return;
    }

    const hpFrac = t.hp / t.maxHp;
    ctx.save();
    // Range circle (faint)
    ctx.beginPath(); ctx.arc(cx, cy, t.range, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(180,255,120,0.06)"; ctx.lineWidth = 1.5; ctx.stroke();
    // Base platform
    ctx.fillStyle = hpFrac > 0.5 ? "rgba(80,100,60,0.95)" : hpFrac > 0.25 ? "rgba(150,90,30,0.95)" : "rgba(180,40,30,0.95)";
    ctx.beginPath(); ctx.arc(cx, cy, 14, 0, Math.PI * 2); ctx.fill();
    // Tower
    ctx.fillStyle = hpFrac > 0.5 ? "rgba(100,140,70,0.95)" : "rgba(180,100,30,0.9)";
    ctx.fillRect(cx - 5, cy - 8, 10, 16);
    // Barrel
    ctx.strokeStyle = "rgba(200,200,150,0.9)"; ctx.lineWidth = 3; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(cx, cy - 4); ctx.lineTo(cx, cy - 20); ctx.stroke();
    // HP bar
    ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(cx - 12, cy + 17, 24, 3);
    ctx.fillStyle = hpFrac > 0.5 ? "#88ff44" : hpFrac > 0.25 ? "#ffaa22" : "#ff3333";
    ctx.fillRect(cx - 12, cy + 17, 24 * hpFrac, 3);
    // Label
    ctx.fillStyle = "rgba(180,255,120,0.65)"; ctx.font = "bold 9px sans-serif"; ctx.textAlign = "center";
    ctx.fillText("🗼", cx, cy - 22);
    // Under-attack indicator — flash red when low HP
    if (hpFrac < 0.35) {
      ctx.globalAlpha = 0.3 + 0.3 * Math.sin(Date.now() / 150);
      ctx.strokeStyle = "rgba(255,50,50,0.9)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, 17, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }

export function drawBuilding(ctx, b, cam, isNight, player) {
    const { cx: bx, cy: by } = worldToCanvas(b.x, b.y, cam);
    ctx.save();
    const insidePlayer = isInsideBuilding(player, b);
    ctx.fillStyle = insidePlayer ? "rgba(255,255,240,0.07)" : "rgba(255,255,240,0.03)";
    ctx.fillRect(bx, by, b.w, b.h);

    if (b.barricadeHp > 0) {
      const frac = b.barricadeHp / (120 * (b.barricadeDoors ?? 1));
      ctx.fillStyle = "rgba(100,70,10,0.5)"; ctx.fillRect(bx + 2, by + b.h - 5, b.w - 4, 4);
      ctx.fillStyle = frac > 0.5 ? "#a07820" : "#cc4422"; ctx.fillRect(bx + 2, by + b.h - 5, (b.w-4)*frac, 4);
    }

    const WALL_W = 6;
    const wallColor = b.barricadeHp > 0
      ? "rgba(160,120,40,0.95)"
      : isNight ? "rgba(200,190,160,0.75)" : "rgba(210,200,175,0.92)";
    ctx.strokeStyle = wallColor; ctx.lineWidth = WALL_W; ctx.lineCap = "square";

    const segs = getBuildingWallSegments(b);
    segs.forEach(seg => {
      const a = worldToCanvas(seg.x1, seg.y1, cam);
      const bpt = worldToCanvas(seg.x2, seg.y2, cam);
      ctx.beginPath(); ctx.moveTo(a.cx, a.cy); ctx.lineTo(bpt.cx, bpt.cy); ctx.stroke();
    });

    if (b.doors) {
      b.doors.forEach(door => {
        const dc = getDoorCenter(b, door);
        const { cx: dcx, cy: dcy } = worldToCanvas(dc.x, dc.y, cam);
        const hw = door.width / 2;
        ctx.lineWidth = WALL_W; ctx.lineCap = "round";
        if (door.open) {
          ctx.strokeStyle = "rgba(120,80,30,0.85)";
          const perp = (door.side === "north" || door.side === "south") ? { dx: 0, dy: 1 } : { dx: 1, dy: 0 };
          const spt = worldToCanvas(
            dc.x + perp.dx * (door.side === "west" || door.side === "north" ? -door.width : door.width),
            dc.y + perp.dy * (door.side === "west" || door.side === "north" ? -door.width : door.width),
            cam
          );
          ctx.beginPath(); ctx.moveTo(dcx, dcy); ctx.lineTo(spt.cx, spt.cy); ctx.stroke();
          if (door.broken) {
            ctx.strokeStyle = "rgba(180,40,40,0.7)"; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(dcx, dcy); ctx.lineTo(spt.cx, spt.cy); ctx.stroke();
          }
        } else {
          const hpFrac = (door.hp ?? DOOR_MAX_HP) / DOOR_MAX_HP;
          ctx.strokeStyle = hpFrac > 0.6 ? "rgba(100,65,30,0.95)"
            : hpFrac > 0.3 ? "rgba(180,90,20,0.95)" : "rgba(220,40,20,0.95)";
          ctx.lineWidth = 4;
          const isHoriz = door.side === "north" || door.side === "south";
          const a2 = worldToCanvas(isHoriz ? dc.x - hw : dc.x, isHoriz ? dc.y : dc.y - hw, cam);
          const b2 = worldToCanvas(isHoriz ? dc.x + hw : dc.x, isHoriz ? dc.y : dc.y + hw, cam);
          ctx.beginPath(); ctx.moveTo(a2.cx, a2.cy); ctx.lineTo(b2.cx, b2.cy); ctx.stroke();
          if (hpFrac < 1) {
            const barW = door.width - 4, barH = 3;
            const barX = dcx - barW / 2, barY = dcy - 9;
            ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(barX, barY, barW, barH);
            ctx.fillStyle = hpFrac > 0.5 ? "#cc8833" : "#dd3322";
            ctx.fillRect(barX, barY, barW * hpFrac, barH);
          }
        }
      });
    }

    ctx.fillStyle = "rgba(255,245,220,0.5)";
    ctx.font = "bold 11px sans-serif"; ctx.textAlign = "center";
    ctx.fillText(b.label, bx + b.w / 2, by + b.h / 2);
    if (b.zombieGuards) {
      ctx.fillStyle = "rgba(220,60,60,0.85)"; ctx.font = "bold 12px sans-serif";
      ctx.fillText("⚠", bx + b.w - 10, by + 14);
    }
    ctx.restore();
  }

export function drawMinimap(ctx, s, W, H) {
    const MM = 100, pad = 12;
    const mx = pad, my = pad + 36; // top-left, below day counter
    const sx = MM / WORLD_W, sy = MM / WORLD_H;
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.65)"; ctx.fillRect(mx, my, MM, MM);
    ctx.strokeStyle = "rgba(255,255,255,0.1)"; ctx.lineWidth = 1; ctx.strokeRect(mx, my, MM, MM);

    // Settlement regions as faint circles
    if (s.settlements) {
      s.settlements.forEach(st => {
        const cleared = s.fragmentsCollected?.includes(st.id);
        const scx = mx + st.cx * sx;
        const scy = my + st.cy * sy;
        ctx.beginPath(); ctx.arc(scx, scy, 6, 0, Math.PI * 2);
        ctx.fillStyle = cleared ? "rgba(120,255,150,0.25)" : "rgba(255,220,80,0.12)";
        ctx.fill();
        ctx.strokeStyle = cleared ? "rgba(120,255,150,0.6)" : "rgba(255,220,80,0.35)";
        ctx.lineWidth = 1; ctx.stroke();
        // Cleared checkmark
        if (cleared) {
          ctx.fillStyle = "rgba(120,255,150,0.85)";
          ctx.font = "bold 6px sans-serif"; ctx.textAlign = "center";
          ctx.fillText("✓", scx, scy + 2);
        }
      });
    }

    // Inter-settlement roads
    ctx.strokeStyle = "rgba(255,255,255,0.08)"; ctx.lineWidth = 1;
    s.roads.forEach(r => {
      ctx.beginPath();
      ctx.moveTo(mx + r.x1 * sx, my + r.y1 * sy);
      ctx.lineTo(mx + r.x2 * sx, my + r.y2 * sy);
      ctx.stroke();
    });

    // Buildings (show loot piles)
    s.buildings.forEach(b => {
      const hasLoot = s.lootPiles.some(p => p.buildingId === b.id && !p.collected);
      ctx.fillStyle = hasLoot ? "rgba(255,220,80,0.45)" : "rgba(255,255,255,0.1)";
      ctx.fillRect(mx + b.x*sx, my + b.y*sy, Math.max(2, b.w*sx), Math.max(2, b.h*sy));
    });

    // Zombie dots (throttle to avoid perf issues — sample every 3rd)
    ctx.fillStyle = "rgba(200,40,40,0.7)";
    for (let i = 0; i < s.zombies.length; i += 3) {
      const z = s.zombies[i];
      if (z.dead) continue;
      ctx.beginPath(); ctx.arc(mx + z.x*sx, my + z.y*sy, 0.8, 0, Math.PI*2); ctx.fill();
    }

    // Wells
    if (s.wells) {
      ctx.fillStyle = "rgba(80,160,255,0.7)";
      s.wells.forEach(w => {
        ctx.beginPath(); ctx.arc(mx + w.x*sx, my + w.y*sy, 2, 0, Math.PI*2); ctx.fill();
      });
    }

    // Compass target marker (next fragment or boss)
    if (s.mapFragmentCollected && s.compassTarget) {
      const ct = s.compassTarget;
      const isBoss = !!ct.isBoss;
      const pulse = 5 + 2 * Math.sin(Date.now() / (isBoss ? 200 : 400));
      ctx.beginPath(); ctx.arc(mx + ct.x*sx, my + ct.y*sy, isBoss ? 4 : 3, 0, Math.PI*2);
      ctx.fillStyle = isBoss ? "rgba(255,60,60,0.95)" : "rgba(255,220,80,0.9)"; ctx.fill();
      // Pulsing ring
      ctx.beginPath(); ctx.arc(mx + ct.x*sx, my + ct.y*sy, pulse, 0, Math.PI*2);
      ctx.strokeStyle = isBoss ? "rgba(255,60,60,0.6)" : "rgba(255,220,80,0.5)";
      ctx.lineWidth = 1; ctx.stroke();
      if (isBoss) {
        ctx.fillStyle = "rgba(255,60,60,0.9)";
        ctx.font = "7px sans-serif"; ctx.textAlign = "center";
        ctx.fillText("☠", mx + ct.x*sx, my + ct.y*sy - 5);
      }
    }

    // Vehicles
    ctx.fillStyle = "rgba(200,200,180,0.85)";
    (s.vehicles ?? [s.vehicle]).forEach(v => {
      ctx.beginPath(); ctx.arc(mx + v.x*sx, my + v.y*sy, 2, 0, Math.PI*2); ctx.fill();
    });

    // P2
    if (s.player2) {
      ctx.fillStyle = COL.player2;
      ctx.beginPath(); ctx.arc(mx + s.player2.x*sx, my + s.player2.y*sy, 2.5, 0, Math.PI*2); ctx.fill();
    }

    // Player dot (last so always on top)
    ctx.fillStyle = COL.player;
    ctx.beginPath(); ctx.arc(mx + s.player.x*sx, my + s.player.y*sy, 3, 0, Math.PI*2); ctx.fill();

    // "N" north indicator
    ctx.fillStyle = "rgba(255,255,255,0.25)"; ctx.font = "bold 7px sans-serif"; ctx.textAlign = "center";
    ctx.fillText("N", mx + MM/2, my + 7);
    ctx.restore();
  }