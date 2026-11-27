// src/Pages/Arcade/games/creature-farm/stickers.js
//
// The Sticker Book: one sticker for every mix of types a creature can be.
//   Page 1  Purebreds        7   (one type)
//   Page 2  Two-type mixes  21
//   Page 3  Three-type      35
//   Page 4  Four-type       35      = 98 stickers
// You get a sticker the first time you have a creature of that mix on the farm
// (hatched, befriended, brought home, anything), and you keep it forever.
// Collecting gives rewards you claim: every few stickers, plus a big one for
// finishing each page.

import { SPECIES } from "./species";
import { comboKey } from "./eggs";

export const TYPES = Object.keys(SPECIES);

function combos(list, k, start = 0, cur = [], out = []) {
  if (cur.length === k) { out.push(cur.slice()); return out; }
  for (let i = start; i < list.length; i++) { cur.push(list[i]); combos(list, k, i + 1, cur, out); cur.pop(); }
  return out;
}
// [{ key, types: [...], page: 1..4 }]
export const STICKERS = [1, 2, 3, 4].flatMap(n => combos(TYPES, n).map(types => ({ key: types.slice().sort().join("+"), types, page: n })));
export const PAGES = [
  { n: 1, name: "Purebreds" },
  { n: 2, name: "Two types" },
  { n: 3, name: "Three types" },
  { n: 4, name: "Four types" },
];

// Genes to draw a sticker with: spread 4 genes over its types (first gets extras).
export function stickerGenes(types) {
  const g = [];
  for (let i = 0; i < 4; i++) g.push(types[i < types.length ? i : 0]);
  return g;
}

// Rewards. kind: coins | pen | goods | egg | gold (golden babies more likely) | speed (all hatcheries faster)
export const MILESTONES = [
  { id: "m3",   at: 3,  text: "100 coins",                    reward: { coins: 100 } },
  { id: "m6",   at: 6,  text: "A free pen spot",              reward: { pen: 1 } },
  { id: "m10",  at: 10, text: "An uncommon egg",              reward: { egg: "uncommon" } },
  { id: "m15",  at: 15, text: "300 coins + 5 bricks",         reward: { coins: 300, goods: { brick: 5 } } },
  { id: "m20",  at: 20, text: "Lucky Charm: golden babies are more likely", reward: { gold: 0.05 } },
  { id: "m25",  at: 25, text: "A rare egg",                   reward: { egg: "rare" } },
  { id: "m30",  at: 30, text: "2 free pen spots",             reward: { pen: 2 } },
  { id: "m40",  at: 40, text: "Warm Nests: every Hatchery hatches 25% faster", reward: { speed: 0.25 } },
  { id: "m50",  at: 50, text: "An epic egg",                  reward: { egg: "epic" } },
  { id: "m65",  at: 65, text: "2000 coins + 10 blankets",     reward: { coins: 2000, goods: { blanket: 10 } } },
  { id: "m80",  at: 80, text: "A legendary egg",              reward: { egg: "legendary" } },
  { id: "m98",  at: 98, text: "Golden Charm: golden babies much more likely + a legendary egg", reward: { gold: 0.1, egg: "legendary" } },
];
export const PAGE_REWARDS = [
  { id: "p1", page: 1, text: "Purebred page done: a rare egg + 200 coins", reward: { egg: "rare", coins: 200 } },
  { id: "p2", page: 2, text: "Two-type page done: an epic egg + 500 coins", reward: { egg: "epic", coins: 500 } },
  { id: "p3", page: 3, text: "Three-type page done: a legendary egg", reward: { egg: "legendary" } },
  { id: "p4", page: 4, text: "Four-type page done: a legendary egg + 3000 coins", reward: { egg: "legendary", coins: 3000 } },
];

export const stickerCount = (w) => Object.keys(w.stickers || {}).length;
export const pageCount = (w, page) => STICKERS.filter(s => s.page === page && (w.stickers || {})[s.key]).length;
export const pageSize = (page) => STICKERS.filter(s => s.page === page).length;

// Every reward and whether you can claim it now. [{ id, text, reward, ready, claimed, at|page }]
export function rewardsFor(w) {
  const n = stickerCount(w), claimed = w.stickerClaimed || {};
  return [
    ...MILESTONES.map(m => ({ ...m, ready: n >= m.at, claimed: !!claimed[m.id] })),
    ...PAGE_REWARDS.map(p => ({ ...p, ready: pageCount(w, p.page) >= pageSize(p.page), claimed: !!claimed[p.id] })),
  ];
}
export const claimable = (w) => rewardsFor(w).filter(r => r.ready && !r.claimed);

// New stickers from the creatures on the farm right now. Returns the new keys
// (and adds them to w.stickers, which must be a copy).
export function collectStickers(w, t) {
  const got = [];
  for (const c of Object.values(w.creatures || {})) {
    const genes = Array.isArray(c.genes) && c.genes.length === 4 ? c.genes : [c.species, c.species, c.species, c.species];
    const key = comboKey(genes);
    if (!(w.stickers || {})[key]) { w.stickers = { ...(w.stickers || {}), [key]: { at: t, by: c.name } }; got.push(key); }
  }
  return got;
}
export const stickerName = (s) => s.types.length === 1 ? `Purebred ${SPECIES[s.types[0]].name}` : s.types.map(t => SPECIES[t].name).join(" + ");