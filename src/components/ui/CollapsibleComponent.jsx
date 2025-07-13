import React, { useState } from "react";

export default function CollapsibleComponent({ title, children }) {
  const [collapsed, setCollapsed] = useState(true);

  return (
    <div className="border rounded mb-4 bg-white shadow">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full text-left px-4 py-2 bg-gray-100 hover:bg-gray-200 font-bold text-lg flex justify-between items-center"
      > 
        <span>{title}</span>
        <span>{collapsed ? "➕" : "➖"}</span>
      </button>
      {!collapsed && <div className="p-4">{children}</div>}
    </div>
  );
}