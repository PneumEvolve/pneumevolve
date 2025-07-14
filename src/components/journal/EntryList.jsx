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
            visibleInsights={visibleInsights[entry.id] || {}} // ✅ fallback
            selectedAction={selectedActions[entry.id] || ""}  // ✅ fallback
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