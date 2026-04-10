// src/Pages/ProjectDetail.jsx
import React, { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Plus, Trash2, Check, X, Pencil, Save, ExternalLink } from "lucide-react";
 
export default function ProjectDetail() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
 
  const [project, setProject] = useState(null);
  const [newTask, setNewTask] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [editedProject, setEditedProject] = useState({ name: "", description: "", links: [] });
  const [newLink, setNewLink] = useState("");
 
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setEditMode(params.get("edit") === "true");
 
    api
      .get(`/projects/${id}`)
      .then((res) => {
        const data = res.data;
        setProject(data);
        setEditedProject({
          name: data.name,
          description: data.description || "",
          links: data.links || [],
        });
      })
      .catch((err) => console.error("Error loading project:", err));
  }, [id, location.search]);
 
  const handleAddTask = async () => {
    if (!newTask.trim()) return;
    try {
      const res = await api.post(`/projects/${id}/tasks`, { content: newTask.trim() });
      setProject((prev) => ({ ...prev, tasks: [...(prev.tasks || []), res.data] }));
      setNewTask("");
    } catch (err) {
      console.error("Error adding task:", err);
    }
  };
 
  const toggleTask = async (taskId, completed) => {
    const task = project.tasks.find((t) => t.id === taskId);
    if (!task) return;
    try {
      await api.put(`/projects/tasks/${taskId}`, { content: task.content, completed: !completed });
      setProject((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) => (t.id === taskId ? { ...t, completed: !completed } : t)),
      }));
    } catch (err) {
      console.error("Error toggling task:", err);
    }
  };
 
  const deleteTask = async (taskId) => {
    try {
      await api.delete(`/projects/tasks/${taskId}`);
      setProject((prev) => ({ ...prev, tasks: prev.tasks.filter((t) => t.id !== taskId) }));
    } catch (err) {
      console.error("Error deleting task:", err);
    }
  };
 
  const handleSave = async () => {
    try {
      const res = await api.put(`/projects/${id}`, editedProject);
      setProject(res.data);
      setEditMode(false);
      navigate(`/projects/${id}`, { replace: true });
    } catch (err) {
      console.error("Error saving project:", err);
    }
  };
 
  const addLink = () => {
    const trimmed = newLink.trim();
    if (!trimmed) return;
    setEditedProject((prev) => ({ ...prev, links: [...prev.links, trimmed] }));
    setNewLink("");
  };
 
  const removeLink = (index) => {
    setEditedProject((prev) => ({
      ...prev,
      links: prev.links.filter((_, i) => i !== index),
    }));
  };
 
  if (!project) {
    return (
      <main className="main p-6">
        <div className="card text-center opacity-60 text-sm">Loading project…</div>
      </main>
    );
  }
 
  const pending = (project.tasks || []).filter((t) => !t.completed);
  const done = (project.tasks || []).filter((t) => t.completed);
 
  return (
    <main className="main p-6 space-y-6">
      {/* Top nav */}
      <nav className="flex items-center gap-3 flex-wrap text-sm">
        <button onClick={() => navigate("/projects")} className="btn btn-secondary">
          ← Projects
        </button>
        {!editMode ? (
          <button onClick={() => setEditMode(true)} className="btn btn-secondary ml-auto">
            <Pencil className="h-4 w-4 mr-1 inline" /> Edit project
          </button>
        ) : (
          <div className="flex gap-2 ml-auto">
            <button onClick={handleSave} className="btn">
              <Save className="h-4 w-4 mr-1 inline" /> Save
            </button>
            <button
              onClick={() => {
                setEditMode(false);
                navigate(`/projects/${id}`, { replace: true });
              }}
              className="btn btn-secondary"
            >
              Cancel
            </button>
          </div>
        )}
      </nav>
 
      {/* Project header */}
      <section className="card space-y-3">
        {editMode ? (
          <>
            <div className="space-y-1">
              <label className="text-xs opacity-60 font-medium">Project name</label>
              <input
                className="input w-full text-lg font-semibold"
                value={editedProject.name}
                onChange={(e) => setEditedProject({ ...editedProject, name: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs opacity-60 font-medium">Description</label>
              <textarea
                className="input w-full"
                rows={3}
                value={editedProject.description}
                onChange={(e) => setEditedProject({ ...editedProject, description: e.target.value })}
                placeholder="What is this project about?"
              />
            </div>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold">{project.name}</h1>
            {project.description && (
              <p className="opacity-70">{project.description}</p>
            )}
          </>
        )}
      </section>
 
      {/* Tasks */}
      <section className="space-y-3">
        <div className="section-bar flex items-center justify-between">
          <h2 className="font-semibold">Tasks</h2>
          {done.length > 0 && (
            <span className="badge opacity-60">{done.length} completed</span>
          )}
        </div>
 
        {/* Add task */}
        <div className="card flex gap-2">
          <input
            type="text"
            placeholder="Add a task…"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddTask()}
            className="input flex-1 min-w-0"
          />
          <button onClick={handleAddTask} className="btn">
            <Plus className="h-4 w-4" />
          </button>
        </div>
 
        {/* Pending tasks */}
        {pending.length === 0 && done.length === 0 ? (
          <div className="card text-center opacity-60 text-sm">
            No tasks yet — add one above.
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {pending.map((task) => (
                <div key={task.id} className="card flex items-center gap-3">
                  <button
                    onClick={() => toggleTask(task.id, task.completed)}
                    className="shrink-0 h-5 w-5 rounded border-2 flex items-center justify-center transition hover:border-green-500"
                    style={{ borderColor: "var(--border)" }}
                    aria-label="Mark complete"
                  />
                  <span className="flex-1 text-sm">{task.content || "(Untitled)"}</span>
                  <button
                    onClick={() => deleteTask(task.id)}
                    className="shrink-0 opacity-40 hover:opacity-100 transition text-red-500"
                    aria-label="Delete task"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
 
            {/* Completed tasks */}
            {done.length > 0 && (
              <details className="group">
                <summary className="text-xs opacity-50 cursor-pointer hover:opacity-80 transition select-none">
                  {done.length} completed task{done.length !== 1 ? "s" : ""}
                </summary>
                <div className="mt-2 space-y-2">
                  {done.map((task) => (
                    <div key={task.id} className="card flex items-center gap-3 opacity-50">
                      <button
                        onClick={() => toggleTask(task.id, task.completed)}
                        className="shrink-0 h-5 w-5 rounded border-2 border-green-500 bg-green-500 flex items-center justify-center"
                        aria-label="Mark incomplete"
                      >
                        <Check className="h-3 w-3 text-white" />
                      </button>
                      <span className="flex-1 text-sm line-through">{task.content || "(Untitled)"}</span>
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="shrink-0 hover:opacity-100 transition text-red-500"
                        aria-label="Delete task"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </>
        )}
      </section>
 
      {/* Links */}
      <section className="space-y-3">
        <div className="section-bar">
          <h2 className="font-semibold">Links</h2>
        </div>
 
        {editMode && (
          <div className="card flex gap-2 flex-wrap">
            <input
              type="url"
              placeholder="https://…"
              value={newLink}
              onChange={(e) => setNewLink(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addLink()}
              className="input flex-1 min-w-0"
            />
            <button onClick={addLink} className="btn">
              <Plus className="h-4 w-4 mr-1 inline" /> Add
            </button>
          </div>
        )}
 
        {editMode ? (
          <div className="space-y-2">
            {editedProject.links.length === 0 ? (
              <div className="card text-center opacity-60 text-sm">No links yet.</div>
            ) : (
              editedProject.links.map((link, i) => (
                <div key={i} className="card flex items-center gap-3">
                  <input
                    className="input flex-1 min-w-0 text-sm"
                    value={link}
                    onChange={(e) => {
                      const next = [...editedProject.links];
                      next[i] = e.target.value;
                      setEditedProject({ ...editedProject, links: next });
                    }}
                  />
                  <button
                    onClick={() => removeLink(i)}
                    className="shrink-0 opacity-40 hover:opacity-100 transition text-red-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {(project.links || []).length === 0 ? (
              <div className="card text-center opacity-60 text-sm">
                No links. Switch to edit mode to add some.
              </div>
            ) : (
              (project.links || []).map((link, i) => (
                <a
                  key={i}
                  href={link}
                  target="_blank"
                  rel="noreferrer"
                  className="card flex items-center gap-2 text-sm underline underline-offset-4 opacity-70 hover:opacity-100 transition truncate"
                >
                  <ExternalLink className="h-4 w-4 shrink-0" />
                  <span className="truncate">{link}</span>
                </a>
              ))
            )}
          </div>
        )}
      </section>
    </main>
  );
}
