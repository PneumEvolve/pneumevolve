// src/components/communities/ComponentManager.jsx
import React, { useState } from "react";
import { api } from "@/lib/api";
import { ArrowUp, ArrowDown } from "lucide-react";
 
const defaultOrder = [
  "goals",
  "chat",
  "resources",
  "events",
  "members",
  "admin",
  "component_manager",
];
 
const labels = {
  goals: "Community Goals",
  chat: "Community Chat",
  resources: "Resource Board",
  events: "Upcoming Events",
  members: "Member List",
  admin: "Admin Panel",
  component_manager: "Component Manager",
};
 
export default function ComponentManager({ communityId, currentOrder, onSave }) {
  const [order, setOrder] = useState(currentOrder || defaultOrder);
  const [saving, setSaving] = useState(false);
 
  const move = (index, direction) => {
    const next = [...order];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setOrder(next);
  };
 
  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/communities/${communityId}/layout`, { layout_config: order });
      onSave(order);
    } catch (err) {
      console.error("Failed to save component order:", err);
    } finally {
      setSaving(false);
    }
  };
 
  return (
    <div className="space-y-3 pt-2">
      <p className="text-sm opacity-60">Drag to reorder — use arrows to move components up or down.</p>
      <ul className="space-y-2">
        {order.map((key, idx) => (
          <li
            key={key}
            className="card flex items-center justify-between gap-3"
          >
            <span className="text-sm font-medium">{labels[key] || key}</span>
            <div className="flex gap-1 shrink-0">
              <button
                onClick={() => move(idx, -1)}
                disabled={idx === 0}
                className="btn btn-secondary !px-2 !py-1 disabled:opacity-30"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => move(idx, 1)}
                disabled={idx === order.length - 1}
                className="btn btn-secondary !px-2 !py-1 disabled:opacity-30"
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
            </div>
          </li>
        ))}
      </ul>
      <button onClick={handleSave} disabled={saving} className="btn">
        {saving ? "Saving…" : "Save order"}
      </button>
    </div>
  );
}