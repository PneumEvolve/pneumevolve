import React from "react";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";

export default function EntryForm({ newEntry, setNewEntry, handleCreate }) {
  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-6">
      <input
        type="text"
        placeholder="Title"
        className="w-full p-2 mb-2 border rounded"
        value={newEntry.title}
        onChange={(e) => setNewEntry({ ...newEntry, title: e.target.value })}
      />
      <textarea
        rows={6}
        placeholder="Write your truth..."
        className="w-full p-2 border rounded"
        value={newEntry.content}
        onChange={(e) => setNewEntry({ ...newEntry, content: e.target.value })}
      />
      <div className="flex justify-between items-center mt-2">
        <span className="text-sm text-gray-500">
          {newEntry.content.length} characters
        </span>
        <Button variant="green" onClick={handleCreate}>
          <Save className="mr-2" /> Save Entry
        </Button>
      </div>
    </div>
  );
}