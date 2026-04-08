// src/components/PhoneNumberField.jsx
import { useState, useEffect } from "react";
import { api } from "@/lib/api";

function normalizePhone(raw) {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  // Already has a + prefix — trust it
  if (trimmed.startsWith("+")) return trimmed;
  // Strip leading 1 if they typed it without the +
  const digits = trimmed.replace(/\D/g, "");
  if (digits.startsWith("1") && digits.length === 11) return `+${digits}`;
  // Plain 10-digit North American number
  if (digits.length === 10) return `+1${digits}`;
  // Unknown format — return as-is and let the server reject it
  return trimmed;
}

function isValidPhone(normalized) {
  // Must start with + and have 7–15 digits after
  return /^\+\d{7,15}$/.test(normalized.replace(/[\s\-().]/g, ""));
}

export default function PhoneNumberField() {
  const [phone, setPhone] = useState("");
  const [saved, setSaved] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null); // "saved" | "removed" | "error" | "invalid"
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/auth/account/phone")
      .then(res => {
        const num = res.data.phone_number || "";
        setPhone(num);
        setSaved(num);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    const normalized = normalizePhone(phone);

    if (normalized && !isValidPhone(normalized)) {
      setStatus("invalid");
      return;
    }

    setSaving(true);
    setStatus(null);
    try {
      const res = await api.put("/auth/account/phone", { phone_number: normalized || null });
      const num = res.data.phone_number || "";
      setPhone(num);
      setSaved(num);
      setStatus(num ? "saved" : "removed");
      setTimeout(() => setStatus(null), 3000);
    } catch {
      setStatus("error");
    } finally {
      setSaving(false);
    }
  }

  function handleRemove() {
    setPhone("");
    // Don't auto-save on clear — user still needs to hit save
  }

  if (loading) return null;

  const normalized = normalizePhone(phone);
  const isDirty = normalized !== saved;

  return (
    <div style={{ marginTop: "1.5rem" }}>
      <div style={{
        fontSize: "0.75rem",
        fontWeight: 500,
        opacity: 0.5,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        marginBottom: "0.5rem",
      }}>
        Phone number for SMS notifications
      </div>

      <form onSubmit={handleSave} style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
        <input
          type="tel"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          placeholder="+1 555 000 0000"
          style={{
            background: "var(--bg)",
            border: "1px solid var(--border)",
            borderRadius: "0.6rem",
            padding: "0.55rem 0.9rem",
            fontSize: "0.85rem",
            color: "var(--text)",
            outline: "none",
            width: "200px",
          }}
        />
        <button
          type="submit"
          disabled={saving || !isDirty}
          style={{
            background: "none",
            border: "1px solid var(--border)",
            borderRadius: "999px",
            padding: "0.4rem 1rem",
            fontSize: "0.75rem",
            color: "var(--text)",
            cursor: saving || !isDirty ? "default" : "pointer",
            opacity: saving || !isDirty ? 0.4 : 1,
            transition: "opacity 0.2s",
          }}
        >
          {saving ? "saving…" : "save"}
        </button>
        {saved && (
          <button
            type="button"
            onClick={handleRemove}
            style={{
              background: "none",
              border: "none",
              fontSize: "0.72rem",
              opacity: 0.35,
              cursor: "pointer",
              color: "var(--text)",
              padding: "0.4rem 0",
            }}
          >
            remove
          </button>
        )}
      </form>

      <div style={{ fontSize: "0.7rem", opacity: 0.35, marginTop: "0.4rem", lineHeight: 1.5 }}>
        {saved
          ? `You'll receive a text before each stillness moment. No need to add +1 — we'll handle it for Canada/US numbers.`
          : `Optional. Add your number to receive a text before each stillness moment. No need to add +1 for Canada/US.`
        }
      </div>

      {status === "saved" && (
        <div style={{ fontSize: "0.72rem", color: "var(--text)", opacity: 0.6, marginTop: "0.4rem" }}>
          ✓ Saved — you'll get texts before each moment.
        </div>
      )}
      {status === "removed" && (
        <div style={{ fontSize: "0.72rem", opacity: 0.4, marginTop: "0.4rem" }}>
          Phone number removed.
        </div>
      )}
      {status === "invalid" && (
        <div style={{ fontSize: "0.72rem", color: "salmon", marginTop: "0.4rem" }}>
          That doesn't look like a valid phone number. Try: 5550001234 or +44 7700 900000
        </div>
      )}
      {status === "error" && (
        <div style={{ fontSize: "0.72rem", color: "salmon", marginTop: "0.4rem" }}>
          Something went wrong. Check the number format and try again.
        </div>
      )}
    </div>
  );
}