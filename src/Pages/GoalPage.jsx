import React, { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import NotesEditor from "./NotesEditor";

const PAGE = "#FAF7F0";
const INK = "#2B2925";
const LINE = "#D9D3C4";
const LINE_SOFT = "#EAE5D8";
const MUTED = "#8C8676";
const ACCENT = "#5C7A5C";
const FONT_DISPLAY = "'Fraunces', Georgia, serif";
const FONT_BODY = "'Inter', system-ui, sans-serif";
const FONT_MONO = "'JetBrains Mono', 'Courier New', monospace";

// Mirrors the stage helpers in HabitGrid.jsx — kept local here so this file
// can be dropped in without import-cycle concerns. If you'd rather share
// one copy, move getActiveStage/getStageIndex to a small utils file and
// import from both places.
const getActiveStage = (goal, todayISO) => {
  if (!goal || !goal.stages || goal.stages.length === 0) return null;
  if (goal.advanceMode === "auto") {
    const sorted = [...goal.stages].sort((a, b) => (a.startDate || "").localeCompare(b.startDate || ""));
    let active = sorted[0];
    for (const s of sorted) {
      if (!s.startDate || s.startDate <= todayISO) active = s;
    }
    return active;
  }
  const found = goal.stages.find((s) => s.id === goal.currentStageId);
  return found || goal.stages[0];
};
const getStageIndex = (goal, stageId) => goal.stages.findIndex((s) => s.id === stageId);

/**
 * Props:
 *  - goal: the goal object from HabitGrid's `goals` state (id, title, description,
 *           targetDate, notes, advanceMode, stages, currentStageId)
 *  - todayISO: string
 *  - onBack(): navigate back to the grid
 *  - onUpdateGoal(field, value, immediate?): patch a top-level goal field
 *           (title/description/targetDate/notes). Pass immediate=true to skip
 *           the debounce and save right away (used by blur + the Save button).
 *           Returns a Promise when immediate=true so callers can await it.
 *  - onSetAdvanceMode(mode)
 *  - onAddStage(position), onRemoveStage(stageId), onMoveStage(stageId, dir), onUpdateStageField(stageId, field, value)
 *  - onAdvanceStage(), onRegressStage()
 *  - newStageDraft, onChangeNewStageDraft(draft)
 */
export default function GoalPage({
  goal,
  todayISO,
  onBack,
  onUpdateGoal,
  onSetAdvanceMode,
  onAddStage,
  onRemoveStage,
  onMoveStage,
  onUpdateStageField,
  onAdvanceStage,
  onRegressStage,
  newStageDraft,
  onChangeNewStageDraft,
  habits = [],
  habitGoals = {},
  onToggleHabitGoal,
}) {
  const [editingHeader, setEditingHeader] = useState(false);
  const [habitSearch, setHabitSearch] = useState("");
  const [habitSuggestOpen, setHabitSuggestOpen] = useState(false);

  // ---- notes save status ("saved" / "unsaved" / "saving") ----
  // `goal.notes` only reflects what's in local state, which updates on every
  // keystroke — so we track save status separately, driven by what's actually
  // been sent to (or confirmed by) the server.
  const [notesStatus, setNotesStatus] = useState("saved"); // "saved" | "unsaved" | "saving"
  const lastSavedNotesRef = useRef(goal?.notes || "");

  // If we switch to a different goal, reset the tracked "last saved" value
  // to whatever that goal currently has, so we don't think there are
  // unsaved changes just because the notes content differs from before.
  useEffect(() => {
    lastSavedNotesRef.current = goal?.notes || "";
    setNotesStatus("saved");
  }, [goal?.id]);

  // Same idea for the habit-picker search box — don't carry leftover search
  // text from one goal into the next when navigating between goal pages.
  useEffect(() => {
    setHabitSearch("");
    setHabitSuggestOpen(false);
  }, [goal?.id]);

  const handleNotesChange = (html) => {
    // Every keystroke: update local state (autosave debounce happens in
    // HabitGrid's updateGoalField) and mark notes as unsaved until we hear
    // back from an immediate/manual save.
    onUpdateGoal("notes", html);
    if (html !== lastSavedNotesRef.current) setNotesStatus("unsaved");
  };

  const saveNotesNow = async (html) => {
    const value = html !== undefined ? html : goal.notes;
    if (value === lastSavedNotesRef.current) return; // nothing changed, skip the round-trip
    setNotesStatus("saving");
    try {
      await onUpdateGoal("notes", value, true);
      lastSavedNotesRef.current = value;
      setNotesStatus("saved");
    } catch (err) {
      console.error("Failed to save notes:", err);
      setNotesStatus("unsaved");
    }
  };

  if (!goal) {
    return (
      <div style={{ fontFamily: FONT_BODY, background: PAGE, minHeight: "100vh", padding: 28 }}>
        <button className="hg-btn" onClick={onBack}>← Back</button>
        <p style={{ color: MUTED, marginTop: 20 }}>Goal not found.</p>
      </div>
    );
  }

  const activeStage = getActiveStage(goal, todayISO);
  const stageIdx = getStageIndex(goal, goal.currentStageId);
  const draft = newStageDraft || { label: "", criteria: "", startDate: "" };

  // Habit chip picker: this goal owns its own habit list, so adding/removing
  // happens from here rather than ticking checkboxes per-habit back on the
  // grid (which got unreadable once there were more than a few goals).
  const linkedHabits = habits.filter((h) => habitGoals[h.id]?.has(goal.id));
  const linkedHabitIdSet = new Set(linkedHabits.map((h) => h.id));
  const availableHabits = habits.filter((h) => !linkedHabitIdSet.has(h.id));
  const query = habitSearch.trim().toLowerCase();
  const habitSuggestions = (query
    ? availableHabits.filter((h) => h.name.toLowerCase().includes(query))
    : availableHabits
  ).slice(0, 6);

  return (
    <div style={{ fontFamily: FONT_BODY, background: PAGE, color: INK, minHeight: "100vh", padding: "28px 24px 80px" }}>
      <style>{`
        .hg-btn {
          font-family: ${FONT_BODY}; cursor: pointer; border: 1px solid ${LINE};
          background: ${PAGE}; color: ${INK}; border-radius: 6px; font-size: 13px; padding: 6px 12px;
        }
        .hg-btn:hover { background: ${LINE_SOFT}; }
        .hg-btn:disabled { cursor: default; opacity: 0.5; }
        .hg-btn-accent { border-color: ${ACCENT}; color: white; background: ${ACCENT}; }
        .hg-btn-accent:hover { background: #4d6b4d; }
        .hg-btn-accent:disabled { background: ${ACCENT}; opacity: 0.5; }
        input.hg-input, textarea.hg-input {
          font-family: ${FONT_BODY}; border: 1px solid ${LINE}; border-radius: 6px;
          padding: 6px 9px; font-size: 13.5px; background: white; color: ${INK};
        }
        input.hg-input:focus, textarea.hg-input:focus { outline: none; border-color: ${MUTED}; }
        .hg-stage-pill {
          display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px;
          font-family: ${FONT_MONO}; color: ${ACCENT}; background: rgba(92,122,92,0.1);
          border-radius: 4px; padding: 1px 6px;
        }
        .hg-save-status {
          font-size: 12px; font-family: ${FONT_BODY}; display: inline-flex; align-items: center; gap: 5px;
        }
        .hg-save-dot {
          width: 6px; height: 6px; border-radius: 50%; display: inline-block;
        }
      `}</style>

      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <button className="hg-btn" onClick={onBack} style={{ marginBottom: 18 }}>← Back to grid</button>

        {/* Header */}
        <div style={{ marginBottom: 22 }}>
          {editingHeader ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <input
                className="hg-input"
                style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 600, padding: "8px 10px" }}
                value={goal.title}
                onChange={(e) => onUpdateGoal("title", e.target.value)}
              />
              <textarea
                className="hg-input"
                rows={2}
                placeholder="Short description"
                value={goal.description}
                onChange={(e) => onUpdateGoal("description", e.target.value)}
              />
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 12, color: MUTED }}>Target date</span>
                <input
                  className="hg-input"
                  type="date"
                  value={goal.targetDate || ""}
                  onChange={(e) => onUpdateGoal("targetDate", e.target.value)}
                />
                <button className="hg-btn hg-btn-accent" onClick={() => setEditingHeader(false)}>Done</button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <div>
                <h1 style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 26, margin: "0 0 6px" }}>{goal.title}</h1>
                {goal.description && <p style={{ color: MUTED, fontSize: 14, margin: "0 0 6px", maxWidth: 560 }}>{goal.description}</p>}
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  {goal.targetDate && <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: MUTED }}>target: {goal.targetDate}</span>}
                  {activeStage && (
                    <span className="hg-stage-pill">
                      now: {activeStage.label}{activeStage.criteria ? ` — ${activeStage.criteria}` : ""}
                    </span>
                  )}
                </div>
              </div>
              <button className="hg-btn" onClick={() => setEditingHeader(true)}>Edit</button>
            </div>
          )}
        </div>

        {/* Habits tracked toward this goal — this is now the one place
            habit ↔ goal links are edited. The grid still shows a small
            read-only tag per habit for an at-a-glance view, but it's no
            longer where you add/remove links — that stopped scaling once
            there were more than a handful of goals. */}
        <section style={{ marginBottom: 24, border: `1px solid ${LINE}`, borderRadius: 10, padding: 16 }}>
          <h3 style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 16, margin: "0 0 10px" }}>Habits in this goal</h3>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: linkedHabits.length > 0 ? 12 : 8 }}>
            {linkedHabits.map((h) => (
              <span
                key={h.id}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12.5,
                  color: ACCENT,
                  background: "rgba(92,122,92,0.1)",
                  borderRadius: 6,
                  padding: "4px 6px 4px 10px",
                }}
              >
                {h.name}
                <span
                  onClick={() => onToggleHabitGoal(h.id, goal.id)}
                  title={`Remove ${h.name} from this goal`}
                  style={{ cursor: "pointer", color: MUTED, fontSize: 12 }}
                >✕</span>
              </span>
            ))}
            {linkedHabits.length === 0 && (
              <span style={{ fontSize: 13, color: MUTED }}>No habits linked yet — add one below.</span>
            )}
          </div>

          {availableHabits.length > 0 ? (
            <div style={{ position: "relative", maxWidth: 280 }}>
              <input
                className="hg-input"
                style={{ width: "100%" }}
                placeholder="Add a habit…"
                value={habitSearch}
                onChange={(e) => setHabitSearch(e.target.value)}
                onFocus={() => setHabitSuggestOpen(true)}
                onBlur={() => setTimeout(() => setHabitSuggestOpen(false), 150)}
              />
              {habitSuggestOpen && habitSuggestions.length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: 38,
                    left: 0,
                    right: 0,
                    background: "white",
                    border: `1px solid ${LINE}`,
                    borderRadius: 8,
                    boxShadow: "0 4px 14px rgba(0,0,0,0.1)",
                    zIndex: 10,
                    overflow: "hidden",
                  }}
                >
                  {habitSuggestions.map((h) => (
                    <div
                      key={h.id}
                      onClick={() => {
                        onToggleHabitGoal(h.id, goal.id);
                        setHabitSearch("");
                      }}
                      style={{ fontSize: 13, padding: "8px 10px", cursor: "pointer" }}
                    >
                      {h.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <span style={{ fontSize: 12.5, color: MUTED }}>All habits are already linked to this goal.</span>
          )}
        </section>

        {/* Stage breakdown — useful for long-arc goals (e.g. a 5-year goal broken
            into yearly/phase steps), optional for short flat goals */}
        <section style={{ marginBottom: 28, border: `1px solid ${LINE}`, borderRadius: 10, padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
            <h3 style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 16, margin: 0 }}>Steps</h3>
            {goal.stages.length > 1 && (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <label style={{ fontSize: 12, color: MUTED, display: "flex", gap: 4, alignItems: "center", cursor: "pointer" }}>
                  <input type="radio" checked={goal.advanceMode === "auto"} onChange={() => onSetAdvanceMode("auto")} />
                  Auto-advance by date
                </label>
                <label style={{ fontSize: 12, color: MUTED, display: "flex", gap: 4, alignItems: "center", cursor: "pointer" }}>
                  <input type="radio" checked={goal.advanceMode === "manual"} onChange={() => onSetAdvanceMode("manual")} />
                  I'll advance it myself
                </label>
              </div>
            )}
          </div>

          {goal.advanceMode === "manual" && goal.stages.length > 1 && (
            <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
              <button className="hg-btn" onClick={onRegressStage} disabled={stageIdx <= 0}>← back a step</button>
              <button className="hg-btn hg-btn-accent" onClick={onAdvanceStage} disabled={stageIdx >= goal.stages.length - 1}>advance to next step →</button>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
            {goal.stages.map((s, i) => {
              const isActive = activeStage && activeStage.id === s.id;
              return (
                <div
                  key={s.id}
                  style={{
                    display: "flex", gap: 8, alignItems: "center", fontSize: 13,
                    background: isActive ? "rgba(92,122,92,0.08)" : "transparent",
                    borderRadius: 6, padding: "6px 8px",
                  }}
                >
                  <span style={{ fontFamily: FONT_MONO, color: MUTED, width: 18 }}>{i + 1}.</span>
                  <span onClick={() => i > 0 && onMoveStage(s.id, -1)} style={{ cursor: i > 0 ? "pointer" : "default", color: i > 0 ? ACCENT : LINE, fontSize: 11 }}>▲</span>
                  <span onClick={() => i < goal.stages.length - 1 && onMoveStage(s.id, 1)} style={{ cursor: i < goal.stages.length - 1 ? "pointer" : "default", color: i < goal.stages.length - 1 ? ACCENT : LINE, fontSize: 11 }}>▼</span>
                  <input className="hg-input" style={{ width: 150 }} value={s.label} placeholder="Step label" onChange={(e) => onUpdateStageField(s.id, "label", e.target.value)} />
                  <input className="hg-input" style={{ flex: 1, minWidth: 160 }} value={s.criteria} placeholder="What counts as done" onChange={(e) => onUpdateStageField(s.id, "criteria", e.target.value)} />
                  {goal.advanceMode === "auto" && (
                    <input className="hg-input" type="date" style={{ width: 135 }} value={s.startDate} onChange={(e) => onUpdateStageField(s.id, "startDate", e.target.value)} />
                  )}
                  {isActive && <span className="hg-stage-pill">active now</span>}
                  <span onClick={() => onRemoveStage(s.id)} style={{ cursor: "pointer", color: MUTED }}>✕</span>
                </div>
              );
            })}
            {goal.stages.length === 0 && (
              <span style={{ fontSize: 13, color: MUTED }}>
                No steps yet. If this is a longer-arc goal, break it into yearly or phase-based steps below.
              </span>
            )}
          </div>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <input
              className="hg-input"
              placeholder="Step label (e.g. 'Year 1: foundations')"
              value={draft.label}
              onChange={(e) => onChangeNewStageDraft({ ...draft, label: e.target.value })}
              style={{ width: 180 }}
            />
            <input
              className="hg-input"
              placeholder="Criteria (optional)"
              value={draft.criteria}
              onChange={(e) => onChangeNewStageDraft({ ...draft, criteria: e.target.value })}
              style={{ width: 220 }}
            />
            {goal.advanceMode === "auto" && (
              <input
                className="hg-input"
                type="date"
                value={draft.startDate}
                onChange={(e) => onChangeNewStageDraft({ ...draft, startDate: e.target.value })}
                style={{ width: 140 }}
              />
            )}
            <button className="hg-btn" onClick={() => onAddStage("end")}>+ add step</button>
          </div>
        </section>

        {/* Notes — freeform, with a simple toolbar for bold/bullets/links so
            there's no markdown syntax to learn.
            Saving: autosaves on a debounce while typing, saves immediately on
            blur (leaving the field), and can be saved explicitly with the
            button below. The status indicator reflects whichever of those
            actually reached the server. */}
        <section>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
            <h3 style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 16, margin: 0 }}>Notes</h3>
            <NotesSaveStatus status={notesStatus} />
          </div>
          <NotesEditor
            value={goal.notes || ""}
            onChange={handleNotesChange}
            onChangeImmediate={saveNotesNow}
            placeholder="Inspiration, links, anything you're thinking through for this goal…"
          />
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
            <button
              className="hg-btn hg-btn-accent"
              onClick={() => saveNotesNow()}
              disabled={notesStatus === "saved" || notesStatus === "saving"}
            >
              {notesStatus === "saving" ? "Saving…" : "Save notes"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function NotesSaveStatus({ status }) {
  const MUTED_LOCAL = "#8C8676";
  const ACCENT_LOCAL = "#5C7A5C";
  const WARN = "#B5654A";

  if (status === "saving") {
    return (
      <span className="hg-save-status" style={{ color: MUTED_LOCAL }}>
        <span className="hg-save-dot" style={{ background: MUTED_LOCAL }} />
        Saving…
      </span>
    );
  }
  if (status === "unsaved") {
    return (
      <span className="hg-save-status" style={{ color: WARN }}>
        <span className="hg-save-dot" style={{ background: WARN }} />
        Unsaved changes
      </span>
    );
  }
  return (
    <span className="hg-save-status" style={{ color: ACCENT_LOCAL }}>
      <span className="hg-save-dot" style={{ background: ACCENT_LOCAL }} />
      Saved
    </span>
  );
}