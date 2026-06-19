import React, { useState, useMemo, useRef, useEffect } from "react";

// ---- Palette (paper/graphite inspired, warm off-white like the notebook) ----
const PAGE = "#FAF7F0";
const INK = "#2B2925";
const LINE = "#D9D3C4";
const LINE_SOFT = "#EAE5D8";
const MUTED = "#8C8676";

const FONT_DISPLAY = "'Fraunces', Georgia, serif";
const FONT_BODY = "'Inter', system-ui, sans-serif";
const FONT_MONO = "'JetBrains Mono', 'Courier New', monospace";

const DEFAULT_COLORS = [
  { id: "c1", hex: "#5C7A5C", label: "Done" },
  { id: "c2", hex: "#D8B24A", label: "Partial" },
  { id: "c3", hex: "#B5654A", label: "Skipped" },
];

const DEFAULT_HABITS = [
  "Bathe", "Yoga", "Exercise", "Teeth", "Floss", "Journal",
  "Reading", "Outside", "Skin care", "Text/Mail",
];

const pad = (n) => String(n).padStart(2, "0");
const keyFor = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
const monthLabel = (y, m) =>
  new Date(y, m, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });

export default function HabitGrid() {
  const today = new Date();
  const [colors, setColors] = useState(DEFAULT_COLORS);
  const [habits, setHabits] = useState(DEFAULT_HABITS.map((name, i) => ({ id: `h${i}`, name })));
  const [marks, setMarks] = useState({}); // key: `${habitId}__${dateKey}` -> colorId
  const [zoom, setZoom] = useState(1); // 1 = one month, 2 = two months, 3 = three
  const [anchorMonth, setAnchorMonth] = useState(today.getMonth());
  const [anchorYear, setAnchorYear] = useState(today.getFullYear());
  const [pickerFor, setPickerFor] = useState(null); // {habitId, dateKey, x, y}
  const [editingLegend, setEditingLegend] = useState(false);
  const [newHabitName, setNewHabitName] = useState("");
  const [goals, setGoals] = useState([]); // {id, title, description, targetDate}
  const [habitGoals, setHabitGoals] = useState({}); // habitId -> Set of goalId
  const [selectedGoalId, setSelectedGoalId] = useState("all");
  const [newGoal, setNewGoal] = useState({ title: "", description: "", targetDate: "" });
  const [compact, setCompact] = useState(false);
  const containerRef = useRef(null);
  const scrollWrapRef = useRef(null);

  const todayDateKey = keyFor(today.getFullYear(), today.getMonth(), today.getDate());
  const todayISO = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  // Goals that haven't passed their target date yet (or have no target date)
  const activeGoals = useMemo(
    () => goals.filter((g) => !g.targetDate || g.targetDate >= todayISO),
    [goals, todayISO]
  );

  // If the currently selected goal filter has expired, fall back to "all"
  useEffect(() => {
    if (selectedGoalId === "all") return;
    const stillActive = activeGoals.some((g) => g.id === selectedGoalId);
    if (!stillActive) setSelectedGoalId("all");
  }, [activeGoals, selectedGoalId]);

  useEffect(() => {
    const wrap = scrollWrapRef.current;
    if (!wrap) return;
    const todayEl = wrap.querySelector(`[data-day-key="${todayDateKey}"]`);
    if (!todayEl) return;
    const wrapRect = wrap.getBoundingClientRect();
    const elRect = todayEl.getBoundingClientRect();
    const offset = elRect.left - wrapRect.left - wrapRect.width / 2 + elRect.width / 2;
    wrap.scrollLeft += offset;
  }, [anchorMonth, anchorYear, zoom, todayDateKey]);


  const months = useMemo(() => {
    const list = [];
    for (let i = 0; i < zoom; i++) {
      let m = anchorMonth - (zoom - 1) + i;
      let y = anchorYear;
      while (m < 0) { m += 12; y -= 1; }
      while (m > 11) { m -= 12; y += 1; }
      list.push({ year: y, month: m });
    }
    return list;
  }, [zoom, anchorMonth, anchorYear]);

  const shiftMonths = (dir) => {
    let m = anchorMonth + dir;
    let y = anchorYear;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setAnchorMonth(m);
    setAnchorYear(y);
  };

  const setMark = (habitId, dateKey, colorId) => {
    setMarks((prev) => {
      const k = `${habitId}__${dateKey}`;
      const next = { ...prev };
      if (colorId === null) delete next[k];
      else next[k] = colorId;
      return next;
    });
    setPickerFor(null);
  };

  const colorById = (id) => colors.find((c) => c.id === id);

  const addHabit = () => {
    if (!newHabitName.trim()) return;
    setHabits((prev) => [...prev, { id: `h${Date.now()}`, name: newHabitName.trim() }]);
    setNewHabitName("");
  };

  const removeHabit = (id) => {
    setHabits((prev) => prev.filter((h) => h.id !== id));
  };

  const updateColor = (id, field, value) => {
    setColors((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  };

  const addColor = () => {
    setColors((prev) => [...prev, { id: `c${Date.now()}`, hex: "#8A8F86", label: "New" }]);
  };

  const removeColor = (id) => {
    setColors((prev) => prev.filter((c) => c.id !== id));
  };

  const addGoal = () => {
    if (!newGoal.title.trim()) return;
    setGoals((prev) => [...prev, { id: `g${Date.now()}`, ...newGoal, title: newGoal.title.trim() }]);
    setNewGoal({ title: "", description: "", targetDate: "" });
  };

  const removeGoal = (id) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
    setHabitGoals((prev) => {
      const next = {};
      for (const [hid, set] of Object.entries(prev)) {
        const s = new Set(set);
        s.delete(id);
        next[hid] = s;
      }
      return next;
    });
    if (selectedGoalId === id) setSelectedGoalId("all");
  };

  const toggleHabitGoal = (habitId, goalId) => {
    setHabitGoals((prev) => {
      const current = new Set(prev[habitId] || []);
      if (current.has(goalId)) current.delete(goalId);
      else current.add(goalId);
      return { ...prev, [habitId]: current };
    });
  };

  const visibleHabits = useMemo(() => {
    if (selectedGoalId === "all") return habits;
    return habits.filter((h) => habitGoals[h.id]?.has(selectedGoalId));
  }, [habits, habitGoals, selectedGoalId]);

  const selectedGoal = goals.find((g) => g.id === selectedGoalId);

  // close picker on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) return;
      if (e.target.closest?.(".hg-cell") || e.target.closest?.(".hg-picker")) return;
      setPickerFor(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        fontFamily: FONT_BODY,
        background: PAGE,
        color: INK,
        minHeight: "100vh",
        padding: "28px 24px 60px",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        .hg-btn {
          font-family: ${FONT_BODY};
          cursor: pointer;
          border: 1px solid ${LINE};
          background: ${PAGE};
          color: ${INK};
          border-radius: 6px;
          font-size: 13px;
          padding: 6px 12px;
          transition: background 0.15s;
        }
        .hg-btn:hover { background: ${LINE_SOFT}; }
        .hg-cell {
          width: 26px; height: 26px;
          border: 1px solid ${LINE};
          border-radius: 4px;
          cursor: pointer;
          flex-shrink: 0;
          transition: transform 0.08s;
        }
        .hg-cell:hover { border-color: ${MUTED}; }
        .hg-cell:active { transform: scale(0.92); }
        .hg-swatch {
          width: 28px; height: 28px; border-radius: 6px;
          cursor: pointer; border: 1.5px solid transparent;
          flex-shrink: 0;
        }
        .hg-swatch:hover { border-color: ${INK}; }
        input.hg-input {
          font-family: ${FONT_BODY};
          border: 1px solid ${LINE};
          border-radius: 6px;
          padding: 5px 8px;
          font-size: 13px;
          background: white;
          color: ${INK};
        }
        input.hg-input:focus { outline: none; border-color: ${MUTED}; }
      `}</style>

      {/* Header */}
      <div style={{ maxWidth: 920, margin: "0 auto 22px", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1 style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 26, margin: 0 }}>Habit grid</h1>
        <button className="hg-btn" onClick={() => setEditingLegend((v) => !v)}>
          {editingLegend ? "Done editing" : "Edit colors & habits"}
        </button>
      </div>

      {/* Legend */}
      <div style={{ maxWidth: 920, margin: "0 auto 20px", display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
        {colors.map((c) => (
          <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 14, height: 14, borderRadius: 4, background: c.hex }} />
            {editingLegend ? (
              <>
                <input
                  className="hg-input"
                  style={{ width: 90 }}
                  value={c.label}
                  onChange={(e) => updateColor(c.id, "label", e.target.value)}
                />
                <input
                  type="color"
                  value={c.hex}
                  onChange={(e) => updateColor(c.id, "hex", e.target.value)}
                  style={{ width: 28, height: 28, border: "none", borderRadius: 6, cursor: "pointer" }}
                />
                <span onClick={() => removeColor(c.id)} style={{ cursor: "pointer", color: MUTED, fontSize: 13 }}>✕</span>
              </>
            ) : (
              <span style={{ fontSize: 13, color: MUTED }}>{c.label}</span>
            )}
          </div>
        ))}
        {editingLegend && (
          <button className="hg-btn" onClick={addColor}>+ color</button>
        )}
      </div>

      {/* Goal filter */}
      <div style={{ maxWidth: 920, margin: "0 auto 16px", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: MUTED }}>Goal</span>
        <select
          className="hg-input"
          value={selectedGoalId}
          onChange={(e) => setSelectedGoalId(e.target.value)}
          style={{ minWidth: 180 }}
        >
          <option value="all">All habits</option>
          {activeGoals.map((g) => (
            <option key={g.id} value={g.id}>{g.title}</option>
          ))}
        </select>
        {selectedGoal && (
          <div style={{ fontSize: 12.5, color: MUTED, display: "flex", gap: 10, alignItems: "center" }}>
            {selectedGoal.description && <span>{selectedGoal.description}</span>}
            {selectedGoal.targetDate && (
              <span style={{ fontFamily: FONT_MONO }}>target: {selectedGoal.targetDate}</span>
            )}
          </div>
        )}
      </div>

      {/* Goal manager (edit mode) */}
      {editingLegend && (
        <div style={{ maxWidth: 920, margin: "0 auto 20px", border: `1px solid ${LINE}`, borderRadius: 8, padding: 14 }}>
          <h4 style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 14, margin: "0 0 10px" }}>Goals</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
            {goals.map((g) => {
              const expired = g.targetDate && g.targetDate < todayISO;
              return (
              <div key={g.id} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, opacity: expired ? 0.5 : 1 }}>
                <span style={{ fontWeight: 500, minWidth: 120 }}>{g.title}</span>
                <span style={{ color: MUTED, flex: 1 }}>{g.description}</span>
                <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: MUTED }}>
                  {g.targetDate}{expired ? " (past)" : ""}
                </span>
                <span onClick={() => removeGoal(g.id)} style={{ cursor: "pointer", color: MUTED }}>✕</span>
              </div>
              );
            })}
            {goals.length === 0 && <span style={{ fontSize: 13, color: MUTED }}>No goals yet.</span>}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              className="hg-input"
              placeholder="Goal title"
              value={newGoal.title}
              onChange={(e) => setNewGoal((p) => ({ ...p, title: e.target.value }))}
              style={{ width: 160 }}
            />
            <input
              className="hg-input"
              placeholder="Description (optional)"
              value={newGoal.description}
              onChange={(e) => setNewGoal((p) => ({ ...p, description: e.target.value }))}
              style={{ width: 220 }}
            />
            <input
              className="hg-input"
              type="date"
              value={newGoal.targetDate}
              onChange={(e) => setNewGoal((p) => ({ ...p, targetDate: e.target.value }))}
              style={{ width: 140 }}
            />
            <button className="hg-btn" onClick={addGoal}>Add goal</button>
          </div>
        </div>
      )}


      {editingLegend && (
        <div style={{ maxWidth: 920, margin: "0 auto 20px", display: "flex", gap: 8 }}>
          <input
            className="hg-input"
            placeholder="New habit name"
            value={newHabitName}
            onChange={(e) => setNewHabitName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addHabit()}
            style={{ width: 220 }}
          />
          <button className="hg-btn" onClick={addHabit}>Add habit</button>
        </div>
      )}

      {/* Zoom + nav controls */}
      <div style={{ maxWidth: 920, margin: "0 auto 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="hg-btn" onClick={() => shiftMonths(-1)}>← Prev</button>
          <button className="hg-btn" onClick={() => shiftMonths(1)}>Next →</button>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <button
            className="hg-btn"
            onClick={() => setCompact((v) => !v)}
            style={{ background: compact ? LINE_SOFT : PAGE }}
          >
            {compact ? "Normal view" : "Overview (fit all)"}
          </button>
          <span style={{ fontSize: 12, color: MUTED, alignSelf: "center", marginRight: 4 }}>Zoom</span>
          {[1, 2, 3].map((z) => (
            <button
              key={z}
              className="hg-btn"
              onClick={() => setZoom(z)}
              style={{ background: zoom === z ? LINE_SOFT : PAGE, fontFamily: FONT_MONO }}
            >
              {z}mo
            </button>
          ))}
        </div>
      </div>

      {/* Grids */}
      <div
        ref={scrollWrapRef}
        style={{
          maxWidth: compact ? "100%" : 920,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: compact ? 18 : 32,
          overflowX: compact ? "hidden" : "auto",
        }}
      >
        {months.map(({ year, month }) => (
          <MonthGrid
            key={`${year}-${month}`}
            year={year}
            month={month}
            habits={visibleHabits}
            marks={marks}
            colorById={colorById}
            editingLegend={editingLegend}
            onRemoveHabit={removeHabit}
            goals={goals}
            habitGoals={habitGoals}
            onToggleHabitGoal={toggleHabitGoal}
            compact={compact}
            onCellClick={(habitId, dateKey, e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setPickerFor({ habitId, dateKey, x: rect.left, y: rect.bottom + 6 });
            }}
          />
        ))}
      </div>

      {/* Color picker popover */}
      {pickerFor && (
        <div
          className="hg-picker"
          style={{
            position: "fixed",
            left: pickerFor.x,
            top: pickerFor.y,
            background: "white",
            border: `1px solid ${LINE}`,
            borderRadius: 8,
            padding: 8,
            display: "flex",
            gap: 6,
            boxShadow: "0 4px 14px rgba(0,0,0,0.12)",
            zIndex: 1000,
          }}
        >
          <div
            className="hg-swatch"
            title="Clear"
            style={{ background: "white", border: `1px dashed ${MUTED}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: MUTED }}
            onClick={() => setMark(pickerFor.habitId, pickerFor.dateKey, null)}
          >
            ✕
          </div>
          {colors.map((c) => (
            <div
              key={c.id}
              className="hg-swatch"
              title={c.label}
              style={{ background: c.hex }}
              onClick={() => setMark(pickerFor.habitId, pickerFor.dateKey, c.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MonthGrid({ year, month, habits, marks, colorById, editingLegend, onCellClick, onRemoveHabit, goals, habitGoals, onToggleHabitGoal, compact }) {
  const numDays = daysInMonth(year, month);
  const dayNums = Array.from({ length: numDays }, (_, i) => i + 1);
  const todayKey = keyFor(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

  const cellSize = compact ? 9 : 26;
  const cellGap = compact ? 1 : 2;
  const sidebarWidth = compact ? 78 : 150;
  const nameFontSize = compact ? 10.5 : 13;
  const headerFontSize = compact ? 7 : 10;

  return (
    <div>
      <h3 style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: compact ? 13 : 16, margin: "0 0 10px", color: INK }}>
        {monthLabel(year, month)}
      </h3>
      <div style={{ display: "inline-block", minWidth: "100%" }}>
        {/* Day number header */}
        <div style={{ display: "flex", gap: cellGap, marginLeft: sidebarWidth }}>
          {dayNums.map((d) => {
            const dateKey = keyFor(year, month, d);
            return (
              <div
                key={d}
                data-day-key={dateKey}
                style={{
                  width: cellSize,
                  textAlign: "center",
                  fontFamily: FONT_MONO,
                  fontSize: headerFontSize,
                  color: dateKey === todayKey ? INK : MUTED,
                  fontWeight: dateKey === todayKey ? 600 : 400,
                  flexShrink: 0,
                }}
              >
                {compact ? "" : d}
              </div>
            );
          })}
        </div>

        {/* Habit rows */}
        {habits.map((h) => (
          <div key={h.id} style={{ marginBottom: editingLegend && goals.length > 0 ? 14 : (compact ? 1 : 4) }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <div
                style={{
                  width: sidebarWidth,
                  fontSize: nameFontSize,
                  paddingRight: 10,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexShrink: 0,
                  position: "sticky",
                  left: 0,
                  background: PAGE,
                  zIndex: 2,
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  textOverflow: "ellipsis",
                }}
              >
                <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{h.name}</span>
                {editingLegend && (
                  <span onClick={() => onRemoveHabit(h.id)} style={{ cursor: "pointer", color: MUTED, fontSize: 12, flexShrink: 0 }}>✕</span>
                )}
              </div>
              <div style={{ display: "flex", gap: cellGap }}>
                {dayNums.map((d) => {
                  const dateKey = keyFor(year, month, d);
                  const colorId = marks[`${h.id}__${dateKey}`];
                  const color = colorId ? colorById(colorId) : null;
                  const isToday = dateKey === todayKey;
                  return (
                    <div
                      key={d}
                      className="hg-cell"
                      style={{
                        background: color ? color.hex : "white",
                        borderColor: isToday ? INK : LINE,
                        borderWidth: isToday ? 1.5 : 1,
                        width: cellSize,
                        height: cellSize,
                        borderRadius: compact ? 2 : 4,
                      }}
                      onClick={(e) => onCellClick(h.id, dateKey, e)}
                    />
                  );
                })}
              </div>
            </div>
            {editingLegend && goals.length > 0 && (
              <div style={{ marginLeft: sidebarWidth, display: "flex", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
                {goals.map((g) => {
                  const checked = habitGoals[h.id]?.has(g.id);
                  return (
                    <label key={g.id} style={{ fontSize: 11.5, color: MUTED, display: "flex", gap: 4, alignItems: "center", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={!!checked}
                        onChange={() => onToggleHabitGoal(h.id, g.id)}
                        style={{ cursor: "pointer" }}
                      />
                      {g.title}
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}