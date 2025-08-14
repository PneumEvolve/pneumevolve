import React from "react";
import { Trash, Eye, EyeOff, Wand2, X } from "lucide-react";

export default function EntryItem({
  entry,
  expanded,
  visibleInsights = {},
  selectedAction,
  busy,
  onExpandToggle,
  onDeleteClick,
  onEditClick,
  onActionChange,
  onGenerateInsight,
  onToggleInsight,
  onDeleteInsight,
}) {
  return (
    <div className="card">
      {/* Header row */}
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

      {/* Actions */}
      <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2">
        <button className="btn btn-secondary" onClick={() => onEditClick(entry)}>
          Edit
        </button>

        <div className="flex-1" />

        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <select
            className="w-full sm:w-64"
            value={selectedAction || ""}
            onChange={(e) => onActionChange(entry.id, e.target.value)}
          >
            <option value="">Choose an Insight</option>
            <option value="reflection">Reflect</option>
            <option value="mantra">Mantra Maker</option>
            <option value="next_action">What should I do next?</option>
          </select>

          <button
            className="btn"
            disabled={!selectedAction || busy}
            onClick={() => onGenerateInsight(entry, selectedAction)}
            title={!selectedAction ? "Pick an insight first" : "Generate"}
          >
            <span className="inline-flex items-center gap-2">
              <Wand2 size={16} />
              {busy ? "Working…" : "Go"}
            </span>
          </button>
        </div>
      </div>

      {/* Insights */}
      {["reflection", "mantra", "next_action"].map((type) =>
        typeof entry[type] === "string" && entry[type].trim() !== "" ? (
          <div key={type} className="mt-3">
            {visibleInsights?.[type] ? (
              <>
                <div
                  className="p-3 rounded border relative"
                  style={{
                    borderColor: "var(--border)",
                    background:
                      "color-mix(in oklab, var(--bg-elev) 92%, transparent)",
                  }}
                >
                  <div className="text-xs opacity-70 mb-1">
                    {type.replace("_", " ").toUpperCase()}
                  </div>
                  <div className="whitespace-pre-wrap">{entry[type]}</div>

                  <button
                    className="btn btn-secondary"
                    onClick={() => onDeleteInsight(entry.id, type)}
                    title={`Delete ${type}`}
                    style={{
                      position: "absolute",
                      top: "-10px",
                      right: "-10px",
                      padding: ".35rem .5rem",
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="text-right mt-1">
                  <button
                    className="btn btn-secondary"
                    onClick={() => onToggleInsight(entry.id, type)}
                  >
                    Hide {type.replace("_", " ")}
                  </button>
                </div>
              </>
            ) : (
              <div className="text-right">
                <button
                  className="btn btn-secondary"
                  onClick={() => onToggleInsight(entry.id, type)}
                >
                  Show {type.replace("_", " ")}
                </button>
              </div>
            )}
          </div>
        ) : null
      )}
    </div>
  );
}