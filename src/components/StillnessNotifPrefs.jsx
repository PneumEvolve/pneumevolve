// src/components/StillnessNotifPrefs.jsx
import { useState, useEffect } from "react";
import { api } from "@/lib/api";

function Toggle({ label, enabled, saving, onToggle }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
      <span style={{ fontSize: "0.72rem", opacity: 0.5, minWidth: 36 }}>{label}</span>
      <button
        onClick={onToggle}
        disabled={saving}
        style={{
          background: "none",
          border: "1px solid var(--border)",
          borderRadius: "999px",
          padding: "0.25rem 0.75rem",
          fontSize: "0.7rem",
          color: "var(--text)",
          cursor: saving ? "default" : "pointer",
          opacity: saving ? 0.4 : enabled ? 1 : 0.4,
          transition: "opacity 0.2s",
          whiteSpace: "nowrap",
        }}
      >
        {saving ? "saving…" : enabled ? "on" : "off"}
      </button>
    </div>
  );
}

export default function StillnessNotifPrefs() {
  const [prefs, setPrefs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({}); // { [group_id]: bool }

  useEffect(() => {
    api.get("/stillness/notification-prefs")
      .then(res => setPrefs(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function update(groupId, patch) {
    const current = prefs.find(p => p.group_id === groupId);
    if (!current) return;

    setSaving(prev => ({ ...prev, [groupId]: true }));
    const next = { ...current, ...patch };
    try {
      await api.put(`/stillness/notification-prefs/${groupId}`, {
        email_enabled: next.email_enabled,
        sms_enabled: next.sms_enabled,
      });
      setPrefs(prev => prev.map(p => p.group_id === groupId ? next : p));
    } catch {
      // silent for now
    } finally {
      setSaving(prev => ({ ...prev, [groupId]: false }));
    }
  }

  if (loading) return null;

  if (!prefs.length) return (
    <div style={{ fontSize: "0.75rem", opacity: 0.4, marginTop: "0.5rem" }}>
      You're not in any stillness groups yet.
    </div>
  );

  return (
    <div style={{ marginTop: "1rem" }}>
      <div style={{
        fontSize: "0.75rem",
        fontWeight: 500,
        opacity: 0.5,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        marginBottom: "0.75rem",
      }}>
        Stillness group notifications
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
        {prefs.map(p => (
          <div key={p.group_id}>
            <div style={{ fontSize: "0.85rem", marginBottom: "0.35rem" }}>
              {p.group_name}
            </div>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <Toggle
                label="email"
                enabled={p.email_enabled}
                saving={saving[p.group_id]}
                onToggle={() => update(p.group_id, { email_enabled: !p.email_enabled })}
              />
              <Toggle
                label="sms"
                enabled={p.sms_enabled}
                saving={saving[p.group_id]}
                onToggle={() => update(p.group_id, { sms_enabled: !p.sms_enabled })}
              />
            </div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: "0.7rem", opacity: 0.35, marginTop: "0.75rem", lineHeight: 1.5 }}>
        SMS requires a phone number saved above. You can also unsubscribe from emails
        via the link in any notification email.
      </div>
    </div>
  );
}