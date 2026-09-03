import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

// ---- Palette (reuses the same paper/graphite feel as HabitGrid) ----
const PAGE = "#FAF7F0";
const INK = "#2B2925";
const LINE = "#D9D3C4";
const LINE_SOFT = "#EAE5D8";
const MUTED = "#8C8676";
const ACCENT = "#5C7A5C";

const FONT_DISPLAY = "'Fraunces', Georgia, serif";
const FONT_BODY = "'Inter', system-ui, sans-serif";
const FONT_MONO = "'JetBrains Mono', 'Courier New', monospace";

const STATUS_OPTIONS = [
  { value: "no_answer", label: "No answer", color: "#8C8676" },
  { value: "not_interested", label: "Not interested", color: "#B5654A" },
  { value: "interested", label: "Interested", color: "#D8B24A" },
  { value: "follow_up", label: "Follow up", color: "#5C7AA0" },
  { value: "sold", label: "Sold", color: "#5C7A5C" },
];

const SORT_OPTIONS = [
  { value: "number_asc", label: "House # (low → high)" },
  { value: "number_desc", label: "House # (high → low)" },
  { value: "visited_desc", label: "Visited (newest)" },
  { value: "visited_asc", label: "Visited (oldest)" },
];

const statusMeta = (value) => STATUS_OPTIONS.find((s) => s.value === value) || STATUS_OPTIONS[0];

const SERVICE_CHIPS = ["Lawn", "Deck", "Fence", "Fall cleanup"];

function toggleChip(current, chip) {
  const parts = current.split(",").map((s) => s.trim()).filter(Boolean);
  const idx = parts.findIndex((p) => p.toLowerCase() === chip.toLowerCase());
  if (idx >= 0) {
    parts.splice(idx, 1);
  } else {
    parts.push(chip);
  }
  return parts.join(", ");
}

// Pulls the leading house number off an address for the collapsed card
// display ("123 Example St" -> "123"). Falls back to the first chunk of
// the address text if it doesn't start with digits, so nothing breaks on
// an oddly-formatted entry.
function houseNumberFrom(address) {
  const match = address.trim().match(/^(\d+[A-Za-z]?)/);
  if (match) return match[1];
  return address.trim().split(/\s+/)[0] || "?";
}

// Numeric-aware compare for house numbers like "123" or "123A" — falls
// back to string compare if either side isn't a leading number.
function compareHouseNumbers(a, b) {
  const na = parseInt(a, 10);
  const nb = parseInt(b, 10);
  if (!isNaN(na) && !isNaN(nb) && na !== nb) return na - nb;
  return a.localeCompare(b);
}

// Downloads a blob response through a real anchor click, since the export
// endpoint needs the same Authorization header as every other api.* call —
// a plain window.open(url) wouldn't carry that.
async function downloadCsv(url, fallbackName) {
  const res = await api.get(url, { responseType: "blob" });
  const disposition = res.headers?.["content-disposition"] || "";
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match ? match[1] : fallbackName;
  const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(blobUrl);
}

export default function DoorSalesTracker() {
  const { userId, accessToken } = useAuth();
  const navigate = useNavigate();

  const [neighborhoods, setNeighborhoods] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [houses, setHouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [newNeighborhoodName, setNewNeighborhoodName] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("number_asc");
  const [expandedIds, setExpandedIds] = useState(() => new Set());

  const [newAddress, setNewAddress] = useState("");
  const [newService, setNewService] = useState("");
  const [newStatus, setNewStatus] = useState("no_answer");
  const [newAppointment, setNewAppointment] = useState("");

  const [appointments, setAppointments] = useState([]);

  // ---- auth gate — redirect to login if there's no active session,
  // matching the pattern used on other fully-protected pages (Habits,
  // Clear & Calm). ----
  useEffect(() => {
    if (!accessToken) {
      navigate("/login");
    }
  }, [accessToken, navigate]);

  // ---- load neighborhoods on mount ----
  const loadNeighborhoods = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await api.get("/door-sales/neighborhoods");
      setNeighborhoods(res.data);
    } catch (err) {
      console.error("Failed to load neighborhoods:", err);
      setLoadError("Couldn't load your neighborhoods right now.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNeighborhoods();
  }, [loadNeighborhoods]);

  // ---- load upcoming appointments (landing page, cross-neighborhood) ----
  const loadAppointments = useCallback(async () => {
    try {
      const res = await api.get("/door-sales/appointments");
      setAppointments(res.data);
    } catch (err) {
      console.error("Failed to load appointments:", err);
    }
  }, []);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  // ---- load houses whenever the selected neighborhood or filter changes ----
  const loadHouses = useCallback(async () => {
    if (!selectedId) return;
    try {
      const params = statusFilter !== "all" ? { status: statusFilter } : {};
      const res = await api.get(`/door-sales/neighborhoods/${selectedId}/houses`, { params });
      setHouses(res.data);
    } catch (err) {
      console.error("Failed to load houses:", err);
    }
  }, [selectedId, statusFilter]);

  useEffect(() => {
    loadHouses();
  }, [loadHouses]);

  // Collapse everything back down when switching neighborhoods or filters,
  // so an expanded card from a previous view doesn't linger open.
  useEffect(() => {
    setExpandedIds(new Set());
  }, [selectedId, statusFilter]);

  // ---- neighborhood actions ----

  const addNeighborhood = async () => {
    const name = newNeighborhoodName.trim();
    if (!name) return;
    setNewNeighborhoodName("");
    try {
      const res = await api.post("/door-sales/neighborhoods", { name });
      setNeighborhoods((prev) => [...prev, res.data].sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err) {
      console.error("Failed to add neighborhood:", err);
    }
  };

  const removeNeighborhood = async (id) => {
    setNeighborhoods((prev) => prev.filter((n) => n.id !== id));
    if (selectedId === id) setSelectedId(null);
    try {
      await api.delete(`/door-sales/neighborhoods/${id}`);
    } catch (err) {
      console.error("Failed to delete neighborhood:", err);
    }
  };

  // ---- house actions ----

  const addHouse = async () => {
    const address = newAddress.trim();
    if (!address || !selectedId) return;
    setNewAddress("");
    const appointmentIso = newAppointment ? new Date(newAppointment).toISOString() : null;
    setNewAppointment("");
    try {
      const res = await api.post(`/door-sales/neighborhoods/${selectedId}/houses`, {
        address,
        service_interest: newService.trim() || null,
        status: newStatus,
        appointment_at: appointmentIso,
      });
      setHouses((prev) => [res.data, ...prev]);
      setNeighborhoods((prev) =>
        prev.map((n) => (n.id === selectedId ? { ...n, house_count: (n.house_count || 0) + 1 } : n))
      );
      if (appointmentIso) loadAppointments();
    } catch (err) {
      console.error("Failed to add house:", err);
    }
  };

  const updateHouse = async (id, patch) => {
    setHouses((prev) => prev.map((h) => (h.id === id ? { ...h, ...patch } : h)));
    try {
      await api.patch(`/door-sales/houses/${id}`, patch);
      // Any change touching the appointment fields can affect the landing
      // page's upcoming list (new time, cleared time, marked done) — just
      // refetch it rather than trying to patch it in place from here.
      if ("appointment_at" in patch || "appointment_completed" in patch) {
        loadAppointments();
      }
    } catch (err) {
      console.error("Failed to update house:", err);
    }
  };

  const removeHouse = async (id) => {
    setHouses((prev) => prev.filter((h) => h.id !== id));
    setNeighborhoods((prev) =>
      prev.map((n) => (n.id === selectedId ? { ...n, house_count: Math.max(0, (n.house_count || 1) - 1) } : n))
    );
    try {
      await api.delete(`/door-sales/houses/${id}`);
      loadAppointments();
    } catch (err) {
      console.error("Failed to delete house:", err);
    }
  };

  const toggleExpanded = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ---- sorting (filtering already happened server-side via statusFilter) ----
  const sortedHouses = useMemo(() => {
    const list = [...houses];
    list.sort((a, b) => {
      switch (sortBy) {
        case "number_desc":
          return compareHouseNumbers(houseNumberFrom(b.address), houseNumberFrom(a.address));
        case "visited_desc":
          return new Date(b.visited_at) - new Date(a.visited_at);
        case "visited_asc":
          return new Date(a.visited_at) - new Date(b.visited_at);
        case "number_asc":
        default:
          return compareHouseNumbers(houseNumberFrom(a.address), houseNumberFrom(b.address));
      }
    });
    return list;
  }, [houses, sortBy]);

  const selectedNeighborhood = neighborhoods.find((n) => n.id === selectedId);

  if (loading) {
    return (
      <div style={{ fontFamily: FONT_BODY, background: PAGE, color: MUTED, minHeight: "100vh", padding: "28px 24px", textAlign: "center" }}>
        Loading your neighborhoods…
      </div>
    );
  }

  return (
    <div style={{ fontFamily: FONT_BODY, background: PAGE, color: INK, minHeight: "100vh", padding: "18px 14px 40px" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        .ds-btn {
          font-family: ${FONT_BODY};
          cursor: pointer;
          border: 1px solid ${LINE};
          background: ${PAGE};
          color: ${INK};
          border-radius: 6px;
          font-size: 13px;
          padding: 7px 12px;
        }
        .ds-btn:hover { background: ${LINE_SOFT}; }
        .ds-btn-accent {
          border-color: ${ACCENT};
          color: white;
          background: ${ACCENT};
        }
        .ds-btn-accent:hover { background: #4d6b4d; }
        input.ds-input, select.ds-input {
          font-family: ${FONT_BODY};
          border: 1px solid ${LINE};
          border-radius: 6px;
          padding: 7px 9px;
          font-size: 13.5px;
          background: white;
          color: ${INK};
        }
        input.ds-input:focus, select.ds-input:focus { outline: none; border-color: ${MUTED}; }
        .ds-chip {
          font-size: 12px;
          padding: 4px 10px;
          border-radius: 999px;
          border: 1px solid ${LINE};
          cursor: pointer;
          background: white;
          color: ${MUTED};
        }
        .ds-chip:hover { border-color: ${ACCENT}; color: ${ACCENT}; }
        .ds-chip-active {
          border-color: ${ACCENT};
          background: rgba(92,122,92,0.12);
          color: ${ACCENT};
        }
        .ds-nb-card {
          border: 1px solid ${LINE};
          border-radius: 10px;
          padding: 16px;
          cursor: pointer;
          background: white;
          min-width: 150px;
        }
        .ds-nb-card:hover { border-color: ${ACCENT}; }
        .ds-appt-row {
          border: 1px solid ${LINE};
          border-radius: 8px;
          padding: 8px 12px;
          cursor: pointer;
          background: white;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
        }
        .ds-appt-row:hover { border-color: ${ACCENT}; }
        .ds-num-card {
          border: 1.5px solid ${LINE};
          border-radius: 10px;
          padding: 10px 6px;
          cursor: pointer;
          background: white;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          width: 64px;
          height: 56px;
          flex-shrink: 0;
        }
        .ds-num-card:hover { border-color: ${ACCENT}; }
        .ds-house-row {
          border: 1px solid ${LINE_SOFT};
          border-radius: 8px;
          padding: 10px 12px;
          margin-bottom: 8px;
          background: white;
        }
      `}</style>

      {loadError && (
        <div style={{ maxWidth: 720, margin: "0 auto 16px", color: "#B5654A", fontSize: 13 }}>{loadError}</div>
      )}

      {/* ---- Landing view: appointments + neighborhood cards ---- */}
      {!selectedId && (
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 18 }}>
            <h1 style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 24, margin: 0 }}>Door Sales</h1>
            {neighborhoods.length > 0 && (
              <button
                className="ds-btn"
                onClick={() => downloadCsv("/door-sales/export", "door-sales-all.csv")}
              >
                Export all (CSV)
              </button>
            )}
          </div>

          {appointments.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 15, margin: "0 0 8px" }}>
                Upcoming appointments
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {appointments.map((a) => (
                  <div
                    key={a.house_id}
                    className="ds-appt-row"
                    onClick={() => setSelectedId(a.neighborhood_id)}
                  >
                    <span>
                      {a.address} <span style={{ color: MUTED }}>· {a.neighborhood_name}</span>
                    </span>
                    <span style={{ fontFamily: FONT_MONO, color: ACCENT }}>
                      {new Date(a.appointment_at).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
            <input
              className="ds-input"
              placeholder="New neighborhood (e.g. Summerside)"
              value={newNeighborhoodName}
              onChange={(e) => setNewNeighborhoodName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addNeighborhood()}
              style={{ flex: 1 }}
            />
            <button className="ds-btn ds-btn-accent" onClick={addNeighborhood}>Add</button>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            {neighborhoods.map((n) => (
              <div key={n.id} className="ds-nb-card" onClick={() => setSelectedId(n.id)}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 16 }}>{n.name}</span>
                  <span
                    onClick={(e) => { e.stopPropagation(); removeNeighborhood(n.id); }}
                    style={{ cursor: "pointer", color: MUTED, fontSize: 12 }}
                  >
                    ✕
                  </span>
                </div>
                <div style={{ fontSize: 12.5, color: MUTED, marginTop: 6, fontFamily: FONT_MONO }}>
                  {n.house_count} house{n.house_count !== 1 ? "s" : ""}
                </div>
              </div>
            ))}
            {neighborhoods.length === 0 && (
              <span style={{ fontSize: 13, color: MUTED }}>No neighborhoods yet — add one above to get started.</span>
            )}
          </div>
        </div>
      )}

      {/* ---- Neighborhood detail: house list ---- */}
      {selectedId && (
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <span onClick={() => setSelectedId(null)} style={{ cursor: "pointer", color: ACCENT, fontSize: 13 }}>
                ← neighborhoods
              </span>
              <h1 style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 22, margin: 0 }}>
                {selectedNeighborhood?.name}
              </h1>
            </div>
            <button
              className="ds-btn"
              onClick={() =>
                downloadCsv(
                  `/door-sales/neighborhoods/${selectedId}/export`,
                  `door-sales-${selectedNeighborhood?.name || "neighborhood"}.csv`
                )
              }
            >
              Export CSV
            </button>
          </div>

          {/* Quick-add bar */}
          <div style={{ border: `1px solid ${LINE}`, borderRadius: 10, padding: 12, marginBottom: 18, background: "white" }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
              <input
                className="ds-input"
                placeholder="Address"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addHouse()}
                style={{ flex: "1 1 180px" }}
              />
              <select
                className="ds-input"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                style={{ width: 140 }}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              <input
                className="ds-input"
                type="datetime-local"
                value={newAppointment}
                onChange={(e) => setNewAppointment(e.target.value)}
                title="Appointment (optional)"
                style={{ width: 200 }}
              />
              <button className="ds-btn ds-btn-accent" onClick={addHouse}>Add house</button>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <input
                className="ds-input"
                placeholder="Service interest (free text)"
                value={newService}
                onChange={(e) => setNewService(e.target.value)}
                style={{ flex: "1 1 200px" }}
              />
              {SERVICE_CHIPS.map((chip) => {
                const active = newService.toLowerCase().split(",").map((s) => s.trim()).includes(chip.toLowerCase());
                return (
                  <span
                    key={chip}
                    className={`ds-chip ${active ? "ds-chip-active" : ""}`}
                    onClick={() => setNewService((prev) => toggleChip(prev, chip))}
                  >
                    {chip}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Filter + sort controls */}
          <div style={{ display: "flex", gap: 10, marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>
            <span
              className={`ds-chip ${statusFilter === "all" ? "ds-chip-active" : ""}`}
              onClick={() => setStatusFilter("all")}
            >
              All
            </span>
            {STATUS_OPTIONS.map((s) => (
              <span
                key={s.value}
                className={`ds-chip ${statusFilter === s.value ? "ds-chip-active" : ""}`}
                onClick={() => setStatusFilter(s.value)}
              >
                {s.label}
              </span>
            ))}
            <select
              className="ds-input"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{ marginLeft: "auto", minWidth: 190 }}
            >
              {SORT_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Collapsed number cards — tap to expand into the full form */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {sortedHouses.map((h) => {
              const meta = statusMeta(h.status);
              const num = houseNumberFrom(h.address);
              const hasOpenAppointment = h.appointment_at && !h.appointment_completed;
              const isOpen = expandedIds.has(h.id);
              return (
                <div
                  key={h.id}
                  className="ds-num-card"
                  onClick={() => toggleExpanded(h.id)}
                  style={{
                    borderColor: isOpen ? ACCENT : LINE,
                    background: isOpen ? "rgba(92,122,92,0.06)" : "white",
                  }}
                  title={h.address}
                >
                  <span style={{ fontFamily: FONT_MONO, fontWeight: 600, fontSize: 15 }}>{num}</span>
                  <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: meta.color }} />
                    {hasOpenAppointment && (
                      <span style={{ fontSize: 9, color: ACCENT }}>📅</span>
                    )}
                  </div>
                </div>
              );
            })}
            {sortedHouses.length === 0 && (
              <div style={{ fontSize: 13, color: MUTED, padding: "20px 0" }}>
                No houses logged yet{statusFilter !== "all" ? " for this filter" : ""}.
              </div>
            )}
          </div>

          {/* Expanded forms for whichever cards are open, in the same sorted order */}
          {sortedHouses.filter((h) => expandedIds.has(h.id)).map((h) => {
            const meta = statusMeta(h.status);
            return (
              <div key={h.id} className="ds-house-row">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, flexWrap: "wrap" }}>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{h.address}</div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <span onClick={() => toggleExpanded(h.id)} style={{ cursor: "pointer", color: ACCENT, fontSize: 12 }}>
                      collapse ▲
                    </span>
                    <span onClick={() => removeHouse(h.id)} style={{ cursor: "pointer", color: MUTED, fontSize: 12 }}>✕</span>
                  </div>
                </div>

                <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>
                  Visited: {new Date(h.visited_at).toLocaleDateString()}
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8, alignItems: "center" }}>
                  <select
                    className="ds-input"
                    value={h.status}
                    onChange={(e) => updateHouse(h.id, { status: e.target.value })}
                    style={{ width: 140, borderColor: meta.color }}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                  <input
                    className="ds-input"
                    placeholder="Service interest"
                    defaultValue={h.service_interest || ""}
                    onBlur={(e) => updateHouse(h.id, { service_interest: e.target.value })}
                    style={{ width: 160 }}
                  />
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11.5, color: MUTED }}>Appointment:</span>
                  <input
                    className="ds-input"
                    type="datetime-local"
                    value={h.appointment_at ? h.appointment_at.slice(0, 16) : ""}
                    onChange={(e) =>
                      updateHouse(h.id, {
                        appointment_at: e.target.value ? new Date(e.target.value).toISOString() : null,
                      })
                    }
                    style={{ width: 200 }}
                  />
                  {h.appointment_at && (
                    <label style={{ display: "flex", gap: 4, alignItems: "center", fontSize: 12, color: MUTED, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={h.appointment_completed}
                        onChange={(e) => updateHouse(h.id, { appointment_completed: e.target.checked })}
                      />
                      Appointment done
                    </label>
                  )}
                </div>

                <textarea
                  className="ds-input"
                  placeholder="Notes…"
                  defaultValue={h.notes || ""}
                  onBlur={(e) => updateHouse(h.id, { notes: e.target.value })}
                  style={{ width: "100%", marginTop: 8, minHeight: 40, resize: "vertical" }}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}