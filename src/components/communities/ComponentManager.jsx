// src/components/community/ComponentOrderManager.jsx
import React, { useState } from "react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";

const API = import.meta.env.VITE_API_URL;

const defaultOrder = [
  "goals",
  "chat",
  "resources",
  "events",
  "members",
  "admin",
  "component_manager"
];

const labels = {
  goals: "Community Goals",
  chat: "Community Chat",
  resources: "Resource Board",
  events: "Upcoming Events",
  members: "Member List",
  admin: "Admin Panel",
  component_manager: "Component Manager"
};

export default function ComponentManager({ communityId, currentOrder, onSave }) {
  const [order, setOrder] = useState(currentOrder || defaultOrder);
  const { accessToken } = useAuth();
console.log("ComponentManager rendering with order:", order);
  const move = (index, direction) => {
    const newOrder = [...order];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;
    [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
    setOrder(newOrder);
  };

  const handleSave = async () => {
    try {
      await axios.put(`${API}/communities/${communityId}/layout`, {
  layout_config: order, // not component_order
}, {
  headers: { Authorization: `Bearer ${accessToken}` }
});
      onSave(order); // notify parent
    } catch (err) {
      console.error("Failed to save component order:", err);
    }
  };

  return (
    <div className="p-4 border rounded mb-6 bg-white">
      <h2 className="text-lg font-bold mb-2">Reorder Components</h2>
      <ul className="space-y-2">
        {order.map((key, idx) => (
          <li key={key} className="flex items-center justify-between border px-3 py-2 rounded">
            <span>{labels[key] || key}</span>
            <div>
              <button onClick={() => move(idx, -1)} className="px-2">⬆️</button>
              <button onClick={() => move(idx, 1)} className="px-2">⬇️</button>
            </div>
          </li>
        ))}
      </ul>
      <button
        onClick={handleSave}
        className="mt-3 bg-green-600 text-white px-4 py-2 rounded"
      >
        Save Order
      </button>
    </div>
  );
}