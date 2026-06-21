import React, { useState, useMemo, useRef, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import GoalPage from "./GoalPage";

// ---- Palette (paper/graphite inspired, warm off-white like the notebook) ----
const PAGE = "#FAF7F0";
const INK = "#2B2925";
const LINE = "#D9D3C4";
const LINE_SOFT = "#EAE5D8";
const MUTED = "#8C8676";
const ACCENT = "#5C7A5C";

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

// ---- Stage helpers ----
// A goal can optionally have `stages`: an ordered list of
// { id, label, criteria, startDate (YYYY-MM-DD, used only in 'auto' mode) }
// and `advanceMode`: 'auto' | 'manual'. Goals with no stages behave exactly
// as they did before (flat goal, just a filter + description).

const getActiveStage = (goal, todayISO) => {
  if (!goal || !goal.stages || goal.stages.length === 0) return null;
  if (goal.advanceMode === "auto") {
    // last stage whose startDate is <= today
    const sorted = [...goal.stages].sort((a, b) => (a.startDate || "").localeCompare(b.startDate || ""));
    let active = sorted[0];
    for (const s of sorted) {
      if (!s.startDate || s.startDate <= todayISO) active = s;
    }
    return active;
  }
  // manual mode: use currentStageId, defaulting to the first stage
  const found = goal.stages.find((s) => s.id === goal.currentStageId);
  return found || goal.stages[0];
};

const getStageIndex = (goal, stageId) => goal.stages.findIndex((s) => s.id === stageId);

// ---- Server <-> client shape mapping ----
// The server stores everything by a string `client_id` that the React
// component generates itself (h${Date.now()}, g${Date.now()}, etc). We keep
// using that same string as the local `id` field, so no separate id-mapping
// table is ever needed.

function fromServerState(state) {
  const colors = (state.colors || []).map((c) => ({
    id: c.client_id, hex: c.hex, label: c.label,
  }));
  const habits = (state.habits || []).map((h) => ({
    id: h.client_id, name: h.name,
  }));
  const marks = {};
  (state.marks || []).forEach((m) => {
    marks[`${m.habit_client_id}__${m.date}`] = m.color_client_id;
  });
  const goals = (state.goals || []).map((g) => ({
    id: g.client_id,
    title: g.title,
    description: g.description || "",
    notes: g.notes || "",
    targetDate: g.target_date || "",
    advanceMode: g.advance_mode,
    currentStageId: g.current_stage_client_id,
    stages: (g.stages || []).map((s) => ({
      id: s.client_id,
      label: s.label,
      criteria: s.criteria || "",
      startDate: s.start_date || "",
    })),
  }));
  const habitGoals = {};
  (state.habit_goals || []).forEach(({ habit_client_id, goal_client_id }) => {
    if (!habitGoals[habit_client_id]) habitGoals[habit_client_id] = new Set();
    habitGoals[habit_client_id].add(goal_client_id);
  });
  return { colors, habits, marks, goals, habitGoals };
}

export default function HabitGrid() {
  const { userId, accessToken } = useAuth();

  const today = new Date();
  const [colors, setColors] = useState([]);
  const [habits, setHabits] = useState([]);
  const [marks, setMarks] = useState({}); // key: `${habitId}__${dateKey}` -> colorId
  const [zoom, setZoom] = useState(1); // 1 = one month, 2 = two months, 3 = three
  const [anchorMonth, setAnchorMonth] = useState(today.getMonth());
  const [anchorYear, setAnchorYear] = useState(today.getFullYear());
  const [pickerFor, setPickerFor] = useState(null); // {habitId, dateKey, x, y}
  const [editingLegend, setEditingLegend] = useState(false);
  const [newHabitName, setNewHabitName] = useState("");
  const [goals, setGoals] = useState([]); // {id, title, description, targetDate, advanceMode, stages, currentStageId}
  const [habitGoals, setHabitGoals] = useState({}); // habitId -> Set of goalId
  const [selectedGoalId, setSelectedGoalId] = useState("all");
  const [openGoalId, setOpenGoalId] = useState(null); // non-null = showing GoalPage instead of the grid
  const [newGoal, setNewGoal] = useState({ title: "", description: "", targetDate: "" });
  const [compact, setCompact] = useState(false);
  const [expandedStageGoalId, setExpandedStageGoalId] = useState(null); // which goal's stage editor is open
  const [newStageDrafts, setNewStageDrafts] = useState({}); // goalId -> {label, criteria, startDate}
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const containerRef = useRef(null);
  const debounceTimersRef = useRef({}); // key -> timeout id, used to throttle rapid-fire saves (color drag, typing)

  // Delays an API call until `wait`ms after the last call with this same key.
  // Local state already updated synchronously by the caller, so the UI never
  // waits on this — it only throttles how often we hit the network/DB.
  const debouncedSave = (key, fn, wait = 400) => {
    if (debounceTimersRef.current[key]) {
      clearTimeout(debounceTimersRef.current[key]);
    }
    debounceTimersRef.current[key] = setTimeout(() => {
      delete debounceTimersRef.current[key];
      fn();
    }, wait);
  };

  // Cancels any pending debounced save for `key` without running it — used
  // right before an immediate save takes over, so we don't double-save.
  const cancelDebouncedSave = (key) => {
    if (debounceTimersRef.current[key]) {
      clearTimeout(debounceTimersRef.current[key]);
      delete debounceTimersRef.current[key];
    }
  };

  // On unmount (e.g. navigating away within the SPA), run any saves that
  // were still sitting in their debounce window instead of just dropping
  // them. This doesn't help with a hard page refresh/tab close (nothing
  // running in JS survives that), which is exactly why notes also save
  // immediately on blur and via the explicit Save button.
  useEffect(() => {
    return () => {
      Object.values(debounceTimersRef.current).forEach((timerId) => clearTimeout(timerId));
      // Note: we intentionally don't try to fire the underlying fn()s here —
      // by unmount time the closures may reference stale state. The
      // blur/immediate-save paths are the real safety net.
      debounceTimersRef.current = {};
    };
  }, []);

  const scrollWrapRef = useRef(null);

  const todayDateKey = keyFor(today.getFullYear(), today.getMonth(), today.getDate());
  const todayISO = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  // ---- initial load + one-time default seeding for brand-new users ----
  useEffect(() => {
    let cancelled = false;

    const seedDefaults = async () => {
      // Only runs the very first time a user has zero colors and zero habits.
      const seededColors = [];
      for (let i = 0; i < DEFAULT_COLORS.length; i++) {
        const c = DEFAULT_COLORS[i];
        try {
          const res = await api.post("/habits/colors", {
            client_id: c.id, hex: c.hex, label: c.label, order_index: i,
          });
          seededColors.push({ id: res.data.client_id, hex: res.data.hex, label: res.data.label });
        } catch (err) {
          console.error("Failed to seed default color:", err);
        }
      }
      const seededHabits = [];
      for (let i = 0; i < DEFAULT_HABITS.length; i++) {
        const name = DEFAULT_HABITS[i];
        const clientId = `h${Date.now()}_${i}`;
        try {
          const res = await api.post("/habits", { client_id: clientId, name, order_index: i });
          seededHabits.push({ id: res.data.client_id, name: res.data.name });
        } catch (err) {
          console.error("Failed to seed default habit:", err);
        }
      }
      return { seededColors, seededHabits };
    };

    const load = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await api.get("/habits/state", { validateStatus: () => true });
        if (cancelled) return;
        if (res.status !== 200) {
          console.warn("Unexpected status from /habits/state:", res.status, res.data);
          setLoadError("Couldn't load your habits right now.");
          return;
        }
        const parsed = fromServerState(res.data);
        if (parsed.colors.length === 0 && parsed.habits.length === 0) {
          const { seededColors, seededHabits } = await seedDefaults();
          if (cancelled) return;
          setColors(seededColors);
          setHabits(seededHabits);
        } else {
          setColors(parsed.colors);
          setHabits(parsed.habits);
        }
        setMarks(parsed.marks);
        setGoals(parsed.goals);
        setHabitGoals(parsed.habitGoals);
      } catch (err) {
        console.error("Failed to load HabitGrid state:", err);
        if (!cancelled) setLoadError("Couldn't load your habits right now.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [userId, accessToken]);

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
    if (compact) return; // overview mode shows the whole month — don't scroll it off-center
    const wrap = scrollWrapRef.current;
    if (!wrap) return;
    const todayEl = wrap.querySelector(`[data-day-key="${todayDateKey}"]`);
    if (!todayEl) return;
    const wrapRect = wrap.getBoundingClientRect();
    const elRect = todayEl.getBoundingClientRect();
    const offset = elRect.left - wrapRect.left - wrapRect.width / 2 + elRect.width / 2;
    wrap.scrollLeft += offset;
  }, [anchorMonth, anchorYear, zoom, todayDateKey, compact]);

  // In overview/compact mode, shrink cells to actually fit the screen width
  // instead of clipping. Recomputed live as the viewport resizes.
  const COMPACT_SIDEBAR = 56;
  const COMPACT_GAP = 1;
  const [compactCellSize, setCompactCellSize] = useState(9);

  useEffect(() => {
    if (!compact) return;
    const wrap = scrollWrapRef.current;
    if (!wrap) return;
    const measure = () => {
      const width = wrap.clientWidth;
      const maxDays = 31; // worst case, so it fits every month at this zoom
      const available = width - COMPACT_SIDEBAR - (maxDays - 1) * COMPACT_GAP;
      const size = Math.max(3, Math.min(12, Math.floor(available / maxDays)));
      setCompactCellSize(size);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [compact, zoom]);


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

  // ---- mutations: update local state immediately, then sync to server ----

  const setMark = (habitId, dateKey, colorId) => {
    setMarks((prev) => {
      const k = `${habitId}__${dateKey}`;
      const next = { ...prev };
      if (colorId === null) delete next[k];
      else next[k] = colorId;
      return next;
    });
    setPickerFor(null);
    api.put("/habits/marks", {
      habit_client_id: habitId,
      date: dateKey,
      color_client_id: colorId,
    }).catch((err) => console.error("Failed to save mark:", err));
  };

  const colorById = (id) => colors.find((c) => c.id === id);

  const addHabit = () => {
    if (!newHabitName.trim()) return;
    const id = `h${Date.now()}`;
    const name = newHabitName.trim();
    setHabits((prev) => [...prev, { id, name }]);
    setNewHabitName("");
    api.post("/habits", { client_id: id, name, order_index: habits.length })
      .catch((err) => console.error("Failed to save habit:", err));
  };

  const removeHabit = (id) => {
    setHabits((prev) => prev.filter((h) => h.id !== id));
    api.delete(`/habits/${id}`).catch((err) => console.error("Failed to delete habit:", err));
  };

  const moveHabit = (id, direction) => {
    // direction: -1 = move earlier (up), 1 = move later (down)
    let reordered = null;
    setHabits((prev) => {
      const idx = prev.findIndex((h) => h.id === id);
      const newIdx = idx + direction;
      if (idx === -1 || newIdx < 0 || newIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      reordered = next;
      return next;
    });
    if (reordered) {
      reordered.forEach((h, i) => {
        api.patch(`/habits/${h.id}`, { order_index: i })
          .catch((err) => console.error("Failed to save habit order:", err));
      });
    }
  };

  const renameHabit = (id, name) => {
    setHabits((prev) => prev.map((h) => (h.id === id ? { ...h, name } : h)));
    debouncedSave(`habit:${id}:name`, () => {
      api.patch(`/habits/${id}`, { name })
        .catch((err) => console.error("Failed to rename habit:", err));
    });
  };

  const updateColor = (id, field, value) => {
    setColors((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
    const payload = field === "label" ? { label: value } : { hex: value };
    debouncedSave(`color:${id}:${field}`, () => {
      api.patch(`/habits/colors/${id}`, payload)
        .catch((err) => console.error("Failed to update color:", err));
    });
  };

  const addColor = () => {
    const id = `c${Date.now()}`;
    const hex = "#8A8F86";
    const label = "New";
    setColors((prev) => [...prev, { id, hex, label }]);
    api.post("/habits/colors", { client_id: id, hex, label, order_index: colors.length })
      .catch((err) => console.error("Failed to save color:", err));
  };

  const removeColor = (id) => {
    setColors((prev) => prev.filter((c) => c.id !== id));
    api.delete(`/habits/colors/${id}`).catch((err) => console.error("Failed to delete color:", err));
  };

  const addGoal = () => {
    if (!newGoal.title.trim()) return;
    const id = `g${Date.now()}`;
    const goal = {
      id,
      ...newGoal,
      title: newGoal.title.trim(),
      notes: "",
      advanceMode: "manual",
      stages: [],
      currentStageId: null,
    };
    setGoals((prev) => [...prev, goal]);
    setNewGoal({ title: "", description: "", targetDate: "" });
    api.post("/habits/goals", {
      client_id: id,
      title: goal.title,
      description: goal.description || "",
      target_date: goal.targetDate || null,
    }).catch((err) => console.error("Failed to save goal:", err));
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
    if (expandedStageGoalId === id) setExpandedStageGoalId(null);
    api.delete(`/habits/goals/${id}`).catch((err) => console.error("Failed to delete goal:", err));
  };

  const toggleHabitGoal = (habitId, goalId) => {
    let willLink = false;
    setHabitGoals((prev) => {
      const current = new Set(prev[habitId] || []);
      if (current.has(goalId)) {
        current.delete(goalId);
        willLink = false;
      } else {
        current.add(goalId);
        willLink = true;
      }
      return { ...prev, [habitId]: current };
    });
    const call = willLink
      ? api.put(`/habits/${habitId}/goals/${goalId}`)
      : api.delete(`/habits/${habitId}/goals/${goalId}`);
    call.catch((err) => console.error("Failed to update habit/goal link:", err));
  };

  const setGoalAdvanceMode = (goalId, mode) => {
    setGoals((prev) =>
      prev.map((g) => (g.id === goalId ? { ...g, advanceMode: mode } : g))
    );
    api.patch(`/habits/goals/${goalId}`, { advance_mode: mode })
      .catch((err) => console.error("Failed to update advance mode:", err));
  };

  // `immediate`: when true, skips the debounce entirely and saves right now —
  // used for blur-triggered saves and the explicit "Save notes" button so
  // there's never a pending timer that a page refresh could wipe out.
  // Returns a Promise so callers (e.g. GoalPage's Save button / save status
  // indicator) can know when the save actually completes or fails.
  const updateGoalField = (goalId, field, value, immediate = false) => {
    setGoals((prev) =>
      prev.map((g) => (g.id === goalId ? { ...g, [field]: value } : g))
    );
    const fieldMap = { targetDate: "target_date" };
    const payload = { [fieldMap[field] || field]: value };
    const key = `goal:${goalId}:${field}`;

    if (immediate) {
      cancelDebouncedSave(key);
      return api.patch(`/habits/goals/${goalId}`, payload)
        .catch((err) => {
          console.error("Failed to update goal:", err);
          throw err;
        });
    }

    debouncedSave(key, () => {
      api.patch(`/habits/goals/${goalId}`, payload)
        .catch((err) => console.error("Failed to update goal:", err));
    }, field === "notes" ? 800 : 400);
    return Promise.resolve();
  };

  const addStage = (goalId, position = "end") => {
    const draft = newStageDrafts[goalId] || { label: "", criteria: "", startDate: "" };
    if (!draft.label.trim()) return;
    const stageId = `s${Date.now()}`;
    let finalStages = null;
    setGoals((prev) =>
      prev.map((g) => {
        if (g.id !== goalId) return g;
        const stage = {
          id: stageId,
          label: draft.label.trim(),
          criteria: draft.criteria.trim(),
          startDate: draft.startDate || "",
        };
        const stages = position === "start" ? [stage, ...g.stages] : [...g.stages, stage];
        finalStages = stages;
        // if this is the first stage and goal is manual, point currentStageId at it
        const currentStageId = g.currentStageId || (stages.length === 1 ? stage.id : g.currentStageId);
        return { ...g, stages, currentStageId };
      })
    );
    setNewStageDrafts((prev) => ({ ...prev, [goalId]: { label: "", criteria: "", startDate: "" } }));
    api.post(`/habits/goals/${goalId}/stages`, {
      client_id: stageId,
      label: draft.label.trim(),
      criteria: draft.criteria.trim(),
      start_date: draft.startDate || null,
      order_index: position === "start" ? 0 : (finalStages ? finalStages.length - 1 : 0),
    }).then(() => {
      // re-sync order_index for every stage so the new ordering sticks server-side
      if (finalStages) {
        finalStages.forEach((s, i) => {
          if (s.id === stageId) return; // already saved with the right order_index above
          api.patch(`/habits/goals/${goalId}/stages/${s.id}`, { order_index: i })
            .catch((err) => console.error("Failed to re-sync stage order:", err));
        });
      }
    }).catch((err) => console.error("Failed to save stage:", err));
  };

  const removeStage = (goalId, stageId) => {
    setGoals((prev) =>
      prev.map((g) => {
        if (g.id !== goalId) return g;
        const stages = g.stages.filter((s) => s.id !== stageId);
        const currentStageId = g.currentStageId === stageId ? (stages[0]?.id || null) : g.currentStageId;
        return { ...g, stages, currentStageId };
      })
    );
    api.delete(`/habits/goals/${goalId}/stages/${stageId}`)
      .catch((err) => console.error("Failed to delete stage:", err));
  };

  const moveStage = (goalId, stageId, direction) => {
    // direction: -1 = move earlier, 1 = move later
    let reordered = null;
    setGoals((prev) =>
      prev.map((g) => {
        if (g.id !== goalId) return g;
        const idx = g.stages.findIndex((s) => s.id === stageId);
        const newIdx = idx + direction;
        if (idx === -1 || newIdx < 0 || newIdx >= g.stages.length) return g;
        const stages = [...g.stages];
        [stages[idx], stages[newIdx]] = [stages[newIdx], stages[idx]];
        reordered = stages;
        return { ...g, stages };
      })
    );
    if (reordered) {
      reordered.forEach((s, i) => {
        api.patch(`/habits/goals/${goalId}/stages/${s.id}`, { order_index: i })
          .catch((err) => console.error("Failed to save stage order:", err));
      });
    }
  };

  const updateStageField = (goalId, stageId, field, value) => {
    setGoals((prev) =>
      prev.map((g) => {
        if (g.id !== goalId) return g;
        return {
          ...g,
          stages: g.stages.map((s) => (s.id === stageId ? { ...s, [field]: value } : s)),
        };
      })
    );
    const fieldMap = { label: "label", criteria: "criteria", startDate: "start_date" };
    const payload = { [fieldMap[field] || field]: value || null };
    debouncedSave(`stage:${stageId}:${field}`, () => {
      api.patch(`/habits/goals/${goalId}/stages/${stageId}`, payload)
        .catch((err) => console.error("Failed to update stage:", err));
    });
  };

  const advanceStage = (goalId) => {
    let nextStageId = null;
    setGoals((prev) =>
      prev.map((g) => {
        if (g.id !== goalId) return g;
        const idx = getStageIndex(g, g.currentStageId);
        const nextIdx = Math.min(idx + 1, g.stages.length - 1);
        nextStageId = g.stages[nextIdx]?.id || g.currentStageId;
        return { ...g, currentStageId: nextStageId };
      })
    );
    if (nextStageId) {
      api.patch(`/habits/goals/${goalId}`, { current_stage_client_id: nextStageId })
        .catch((err) => console.error("Failed to advance stage:", err));
    }
  };

  const regressStage = (goalId) => {
    let prevStageId = null;
    setGoals((prev) =>
      prev.map((g) => {
        if (g.id !== goalId) return g;
        const idx = getStageIndex(g, g.currentStageId);
        const prevIdx = Math.max(idx - 1, 0);
        prevStageId = g.stages[prevIdx]?.id || g.currentStageId;
        return { ...g, currentStageId: prevStageId };
      })
    );
    if (prevStageId) {
      api.patch(`/habits/goals/${goalId}`, { current_stage_client_id: prevStageId })
        .catch((err) => console.error("Failed to regress stage:", err));
    }
  };

  const visibleHabits = useMemo(() => {
    if (selectedGoalId === "all") return habits;
    return habits.filter((h) => habitGoals[h.id]?.has(selectedGoalId));
  }, [habits, habitGoals, selectedGoalId]);

  const selectedGoal = goals.find((g) => g.id === selectedGoalId);
  const selectedGoalStage = selectedGoal ? getActiveStage(selectedGoal, todayISO) : null;

  // Precompute, per habit, the list of {goal, stage} for goals that have stages
  // and that this habit is attached to — used to show the little subtitle under
  // the habit name in the grid.
  const habitStageInfo = useMemo(() => {
    const map = {};
    for (const h of habits) {
      const linkedGoalIds = habitGoals[h.id] ? Array.from(habitGoals[h.id]) : [];
      const entries = linkedGoalIds
        .map((gid) => goals.find((g) => g.id === gid))
        .filter((g) => g && g.stages && g.stages.length > 0)
        .map((g) => ({ goal: g, stage: getActiveStage(g, todayISO) }))
        .filter((entry) => entry.stage);
      if (entries.length > 0) map[h.id] = entries;
    }
    return map;
  }, [habits, habitGoals, goals, todayISO]);

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

  if (loading) {
    return (
      <div style={{ fontFamily: FONT_BODY, background: PAGE, color: MUTED, minHeight: "100vh", padding: "28px 24px", textAlign: "center" }}>
        Loading your habits…
      </div>
    );
  }

  if (openGoalId) {
    const openGoal = goals.find((g) => g.id === openGoalId);
    return (
      <GoalPage
        goal={openGoal}
        todayISO={todayISO}
        onBack={() => setOpenGoalId(null)}
        onUpdateGoal={(field, value, immediate) => updateGoalField(openGoalId, field, value, immediate)}
        onSetAdvanceMode={(mode) => setGoalAdvanceMode(openGoalId, mode)}
        onAddStage={(position) => addStage(openGoalId, position)}
        onRemoveStage={(stageId) => removeStage(openGoalId, stageId)}
        onMoveStage={(stageId, dir) => moveStage(openGoalId, stageId, dir)}
        onUpdateStageField={(stageId, field, value) => updateStageField(openGoalId, stageId, field, value)}
        onAdvanceStage={() => advanceStage(openGoalId)}
        onRegressStage={() => regressStage(openGoalId)}
        newStageDraft={newStageDrafts[openGoalId]}
        onChangeNewStageDraft={(draft) => setNewStageDrafts((prev) => ({ ...prev, [openGoalId]: draft }))}
      />
    );
  }

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
        .hg-btn-accent {
          border-color: ${ACCENT};
          color: white;
          background: ${ACCENT};
        }
        .hg-btn-accent:hover { background: #4d6b4d; }
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
        input.hg-input, select.hg-input {
          font-family: ${FONT_BODY};
          border: 1px solid ${LINE};
          border-radius: 6px;
          padding: 5px 8px;
          font-size: 13px;
          background: white;
          color: ${INK};
        }
        input.hg-input:focus, select.hg-input:focus { outline: none; border-color: ${MUTED}; }
        .hg-grids {
          flex-direction: column;
        }
        .hg-month-block {
          flex-shrink: 0;
        }
        @media (min-width: 860px) {
          .hg-grids {
            flex-direction: row;
            align-items: flex-start;
          }
        }
        .hg-stage-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11.5px;
          font-family: ${FONT_MONO};
          color: ${ACCENT};
          background: rgba(92,122,92,0.1);
          border-radius: 4px;
          padding: 1px 6px;
        }
      `}</style>

      {/* Header */}
      <div style={{ maxWidth: 920, margin: "0 auto 22px", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1 style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 26, margin: 0 }}>Habit grid</h1>
        <button className="hg-btn" onClick={() => setEditingLegend((v) => !v)}>
          {editingLegend ? "Done editing" : "Edit colors & habits"}
        </button>
      </div>

      {loadError && (
        <div style={{ maxWidth: 920, margin: "0 auto 16px", color: "#B5654A", fontSize: 13 }}>
          {loadError}
        </div>
      )}

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
          <span
            onClick={() => setOpenGoalId(selectedGoal.id)}
            style={{ cursor: "pointer", color: ACCENT, fontSize: 12.5, textDecoration: "underline" }}
          >
            open goal page →
          </span>
        )}
        {selectedGoal && (
          <div style={{ fontSize: 12.5, color: MUTED, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            {selectedGoal.description && <span>{selectedGoal.description}</span>}
            {selectedGoal.targetDate && (
              <span style={{ fontFamily: FONT_MONO }}>target: {selectedGoal.targetDate}</span>
            )}
            {selectedGoalStage && (
              <span className="hg-stage-pill">
                now: {selectedGoalStage.label}
                {selectedGoalStage.criteria ? ` — ${selectedGoalStage.criteria}` : ""}
              </span>
            )}
            {selectedGoal.advanceMode === "manual" && selectedGoal.stages.length > 1 && (
              <div style={{ display: "flex", gap: 4 }}>
                <button
                  className="hg-btn"
                  style={{ padding: "3px 8px", fontSize: 12 }}
                  onClick={() => regressStage(selectedGoal.id)}
                  disabled={getStageIndex(selectedGoal, selectedGoal.currentStageId) <= 0}
                >
                  ← back a stage
                </button>
                <button
                  className="hg-btn hg-btn-accent"
                  style={{ padding: "3px 8px", fontSize: 12 }}
                  onClick={() => advanceStage(selectedGoal.id)}
                  disabled={getStageIndex(selectedGoal, selectedGoal.currentStageId) >= selectedGoal.stages.length - 1}
                >
                  advance to next stage →
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Goal manager (edit mode) */}
      {editingLegend && (
        <div style={{ maxWidth: 920, margin: "0 auto 20px", border: `1px solid ${LINE}`, borderRadius: 8, padding: 14 }}>
          <h4 style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 14, margin: "0 0 10px" }}>Goals</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
            {goals.map((g) => {
              const expired = g.targetDate && g.targetDate < todayISO;
              const isExpanded = expandedStageGoalId === g.id;
              const draft = newStageDrafts[g.id] || { label: "", criteria: "", startDate: "" };
              const activeStage = getActiveStage(g, todayISO);
              return (
                <div key={g.id} style={{ border: `1px solid ${LINE_SOFT}`, borderRadius: 8, padding: 10, opacity: expired ? 0.55 : 1 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
                    <span
                      style={{ fontWeight: 500, minWidth: 120, cursor: "pointer", textDecoration: "underline", textDecorationColor: LINE }}
                      onClick={() => setOpenGoalId(g.id)}
                    >
                      {g.title}
                    </span>
                    <span style={{ color: MUTED, flex: 1 }}>{g.description}</span>
                    <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: MUTED }}>
                      {g.targetDate}{expired ? " (past)" : ""}
                    </span>
                    {g.stages.length > 0 && (
                      <span className="hg-stage-pill">{g.stages.length} stage{g.stages.length !== 1 ? "s" : ""}</span>
                    )}
                    <span
                      onClick={() => setExpandedStageGoalId(isExpanded ? null : g.id)}
                      style={{ cursor: "pointer", color: ACCENT, fontSize: 12.5, textDecoration: "underline" }}
                    >
                      {isExpanded ? "hide stages" : "stages"}
                    </span>
                    <span onClick={() => removeGoal(g.id)} style={{ cursor: "pointer", color: MUTED }}>✕</span>
                  </div>

                  {isExpanded && (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px dashed ${LINE}` }}>
                      {/* advance mode toggle */}
                      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10, fontSize: 12.5 }}>
                        <span style={{ color: MUTED }}>Progression:</span>
                        <label style={{ display: "flex", gap: 4, alignItems: "center", cursor: "pointer" }}>
                          <input
                            type="radio"
                            checked={g.advanceMode === "auto"}
                            onChange={() => setGoalAdvanceMode(g.id, "auto")}
                          />
                          Auto-advance by date
                        </label>
                        <label style={{ display: "flex", gap: 4, alignItems: "center", cursor: "pointer" }}>
                          <input
                            type="radio"
                            checked={g.advanceMode === "manual"}
                            onChange={() => setGoalAdvanceMode(g.id, "manual")}
                          />
                          I'll advance it myself
                        </label>
                      </div>

                      {/* stage list */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
                        {g.stages.map((s, i) => {
                          const isActive = activeStage && activeStage.id === s.id;
                          return (
                            <div
                              key={s.id}
                              style={{
                                display: "flex",
                                gap: 6,
                                alignItems: "center",
                                fontSize: 12.5,
                                background: isActive ? "rgba(92,122,92,0.08)" : "transparent",
                                borderRadius: 6,
                                padding: "4px 6px",
                              }}
                            >
                              <span style={{ fontFamily: FONT_MONO, color: MUTED, width: 16 }}>{i + 1}.</span>
                              <span
                                onClick={() => i > 0 && moveStage(g.id, s.id, -1)}
                                title="Move earlier"
                                style={{ cursor: i > 0 ? "pointer" : "default", color: i > 0 ? ACCENT : LINE, fontSize: 11, userSelect: "none" }}
                              >▲</span>
                              <span
                                onClick={() => i < g.stages.length - 1 && moveStage(g.id, s.id, 1)}
                                title="Move later"
                                style={{ cursor: i < g.stages.length - 1 ? "pointer" : "default", color: i < g.stages.length - 1 ? ACCENT : LINE, fontSize: 11, userSelect: "none" }}
                              >▼</span>
                              <input
                                className="hg-input"
                                style={{ width: 130 }}
                                value={s.label}
                                placeholder="Stage label"
                                onChange={(e) => updateStageField(g.id, s.id, "label", e.target.value)}
                              />
                              <input
                                className="hg-input"
                                style={{ flex: 1, minWidth: 140 }}
                                value={s.criteria}
                                placeholder="What counts as done"
                                onChange={(e) => updateStageField(g.id, s.id, "criteria", e.target.value)}
                              />
                              {g.advanceMode === "auto" && (
                                <input
                                  className="hg-input"
                                  type="date"
                                  style={{ width: 130 }}
                                  value={s.startDate}
                                  onChange={(e) => updateStageField(g.id, s.id, "startDate", e.target.value)}
                                />
                              )}
                              {isActive && <span className="hg-stage-pill">active now</span>}
                              <span onClick={() => removeStage(g.id, s.id)} style={{ cursor: "pointer", color: MUTED }}>✕</span>
                            </div>
                          );
                        })}
                        {g.stages.length === 0 && (
                          <span style={{ fontSize: 12.5, color: MUTED }}>No stages yet — this goal is flat (no progression).</span>
                        )}
                      </div>

                      {/* add stage */}
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <input
                          className="hg-input"
                          placeholder="Stage label (e.g. 'Full cup')"
                          value={draft.label}
                          onChange={(e) => setNewStageDrafts((prev) => ({ ...prev, [g.id]: { ...draft, label: e.target.value } }))}
                          style={{ width: 150 }}
                        />
                        <input
                          className="hg-input"
                          placeholder="Criteria (optional)"
                          value={draft.criteria}
                          onChange={(e) => setNewStageDrafts((prev) => ({ ...prev, [g.id]: { ...draft, criteria: e.target.value } }))}
                          style={{ width: 200 }}
                        />
                        {g.advanceMode === "auto" && (
                          <input
                            className="hg-input"
                            type="date"
                            value={draft.startDate}
                            onChange={(e) => setNewStageDrafts((prev) => ({ ...prev, [g.id]: { ...draft, startDate: e.target.value } }))}
                            style={{ width: 140 }}
                          />
                        )}
                        <button className="hg-btn" onClick={() => addStage(g.id, "start")}>+ add at start</button>
                        <button className="hg-btn" onClick={() => addStage(g.id, "end")}>+ add at end</button>
                      </div>
                    </div>
                  )}
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
        className="hg-grids"
        style={{
          maxWidth: compact || zoom > 1 ? "100%" : 920,
          margin: "0 auto",
          display: "flex",
          gap: compact ? 18 : 32,
          overflowX: "auto",
        }}
      >
        {months.map(({ year, month }) => (
          <div className="hg-month-block" key={`${year}-${month}`}>
            <MonthGrid
              year={year}
              month={month}
              habits={visibleHabits}
              marks={marks}
              colorById={colorById}
              editingLegend={editingLegend}
              onRemoveHabit={removeHabit}
              onRenameHabit={renameHabit}
              onMoveHabit={moveHabit}
              goals={goals}
              habitGoals={habitGoals}
              onToggleHabitGoal={toggleHabitGoal}
              compact={compact}
              compactCellSize={compactCellSize}
              compactSidebarWidth={COMPACT_SIDEBAR}
              compactGap={COMPACT_GAP}
              habitStageInfo={habitStageInfo}
              onCellClick={(habitId, dateKey, e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setPickerFor({ habitId, dateKey, x: rect.left, y: rect.bottom + 6 });
              }}
            />
          </div>
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

function MonthGrid({ year, month, habits, marks, colorById, editingLegend, onCellClick, onRemoveHabit, onRenameHabit, onMoveHabit, goals, habitGoals, onToggleHabitGoal, compact, compactCellSize, compactSidebarWidth, compactGap, habitStageInfo }) {
  const numDays = daysInMonth(year, month);
  const dayNums = Array.from({ length: numDays }, (_, i) => i + 1);
  const todayKey = keyFor(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

  const cellSize = compact ? (compactCellSize || 9) : 26;
  const cellGap = compact ? (compactGap ?? 1) : 2;
  const sidebarWidth = compact ? (compactSidebarWidth || 56) : 150;
  const nameFontSize = compact ? 9.5 : 13;
  const headerFontSize = compact ? Math.max(5, Math.min(8, cellSize - 2)) : 10;

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
                {d}
              </div>
            );
          })}
        </div>

        {/* Habit rows */}
        {habits.map((h) => {
          const stageEntries = !compact ? habitStageInfo[h.id] : null;
          return (
          <div key={h.id} style={{ marginBottom: editingLegend && goals.length > 0 ? 14 : (compact ? 1 : 4) }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <div
                style={{
                  width: sidebarWidth,
                  fontSize: nameFontSize,
                  paddingRight: 10,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  flexShrink: 0,
                  position: "sticky",
                  left: 0,
                  background: PAGE,
                  zIndex: 2,
                  overflow: "hidden",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  {editingLegend && (
                    <span style={{ display: "flex", flexDirection: "column", marginRight: 4, flexShrink: 0 }}>
                      <span
                        onClick={() => habits.findIndex((x) => x.id === h.id) > 0 && onMoveHabit(h.id, -1)}
                        title="Move up"
                        style={{
                          cursor: habits.findIndex((x) => x.id === h.id) > 0 ? "pointer" : "default",
                          color: habits.findIndex((x) => x.id === h.id) > 0 ? ACCENT : LINE,
                          fontSize: 10,
                          lineHeight: 1,
                          userSelect: "none",
                        }}
                      >▲</span>
                      <span
                        onClick={() => habits.findIndex((x) => x.id === h.id) < habits.length - 1 && onMoveHabit(h.id, 1)}
                        title="Move down"
                        style={{
                          cursor: habits.findIndex((x) => x.id === h.id) < habits.length - 1 ? "pointer" : "default",
                          color: habits.findIndex((x) => x.id === h.id) < habits.length - 1 ? ACCENT : LINE,
                          fontSize: 10,
                          lineHeight: 1,
                          userSelect: "none",
                        }}
                      >▼</span>
                    </span>
                  )}
                  {editingLegend ? (
                    <input
                      className="hg-input"
                      value={h.name}
                      onChange={(e) => onRenameHabit(h.id, e.target.value)}
                      style={{ width: "100%", fontSize: nameFontSize, padding: "2px 6px" }}
                    />
                  ) : (
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.name}</span>
                  )}
                  {editingLegend && (
                    <span onClick={() => onRemoveHabit(h.id)} style={{ cursor: "pointer", color: MUTED, fontSize: 12, flexShrink: 0, marginLeft: 4 }}>✕</span>
                  )}
                </div>
                {stageEntries && stageEntries.length > 0 && (
                  <span
                    title={stageEntries.map((e) => `${e.goal.title}: ${e.stage.label}${e.stage.criteria ? " — " + e.stage.criteria : ""}`).join(" | ")}
                    style={{
                      fontSize: 10.5,
                      color: ACCENT,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {stageEntries.map((e) => e.stage.label).join(" · ")}
                  </span>
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
          );
        })}
      </div>
    </div>
  );
}