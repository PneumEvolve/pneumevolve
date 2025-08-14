import React from "react";
import EntryItem from "./EntryItem";

export default function EntryList({
  entries = [],
  expandedEntries = {},
  visibleInsights = {},
  selectedActions = {},
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
      <p className="text-center opacity-70">
        You haven’t journaled yet… what’s on your mind?
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
            expanded={!!expandedEntries[entry.id]}
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