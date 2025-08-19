// src/Pages/LivingPlan.jsx
import React, { useState, useEffect, useId } from "react";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Trash,
  StickyNote,
  ListTodo,
  Save,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import ReactMarkdown from "react-markdown";

/* ---------- Editable Section ---------- */
const EditableSection = ({ section, onUpdate, onDelete, index, editable }) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(section.title ?? "");
  const [description, setDescription] = useState(section.description ?? "");
  const [tasks, setTasks] = useState(section.tasks || []);
  const [newTask, setNewTask] = useState("");
  const navigate = useNavigate();
  const panelId = useId();

  // Push edits up
  useEffect(() => {
    onUpdate(index, { ...section, title, description, tasks });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, tasks]);

  const addTask = () => {
    const v = newTask.trim();
    if (!v) return;
    setTasks((t) => [...t, v]);
    setNewTask("");
  };

  const deleteTask = (taskIndex) => {
    setTasks((t) => t.filter((_, i) => i !== taskIndex));
  };

  return (
    <div className="card p-3 sm:p-4">
      {/* Section header / toggle */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        className="section-bar w-full flex items-center justify-between gap-3 bg-transparent"
      >
        <div className="flex items-center gap-2 min-w-0">
          {open ? (
            <ChevronDown className="shrink-0" />
          ) : (
            <ChevronRight className="shrink-0" />
          )}
          {editable ? (
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Section Title"
              className="w-full bg-transparent border-b border-transparent focus:border-[var(--ring)] focus:outline-none text-base sm:text-lg font-semibold"
            />
          ) : (
            <span className="text-base sm:text-lg font-semibold truncate">
              {title || "Untitled Section"}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn btn-secondary !py-1.5"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/notes/${index}`);
            }}
            title="Open Notes"
          >
            <StickyNote className="w-4 h-4 mr-1.5" />
            Notes
          </button>

          {editable && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(index);
              }}
              className="btn btn-danger !py-1.5"
              title="Delete Section"
            >
              <Trash className="w-4 h-4 mr-1.5" />
              Delete
            </button>
          )}
        </div>
      </button>

      {/* Collapsible content */}
      {open && (
        <div id={panelId} className="mt-4 space-y-6">
          {/* Description (Markdown) */}
          <div className="prose dark:prose-invert max-w-none text-[0.95rem] leading-relaxed">
            <ReactMarkdown
              components={{
                h1: ({ node, ...props }) => (
                  <h1 className="text-2xl font-bold mb-2" {...props} />
                ),
                h2: ({ node, ...props }) => (
                  <h2 className="text-xl font-semibold mb-2" {...props} />
                ),
                p: ({ node, ...props }) => <p className="mb-3" {...props} />,
                ul: ({ node, ...props }) => (
                  <ul className="list-disc ml-6 mb-3" {...props} />
                ),
                ol: ({ node, ...props }) => (
                  <ol className="list-decimal ml-6 mb-3" {...props} />
                ),
                li: ({ node, ...props }) => <li className="mb-1.5" {...props} />,
                a: ({ node, ...props }) => (
                  <a
                    {...props}
                    className="link-default underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                ),
                code: ({ node, ...props }) => (
                  <code
                    className="bg-gray-100 dark:bg-[#111827] px-1 py-0.5 rounded text-sm"
                    {...props}
                  />
                ),
                pre: ({ node, ...props }) => (
                  <pre
                    className="bg-gray-100 dark:bg-[#111827] p-3 rounded overflow-x-auto text-sm"
                    {...props}
                  />
                ),
              }}
            >
              {description || "_No plan written yet._"}
            </ReactMarkdown>
          </div>

          {/* Tasks */}
          <div>
            <h3 className="text-lg font-medium mb-2 flex items-center gap-2">
              <ListTodo className="w-5 h-5" />
              Tasks
            </h3>

            {editable && (
              <div className="flex flex-col sm:flex-row items-stretch gap-2 mb-3">
                <input
                  type="text"
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  placeholder="New task…"
                  className="flex-grow"
                />
                <button
                  onClick={addTask}
                  className="btn"
                >
                  Add
                </button>
              </div>
            )}

            {tasks.length === 0 ? (
              <p className="text-sm text-[color:var(--muted)]">
                No tasks yet.
                {editable ? " Add your first task above." : ""}
              </p>
            ) : (
              <ul className="space-y-1.5">
                {tasks.map((task, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between gap-3 border border-[var(--border)] rounded-lg px-3 py-2"
                  >
                    <span className="flex-grow">{task}</span>
                    {editable && (
                      <button
                        onClick={() => deleteTask(i)}
                        className="btn btn-secondary !py-1.5"
                      >
                        Remove
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/* ---------- Page ---------- */
export default function LivingPlan() {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const { userEmail, accessToken } = useAuth();
  const isEditable = userEmail === "sheaklipper@gmail.com";

  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await api.get(`/living-plan`, {
          signal: ctrl.signal,
          validateStatus: () => true,
        });
        if (res.status !== 200) {
          throw new Error(`Failed to load living plan (status ${res.status})`);
        }
        const data = Array.isArray(res.data) ? res.data : [];
        // Backfill missing IDs
        const withIds = data.map((section) =>
          section.id ? section : { ...section, id: crypto.randomUUID() }
        );
        setSections(withIds);
      } catch (err) {
        console.error("Error fetching living plan:", err);
      } finally {
        setLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, []);

  const saveToBackend = async () => {
    try {
      setSaving(true);
      setSaveMsg("");
      const headers = accessToken
        ? { Authorization: `Bearer ${accessToken}` }
        : undefined;
      const res = await api.post(`/living-plan`, sections, {
        headers,
        validateStatus: () => true,
      });
      if (res.status !== 200) {
        throw new Error(`Save failed (status ${res.status})`);
      }
      setSaveMsg("Saved successfully!");
      setTimeout(() => setSaveMsg(""), 2500);
    } catch (err) {
      console.error(err);
      setSaveMsg("Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const addSection = () => {
    setSections((s) => [
      ...s,
      {
        id: crypto.randomUUID(),
        title: "",
        description: "",
        tasks: [],
        notes: "",
      },
    ]);
  };

  const updateSection = (index, updated) => {
    setSections((s) => {
      const next = [...s];
      next[index] = updated;
      return next;
    });
  };

  const deleteSection = async (indexToDelete) => {
    if (!window.confirm("Delete this section?")) return;
    try {
      const updated = sections.filter((_, i) => i !== indexToDelete);
      setSections(updated);

      const headers = accessToken
        ? { Authorization: `Bearer ${accessToken}` }
        : undefined;
      const res = await api.post(`/living-plan`, updated, {
        headers,
        validateStatus: () => true,
      });
      if (res.status !== 200) {
        throw new Error(`Delete sync failed (status ${res.status})`);
      }
      setSaveMsg("Section deleted.");
      setTimeout(() => setSaveMsg(""), 2000);
    } catch (err) {
      console.error(err);
      setSaveMsg("Failed to delete section.");
    }
  };

  if (loading) {
    return (
      <div className="main py-10 space-y-4">
        <div className="section-bar flex items-center justify-between">
          <h1 className="text-2xl font-bold">🌱 The Living Plan</h1>
          <div className="h-9 w-28 rounded bg-[color:var(--bg)] border border-[color:var(--border)] animate-pulse" />
        </div>
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card h-28 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="main py-10 space-y-6">
      {/* Sticky toolbar */}
      <div className="section-bar sticky top-3 z-10 flex items-center justify-between">
        <h1 className="text-2xl font-bold">🌱 The Living Plan</h1>
        <div className="flex items-center gap-2">
          {isEditable && (
            <>
              <button
                onClick={addSection}
                className="btn btn-secondary"
                type="button"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Add Section
              </button>
              <button
                onClick={saveToBackend}
                className="btn"
                type="button"
                disabled={saving}
                aria-busy={saving}
              >
                <Save className="w-4 h-4 mr-1.5" />
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </>
          )}
        </div>
      </div>

      {saveMsg && (
        <div className="card border border-[color:var(--border)] text-sm">
          {saveMsg}
        </div>
      )}

      {sections.length === 0 ? (
        <div className="card text-center py-10">
          <p className="text-[color:var(--muted)]">
            No sections yet.
            {isEditable ? " Click “Add Section” to start your plan." : ""}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {sections.map((section, index) => (
            <EditableSection
              key={section.id}
              index={index}
              section={section}
              onUpdate={updateSection}
              onDelete={deleteSection}
              editable={isEditable}
            />
          ))}
        </div>
      )}
    </div>
  );
}