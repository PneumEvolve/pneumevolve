import React from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export default function InsightDisplay({
  entry,
  visibleInsights,
  toggleInsightVisibility,
  onDeleteInsight,
  openDeleteModal,
}) {
  const types = ["reflection", "mantra", "next_action"];

  return (
    <>
      {types.map((type) => {
        const content = entry[type];
        if (typeof content !== "string" || !content.trim()) return null;

        const isVisible = visibleInsights[entry.id]?.[type];

        return (
          <div key={type} className="mt-3">
            {isVisible ? (
              <>
                <div className="p-3 border-l-4 border-indigo-500 bg-indigo-100 dark:bg-indigo-900 text-indigo-900 dark:text-indigo-100 rounded relative">
                  <strong>{type.replace("_", " ").toUpperCase()}:</strong> {content}
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => openDeleteModal(entry.id, type)}
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
                    onClick={() => toggleInsightVisibility(entry.id, type)}
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
                  onClick={() => toggleInsightVisibility(entry.id, type)}
                >
                  Show {type.replace("_", " ")}
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}