// src/components/journal/EntryItem.jsx
import React from "react";
import { Trash, Eye, EyeOff } from "lucide-react";
 
export default function EntryItem({
  entry,
  expanded,
  onExpandToggle,
  onDeleteClick,
  onEditClick,
}) {
  return (
    <div className="card">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-xl font-bold break-words">{entry.title}</h3>
          <p className="text-sm opacity-70 mt-1">
            {entry.created_at ? new Date(entry.created_at).toLocaleString() : ""}
          </p>
        </div>
 
        <div className="flex items-center gap-2 shrink-0">
          <button
            className="btn btn-secondary"
            onClick={() => onExpandToggle(entry.id)}
            title={expanded ? "Hide content" : "Show content"}
          >
            <span className="inline-flex items-center gap-2">
              {expanded ? <EyeOff size={16} /> : <Eye size={16} />}
              {expanded ? "Hide" : "Show"}
            </span>
          </button>
 
          <button
            className="btn btn-danger"
            onClick={() => onDeleteClick(entry.id)}
            title="Delete entry"
          >
            <span className="inline-flex items-center gap-2">
              <Trash size={16} /> Delete
            </span>
          </button>
        </div>
      </div>
 
      {/* Content */}
      {expanded && (
        <div className="mt-3 whitespace-pre-wrap">{entry.content}</div>
      )}
 
      {/* Edit button */}
      <div className="mt-3">
        <button className="btn btn-secondary" onClick={() => onEditClick(entry)}>
          Edit
        </button>
      </div>
    </div>
  );
}