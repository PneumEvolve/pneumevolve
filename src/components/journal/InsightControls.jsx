import React from "react";
import { Button } from "@/components/ui/button";
import { Wand2 } from "lucide-react";

export default function InsightControls({
  entryId,
  selectedAction,
  onActionChange,
  onGenerateInsight,
}) {
  return (
    <div className="flex items-center gap-2 mt-2">
      <select
        className="p-2 border rounded"
        value={selectedAction || ""}
        onChange={(e) => onActionChange(entryId, e.target.value)}
      >
        <option value="">Choose an Insight</option>
        <option value="reflect">Reflect</option>
        <option value="mantra">Mantra Maker</option>
        <option value="next_action">What should I do next?</option>
      </select>
      <Button
        className="bg-green-600 hover:bg-green-700 text-white"
        onClick={() => {
          if (selectedAction) onGenerateInsight(entryId, selectedAction);
        }}
      >
        <Wand2 className="mr-2" /> Go
      </Button>
    </div>
  );
}