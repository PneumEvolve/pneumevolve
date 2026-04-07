// src/components/PhoneNumberField.jsx
//
// Drop this anywhere in your Account page.
// Lets the user add/update/remove their phone number for SMS notifications.
//
// Usage:
//   import PhoneNumberField from "@/components/PhoneNumberField";
//   <PhoneNumberField />
 
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
 
export default function PhoneNumberField() {
  const [phone, setPhone] = useState("");
  const [saved, setSaved] = useState("");   // what's currently saved
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null); // "saved" | "removed" | "error"
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
    setSaving(true);
    setStatus(null);
    try {
      const res = await api.put("/auth/account/phone", { phone_number: phone.trim() || null });
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
 
  if (loading) return null;
 
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
          disabled={saving || phone === saved}
          style={{
            background: "none",
            border: "1px solid var(--border)",
            borderRadius: "999px",
            padding: "0.4rem 1rem",
            fontSize: "0.75rem",
            color: "var(--text)",
            cursor: saving || phone === saved ? "default" : "pointer",
            opacity: saving || phone === saved ? 0.4 : 1,
            transition: "opacity 0.2s",
          }}
        >
          {saving ? "saving…" : "save"}
        </button>
        {saved && (
          <button
            type="button"
            onClick={() => { setPhone(""); }}
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
          ? `You'll receive a text before each stillness moment. Include country code e.g. +1 for Canada/US.`
          : `Optional. Add your number to receive a text before each stillness moment.`
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
      {status === "error" && (
        <div style={{ fontSize: "0.72rem", color: "salmon", marginTop: "0.4rem" }}>
          Something went wrong. Check the number format and try again.
        </div>
      )}
    </div>
  );
}
 