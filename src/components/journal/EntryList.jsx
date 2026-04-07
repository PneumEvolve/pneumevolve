// src/components/journal/EntryList.jsx
import React from "react";
import EntryItem from "./EntryItem";
 
export default function EntryList({
  entries = [],
  expandedEntries = {},
  onExpandToggle,
  onDeleteClick,
  onEditClick,
}) {
  if (!entries.length) {
    return (
      <p className="text-center opacity-70">
        You haven't journaled yet… what's on your mind?
      </p>
    );
  }
 
  return (
    <div className="space-y-4">
      {entries.map((entry) => {
        if (!entry || entry.id === undefined || entry.id === null) return null;
        return (
          <EntryItem
            key={entry.id}
            entry={entry}
            expanded={!!expandedEntries[entry.id]}
            onExpandToggle={onExpandToggle}
            onDeleteClick={onDeleteClick}
            onEditClick={onEditClick}
          />
        );
      })}
    </div>
  );
}