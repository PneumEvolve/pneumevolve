import React from "react";
import EntryItem from "./EntryItem";

export default function EntryList({
  entries = [],
  expandedEntries = {},        // ✅ safeguard
  visibleInsights = {},        // ✅ safeguard
  selectedActions = {},        // ✅ safeguard
  onExpandToggle,
  onDeleteClick,
  onEditClick,
  onActionChange,
  onGenerateInsight,
  onToggleInsight,
  onDeleteInsight,
  insightBusy,
}) {
  if (!entries.length) {
    return (
      <p className="text-gray-400 italic text-center">
        You haven’t journaled yet... what’s on your mind?
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {entries.map((entry) => {
        if (!entry || entry.id === undefined || entry.id === null) {
          console.warn("Skipping invalid entry:", entry);
          return null;
        }

        // ⬇️ derive current type + busy flag for this entry
        const type = selectedActions[entry.id] || "";
        const busy = !!(type && insightBusy?.[`${entry.id}:${type}`]);

        return (
          <EntryItem
            key={
              entry.id +
              (entry.reflection || "") +
              (entry.mantra || "") +
              (entry.next_action || "")
            }
            entry={entry}
            expanded={expandedEntries[entry.id]}
            visibleInsights={visibleInsights[entry.id] || {}}
            selectedAction={type}         
            busy={busy}                    
            onExpandToggle={onExpandToggle}
            onDeleteClick={onDeleteClick}
            onEditClick={onEditClick}
            onActionChange={onActionChange}
            onGenerateInsight={onGenerateInsight}
            onToggleInsight={onToggleInsight}
            onDeleteInsight={onDeleteInsight}
          />
        );
      })}
    </div>
  );
}