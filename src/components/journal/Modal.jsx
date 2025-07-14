import React from "react";
import { Button } from "@/components/ui/button";

export default function Modal({
  modal,
  setModal,
  editedTitle,
  setEditedTitle,
  editedContent,
  setEditedContent,
  handleEditSave,
  confirmDeleteEntry,
  deleteInsightFromState,
}) {
  const isEdit = modal.type === "edit";
  const isEntryDelete = modal.type === "entry";

  const handleClose = () => {
    setModal({ open: false, entryId: null, type: null });
  };

  const handleConfirm = async () => {
    if (isEdit) {
      await handleEditSave(modal.entryId);
    } else if (isEntryDelete) {
      await confirmDeleteEntry(modal.entryId);
    } else {
      await deleteInsightFromState(modal.entryId, modal.type);
    }
    handleClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      {isEdit ? (
        <div className="bg-white dark:bg-gray-800 w-full max-w-3xl p-6 rounded-lg shadow-lg overflow-y-auto max-h-[90vh]">
          <h2 className="text-2xl font-bold mb-4">Edit Journal Entry</h2>
          <input
            className="w-full mb-3 p-2 border rounded"
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
          />
          <textarea
            className="w-full h-64 mb-4 p-2 border rounded"
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
          />
          <div className="flex justify-between">
            <Button onClick={handleConfirm}>Save Changes</Button>
            <Button variant="ghost" onClick={handleClose}>Cancel</Button>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-sm text-center">
          <p className="mb-4 text-lg">
            Are you sure you want to delete this{" "}
            {isEntryDelete ? "journal entry" : modal.type.replace("_", " ")}?
          </p>
          <div className="flex justify-center gap-4">
            <Button onClick={handleConfirm}>Yes, Delete</Button>
            <Button variant="ghost" onClick={handleClose}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}