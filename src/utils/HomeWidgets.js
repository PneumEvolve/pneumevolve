// src/utils/homeWidgets.js
export const HOME_WIDGETS_LS_KEY = "pe_home_widgets_v1";

// default is intentionally small
export const DEFAULT_WIDGETS = ["checkin", "notes"];

export function loadHomeWidgets() {
  try {
    const raw = localStorage.getItem(HOME_WIDGETS_LS_KEY);
    if (!raw) return [...DEFAULT_WIDGETS];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...DEFAULT_WIDGETS];
    return parsed.filter(Boolean);
  } catch {
    return [...DEFAULT_WIDGETS];
  }
}

export function saveHomeWidgets(ids) {
  try {
    localStorage.setItem(HOME_WIDGETS_LS_KEY, JSON.stringify(ids));
  } catch {
    // ignore
  }
}