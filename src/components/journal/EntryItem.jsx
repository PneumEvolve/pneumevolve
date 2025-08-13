import React from "react";
import { Button } from "@/components/ui/button";
import { Trash, Eye, EyeOff, Wand2, X } from "lucide-react";

export default function EntryItem({
  entry,
  expanded,
  visibleInsights = {},      // ✅ safe default
  selectedAction,            // e.g. "reflection" | "mantra" | "next_action" (or legacy "reflect")
  busy,                      // ✅ from EntryList: insightBusy[`${entry.id}:${type}`]
  onExpandToggle,
  onDeleteClick,
  onEditClick,
  onActionChange,
  onGenerateInsight,         // expects (entry, normalizedType)
  onToggleInsight,
  onDeleteInsight,
}) {
  // normalize legacy "reflect" → "reflection"
  const normalizeType = (t) => (t === "reflect" ? "reflection" : t || "");
  const normalizedType = normalizeType(selectedAction);
  const canGenerate = !!normalizedType && !busy;

  return (
    <div
      key={entry.id + (entry.reflection || "") + (entry.mantra || "") + (entry.next_action || "")}
      className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow relative group"
    >
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-xl font-bold">{entry.title}</h3>
        <div className="flex gap-2">
          <Button variant="blue" size="icon" onClick={() => onExpandToggle(entry.id)}>
            {expanded ? <EyeOff size={16} /> : <Eye size={16} />}
          </Button>
          <Button
            size="icon"
            className="bg-red-600 hover:bg-red-700 text-white"
            onClick={() => onDeleteClick(entry.id)}
            variant="destructive"
          >
            <Trash size={16} />
          </Button>
        </div>
      </div>

      <p className="text-sm text-gray-500 mb-2">
        {new Date(entry.created_at).toLocaleString()}
      </p>

      {expanded && <p className="mb-2">{entry.content}</p>}

      <div className="flex gap-2 mt-2">
        <Button size="sm" variant="yellow" onClick={() => onEditClick(entry)}>
          Edit
        </Button>
      </div>

      {/* ---- Insight selector + generate ---- */}
      <div className="flex items-center gap-2 mt-2">
        <select
          className="p-2 border rounded"
          value={selectedAction || ""}                         // keep current selection
          onChange={(e) => onActionChange(entry.id, e.target.value)}
        >
          <option value="">Choose an Insight</option>
          {/* use canonical values; "reflect" still works via normalizeType */}
          <option value="reflection">Reflect</option>
          <option value="mantra">Mantra Maker</option>
          <option value="next_action">What should I do next?</option>
        </select>

        <Button
          className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-60"
          onClick={() => onGenerateInsight(entry, normalizedType)}
          disabled={!normalizedType || busy}                   // ⬅️ gate by selection + busy
          title={
            !normalizedType ? "Pick an insight type first"
              : busy ? "Working…"
              : "Generate"
          }
        >
          <Wand2 className={`mr-2 ${busy ? "animate-spin" : ""}`} />
          {busy ? "Working…" : "Go"}
        </Button>
      </div>

      {/* ---- Existing insights show/hide ---- */}
      {["reflection", "mantra", "next_action"].map((type) =>
        typeof entry[type] === "string" && entry[type].trim() !== "" ? (
          <div key={type} className="mt-3">
            {visibleInsights?.[type] ? (
              <>
                <div className="p-3 border-l-4 border-indigo-500 bg-indigo-100 dark:bg-indigo-900 text-indigo-900 dark:text-indigo-100 rounded relative">
                  <strong>{type.replace("_", " ").toUpperCase()}:</strong> {entry[type]}
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => onDeleteInsight(entry.id, type)}
                    className="absolute -top-3 -right-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-full shadow"
                    title={`Delete ${type}`}
                  >
                    <X size={12} />
                  </Button>
                </div>
                <div className="text-right mt-1">
                  <Button
                    variant="blue"
                    size="sm"
                    onClick={() => onToggleInsight(entry.id, type)}
                  >
                    Hide {type.replace("_", " ")}
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-right">
                <Button
                  variant="blue"
                  size="sm"
                  onClick={() => onToggleInsight(entry.id, type)}
                >
                  Show {type.replace("_", " ")}
                </Button>
              </div>
            )}
          </div>
        ) : null
      )}
    </div>
  );
}