// src/components/ui/CollapsibleComponent.jsx
import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
 
export default function CollapsibleComponent({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
 
  return (
    <div className="card space-y-0 overflow-hidden p-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:opacity-80 transition"
      >
        <span className="font-semibold">{title}</span>
        {open
          ? <ChevronUp className="h-4 w-4 opacity-40 shrink-0" />
          : <ChevronDown className="h-4 w-4 opacity-40 shrink-0" />
        }
      </button>
      {open && (
        <div
          className="px-5 pb-5"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          {children}
        </div>
      )}
    </div>
  );
}