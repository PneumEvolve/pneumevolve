// split-engine.mjs — splits Rootwork's gameEngine.js into smaller files.
//
// Nothing about the game changes. Every function is moved word-for-word into
// src/Pages/rootwork/engine/<part>.js, and gameEngine.js becomes a short file
// that re-exports all of them, so every existing `import ... from "./gameEngine"`
// keeps working untouched.
//
// HOW TO RUN (WSL, from your project folder):
//   node split-engine.mjs
// then:
//   npm run build
//
// Safety: if anything looks off it stops before writing. The original is kept
// as gameEngine.js.bak-split. To undo:  rm -r engine && mv gameEngine.js.bak-split gameEngine.js
// (run that inside src/Pages/rootwork)

import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { pathToFileURL } from "url";

// Each part starts at the first of its listed functions found in the file and
// runs until the next part starts. Parts whose functions aren't found are skipped.
const PARTS = [
  { file: "core.js",    desc: "ids, upgrade materials, population, treasury, town hall, prestige skills, automation", starts: null },
  { file: "town.js",    desc: "town buildings and halls",                   starts: ["getTownHomeCost"] },
  { file: "workers.js", desc: "market + kitchen worker helpers",            starts: ["getSellRate"] },
  { file: "setup.js",   desc: "factories, initial state, farm/barn/fishing helpers", starts: ["makePlot"] },
  { file: "tick.js",    desc: "offline progress, main tick, town pulse",    starts: ["calculateOfflineProgress"] },
  { file: "actions.js", desc: "farm/market/kitchen/barn/fishing actions",   starts: ["plantPlot"] },
  { file: "season.js",  desc: "season prestige, quests, animals, pets",     starts: ["makeKeptWorker"] },
  { file: "save.js",    desc: "save / load / migrations",                   starts: ["serializeState"] },
  { file: "heroes.js",  desc: "adventurers, missions, hero skills",         starts: ["genWorldId"] },
  { file: "forge.js",   desc: "forge workers",                              starts: ["hireForgeWorker", "getForgeWorkerHireCost", "tickForgeWorkers"] },
  { file: "boss.js",    desc: "boss fights",                                starts: ["checkBossUnlock", "tickBossFight", "assignHeroToBoss"] },
  { file: "roads.js",   desc: "roads, trade towns, expeditions",            starts: ["getRoadLevel"] },
  { file: "dungeon.js", desc: "dungeon",                                    starts: ["applyDungeonResult", "startDungeonRun", "claimDungeonReward", "getDungeonParty"] },
  { file: "roadsV2.js", desc: "roads v2 + hero quick-go (Nov 2026 patch)",  starts: ["isRoadPaused"] },
];

const MAX_PART_BYTES = 200_000;

// ─── Find gameEngine.js ───────────────────────────────────────────────────────
function walk(dir, out) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (e.name === "node_modules" || e.name === ".git" || e.name === "dist" || e.name.startsWith(".")) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out); else out.push(p);
  }
}
function fail(msg) { console.log("\n✋ Nothing was written.\n" + msg + "\n\nPaste this output back to Claude."); process.exit(1); }

const all = []; walk(process.cwd(), all);
let hits = all.filter((p) => path.basename(p) === "gameEngine.js");
if (hits.length > 1) hits = hits.filter((p) => p.toLowerCase().includes("rootwork"));
if (hits.length !== 1) fail(hits.length ? "Found more than one gameEngine.js:\n  " + hits.join("\n  ") : "Couldn't find gameEngine.js under " + process.cwd());
const ENGINE = hits[0];
const DIR = path.dirname(ENGINE);
const OUT_DIR = path.join(DIR, "engine");
if (fs.existsSync(OUT_DIR)) fail("An 'engine' folder already exists at " + OUT_DIR + " — looks like the split already ran.");

const src = fs.readFileSync(ENGINE, "utf8");
if (/^export \* from "\.\/engine\//m.test(src)) fail("gameEngine.js is already split.");
const EOL = src.includes("\r\n") ? "\r\n" : "\n";

// ─── Parser (uses whatever your project already has installed) ─────────────────
const requireFromProject = createRequire(path.join(process.cwd(), "package.json"));
async function load(name) { return import(pathToFileURL(requireFromProject.resolve(name)).href); }
async function getParser() {
  try { const m = await load("rollup/parseAst"); return (code) => m.parseAst(code); } catch {}
  try { const m = await load("acorn"); return (code) => m.parse(code, { ecmaVersion: "latest", sourceType: "module" }); } catch {}
  try { const m = await load("@babel/parser"); return (code) => m.parse(code, { sourceType: "module" }).program; } catch {}
  fail("Couldn't find a JavaScript parser in node_modules. Run:  npm i -D acorn   then run this script again.");
}
const parse = await getParser();
let program;
try { program = parse(src); } catch (e) { fail("Couldn't parse gameEngine.js: " + e.message); }

// ─── Collect top-level statements ─────────────────────────────────────────────
const imports = [];
const stmts = [];
for (const node of program.body) {
  if (node.type === "ImportDeclaration") { imports.push(node); continue; }
  const decl = node.type === "ExportNamedDeclaration" ? node.declaration : node;
  const exported = node.type === "ExportNamedDeclaration";
  if (node.type === "ExportNamedDeclaration" && !node.declaration) fail("Unexpected 'export { ... }' statement at offset " + node.start + ".");
  if (node.type === "ExportDefaultDeclaration" || node.type === "ExportAllDeclaration") fail("Unexpected default/star export in gameEngine.js.");
  const names = [];
  let kind = "other";
  if (decl?.type === "FunctionDeclaration") { names.push(decl.id.name); kind = "function"; }
  else if (decl?.type === "ClassDeclaration") { names.push(decl.id.name); kind = "class"; }
  else if (decl?.type === "VariableDeclaration") {
    kind = decl.kind;
    for (const d of decl.declarations) {
      if (d.id.type !== "Identifier") fail("Destructured top-level variable at offset " + d.start + " — can't split safely.");
      names.push(d.id.name);
    }
  }
  stmts.push({ node, decl, exported, names, kind });
}
if (imports.length === 0) fail("No imports found at the top of gameEngine.js — unexpected.");
const lastImportEnd = Math.max(...imports.map((n) => n.end));

// ─── Work out part boundaries ─────────────────────────────────────────────────
const nameToStmtIdx = new Map();
stmts.forEach((s, i) => s.names.forEach((n) => nameToStmtIdx.set(n, i)));

const starts = [{ part: PARTS[0], idx: 0 }];
for (const part of PARTS.slice(1)) {
  const found = part.starts.map((n) => nameToStmtIdx.get(n)).filter((i) => i !== undefined);
  if (found.length === 0) { console.log("• (no " + part.file + " — none of its functions found, merging into neighbour)"); continue; }
  starts.push({ part, idx: Math.min(...found) });
}
starts.sort((a, b) => a.idx - b.idx);
// drop duplicates at same index (keep first)
const chunks = [];
for (const s of starts) {
  if (chunks.length && chunks[chunks.length - 1].idx === s.idx) continue;
  chunks.push(s);
}
chunks.forEach((c, k) => {
  c.endIdx = k + 1 < chunks.length ? chunks[k + 1].idx : stmts.length; // exclusive
  // text range: from end of previous statement (so leading comments travel with it)
  c.textStart = c.idx === 0 ? lastImportEnd : stmts[c.idx - 1].node.end;
  c.textEnd = c.endIdx < stmts.length ? stmts[c.endIdx - 1].node.end : src.length;
  c.stmts = stmts.slice(c.idx, c.endIdx);
  c.names = new Set(c.stmts.flatMap((s) => s.names));
});

// ─── Cross-file references ────────────────────────────────────────────────────
const owner = new Map();
chunks.forEach((c) => c.names.forEach((n) => owner.set(n, c)));
const identRe = /[A-Za-z_$][\w$]*/g;

const problems = [];
for (const c of chunks) {
  const text = src.slice(c.textStart, c.textEnd);
  const used = new Set(text.match(identRe) ?? []);
  c.needs = new Map(); // other chunk -> Set(names)
  for (const n of used) {
    const o = owner.get(n);
    if (!o || o === c) continue;
    if (!c.needs.has(o)) c.needs.set(o, new Set());
    c.needs.get(o).add(n);
  }
  // A `let`/`var` owned elsewhere can't be assigned through an import
  for (const [o, names] of c.needs) {
    for (const n of names) {
      const st = o.stmts.find((s) => s.names.includes(n));
      if (st && (st.kind === "let" || st.kind === "var")) {
        const assign = new RegExp("(\\b" + n.replace(/\$/g, "\\$") + "\\s*(=(?!=)|\\+\\+|--|[-+*/]=))|((\\+\\+|--)\\s*" + n.replace(/\$/g, "\\$") + "\\b)");
        if (assign.test(text)) problems.push("'" + n + "' is a changeable variable in " + o.part.file + " but is changed from " + c.part.file);
      }
    }
  }
  // Top-level non-function values that use other parts at load time could break
  for (const s of c.stmts) {
    if (s.kind === "function" || s.kind === "class") continue;
    if (s.kind === "other" && s.node.type === "EmptyStatement") continue;
    const decls = s.decl?.declarations ?? [];
    const loadTimeTexts = decls.length
      ? decls.filter((d) => d.init && !/Function/.test(d.init.type)).map((d) => src.slice(d.init.start, d.init.end))
      : [src.slice(s.node.start, s.node.end)];
    for (const t of loadTimeTexts) {
      for (const n of (t.match(identRe) ?? [])) {
        const o = owner.get(n);
        if (o && o !== c) problems.push("Top-level code near '" + (s.names[0] ?? "offset " + s.node.start) + "' (" + c.part.file + ") uses '" + n + "' from " + o.part.file + " at load time");
      }
    }
  }
}
if (problems.length) fail("These would be unsafe to split:\n  - " + [...new Set(problems)].join("\n  - "));

// ─── Build files ──────────────────────────────────────────────────────────────
const importText = imports
  .map((n) => src.slice(n.start, n.end).replace(/from\s+(["'])\.\//, "from $1../"))
  .join(EOL);

const outputs = [];
for (const c of chunks) {
  // add `export` to any private top-level declarations so other parts can import them
  let body = "";
  let cursor = c.textStart;
  for (const s of c.stmts) {
    if (!s.exported && (s.kind === "function" || s.kind === "class" || s.kind === "const" || s.kind === "let" || s.kind === "var")) {
      body += src.slice(cursor, s.node.start) + "export ";
      cursor = s.node.start;
    }
  }
  body += src.slice(cursor, c.textEnd);

  const crossImports = [...c.needs.entries()]
    .sort((a, b) => chunks.indexOf(a[0]) - chunks.indexOf(b[0]))
    .map(([o, names]) => "import { " + [...names].sort().join(", ") + " } from \"./" + o.part.file + "\";")
    .join(EOL);

  const header = "// src/Pages/rootwork/engine/" + c.part.file + " — " + c.part.desc + EOL +
    "// Split out of gameEngine.js (Nov 2026). Import from \"../gameEngine\" elsewhere, not from here." + EOL + EOL;
  const text = header + importText + EOL + (crossImports ? crossImports + EOL : "") + body.replace(/^\s*/, EOL) + (body.endsWith(EOL) ? "" : EOL);
  outputs.push({ file: path.join(OUT_DIR, c.part.file), text, part: c.part });
}

// barrel
const barrel = [
  "// src/Pages/rootwork/gameEngine.js",
  "// The engine now lives in ./engine/ — one file per system. This file just",
  "// re-exports everything so existing imports from \"./gameEngine\" keep working.",
  "",
  ...outputs.map((o) => "export * from \"./engine/" + o.part.file + "\";"),
  "",
].join(EOL);

// ─── Sanity checks before writing ─────────────────────────────────────────────
for (const o of outputs) {
  if (Buffer.byteLength(o.text) > MAX_PART_BYTES) problems.push(o.part.file + " would be " + Math.round(Buffer.byteLength(o.text) / 1000) + "KB (too big)");
  try { parse(o.text); } catch (e) { problems.push(o.part.file + " doesn't parse: " + e.message); }
}
// every original top-level statement accounted for exactly once
const totalMoved = chunks.reduce((s, c) => s + c.stmts.length, 0);
if (totalMoved !== stmts.length) problems.push("statement count mismatch (" + totalMoved + " vs " + stmts.length + ")");
// every original name still exported via the barrel
const exportedNames = new Set(stmts.flatMap((s) => s.names));
for (const n of exportedNames) if (!owner.has(n)) problems.push("lost '" + n + "'");
if (problems.length) fail("Sanity check failed:\n  - " + problems.join("\n  - "));

// ─── Write ────────────────────────────────────────────────────────────────────
fs.mkdirSync(OUT_DIR);
fs.writeFileSync(ENGINE + ".bak-split", src, "utf8");
for (const o of outputs) fs.writeFileSync(o.file, o.text, "utf8");
fs.writeFileSync(ENGINE, barrel, "utf8");

console.log("\n✓ Split " + path.relative(process.cwd(), ENGINE) + " into:");
for (const o of outputs) console.log("   engine/" + o.part.file.padEnd(12) + String(Math.round(Buffer.byteLength(o.text) / 1000)).padStart(4) + " KB  — " + o.part.desc);
console.log("\nOriginal saved as gameEngine.js.bak-split. Now run:  npm run build");
