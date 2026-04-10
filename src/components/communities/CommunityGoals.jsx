// src/components/communities/CommunityGoals.jsx
import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Plus, Pencil, Trash2, Check, ChevronDown, ChevronUp } from "lucide-react";
import CollapsibleComponent from "../ui/CollapsibleComponent";
 
export default function CommunityGoals({ communityId, visible = true }) {
  const { accessToken } = useAuth();
  const userId = Number(localStorage.getItem("user_id"));
 
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState({});
  const [expandedProjects, setExpandedProjects] = useState({});
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");
  const [newTaskContent, setNewTaskContent] = useState({});
  const [loading, setLoading] = useState(false);
  const [hasFetchedProjects, setHasFetchedProjects] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [pendingDelete, setPendingDelete] = useState({ type: null, id: null });
  const [editProjectId, setEditProjectId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [opened, setOpened] = useState(false);
 
  if (!visible) return null;
 
  const handleOpen = () => {
    setOpened(true);
    if (!hasFetchedProjects && communityId && accessToken) {
      setLoading(true);
      api
        .get(`/communities/${communityId}/projects`)
        .then((res) => {
          const data = Array.isArray(res.data) ? res.data : res.data.projects;
          const sorted = (data || []).sort((a, b) =>
            a.title.toLowerCase().localeCompare(b.title.toLowerCase())
          );
          setProjects(sorted);
          setHasFetchedProjects(true);
        })
        .catch((err) => {
          console.error("Error fetching projects:", err);
          setProjects([]);
        })
        .finally(() => setLoading(false));
    }
  };
 
  useEffect(() => {
    const fetchTasksForExpanded = async () => {
      for (const projectId of Object.keys(expandedProjects)) {
        if (expandedProjects[projectId] && !tasks[projectId]) {
          try {
            const res = await api.get(`/communities/projects/${projectId}/tasks`);
            setTasks((prev) => ({ ...prev, [projectId]: res.data }));
          } catch (err) {
            console.error(`Error loading tasks for project ${projectId}:`, err);
          }
        }
      }
    };
    fetchTasksForExpanded();
  }, [expandedProjects, accessToken]);
 
  const handleCreateProject = async () => {
    if (!newProjectTitle.trim()) return;
    try {
      const res = await api.post(`/communities/${communityId}/projects`, {
        title: newProjectTitle,
        description: newProjectDesc,
      });
      setProjects((prev) =>
        [...prev, res.data].sort((a, b) =>
          a.title.toLowerCase().localeCompare(b.title.toLowerCase())
        )
      );
      setNewProjectTitle("");
      setNewProjectDesc("");
    } catch (err) {
      console.error("Error creating project:", err);
    }
  };
 
  const handleEditProject = async () => {
    try {
      const res = await api.put(`/communities/projects/${editProjectId}`, {
        title: editTitle,
        description: editDesc,
      });
      setProjects((prev) =>
        prev
          .map((p) => (p.id === editProjectId ? res.data : p))
          .sort((a, b) => a.title.toLowerCase().localeCompare(b.title.toLowerCase()))
      );
      setEditProjectId(null);
    } catch (err) {
      console.error("Error editing project:", err);
    }
  };
 
  const handleDeleteProject = async (projectId) => {
    try {
      await api.delete(`/communities/projects/${projectId}`);
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      setTasks((prev) => { const u = { ...prev }; delete u[projectId]; return u; });
      setExpandedProjects((prev) => { const u = { ...prev }; delete u[projectId]; return u; });
    } catch (err) {
      console.error("Error deleting project:", err);
    }
  };
 
  const handleAssignTask = async (taskId) => {
    try {
      const res = await api.put(`/communities/tasks/${taskId}`, {
        assigned_to_user_id: userId,
      });
      setTasks((prev) => {
        const u = {};
        for (const [pid, list] of Object.entries(prev)) {
          u[pid] = list.map((t) => (t.id === taskId ? res.data : t));
        }
        return u;
      });
    } catch (err) {
      console.error("Error assigning task:", err);
    }
  };
 
  const handleDeleteTask = async (taskId) => {
    try {
      await api.delete(`/communities/tasks/${taskId}`);
      setTasks((prev) => {
        const u = {};
        for (const [pid, list] of Object.entries(prev)) {
          u[pid] = list.filter((t) => t.id !== taskId);
        }
        return u;
      });
    } catch (err) {
      console.error("Error deleting task:", err);
    }
  };
 
  const toggleTaskCompletion = async (task) => {
    try {
      const res = await api.put(`/communities/tasks/${task.id}`, {
        completed: !task.completed,
        completed_by_user_id: !task.completed ? userId : null,
      });
      setTasks((prev) => {
        const u = {};
        for (const [pid, list] of Object.entries(prev)) {
          u[pid] = list.map((t) => (t.id === task.id ? res.data : t));
        }
        return u;
      });
    } catch (err) {
      console.error("Error toggling task:", err);
    }
  };
 
  const addTask = async (projectId) => {
    const content = newTaskContent[projectId];
    if (!content?.trim()) return;
    try {
      const res = await api.post(`/communities/projects/${projectId}/tasks`, { content });
      setTasks((prev) => ({
        ...prev,
        [projectId]: [...(prev[projectId] || []), res.data],
      }));
      setNewTaskContent((prev) => ({ ...prev, [projectId]: "" }));
    } catch (err) {
      console.error("Error adding task:", err);
    }
  };
 
  return (
    <>
      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="card p-6 text-center space-y-4 max-w-xs w-full mx-4">
            <h3 className="font-semibold">Confirm deletion</h3>
            <p className="text-sm opacity-70">
              Are you sure you want to delete this {pendingDelete.type}?
            </p>
            <div className="flex justify-center gap-3">
              <button
                className="btn"
                onClick={() => {
                  if (pendingDelete.type === "project") handleDeleteProject(pendingDelete.id);
                  if (pendingDelete.type === "task") handleDeleteTask(pendingDelete.id);
                  setShowDeleteModal(false);
                }}
              >
                Delete
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
 
      <CollapsibleComponent title="📌 Community Goals" defaultOpen={false}>
        <div
          // trigger fetch when first opened
          ref={(el) => { if (el && !opened) handleOpen(); }}
          className="space-y-4 pt-2"
        >
          {loading ? (
            <div className="text-center opacity-60 text-sm py-4">Loading…</div>
          ) : (
            <>
              {/* New project form */}
              <div className="card space-y-3">
                <h3 className="font-semibold text-sm">New project</h3>
                <input
                  className="input w-full"
                  placeholder="Project title"
                  value={newProjectTitle}
                  onChange={(e) => setNewProjectTitle(e.target.value)}
                />
                <textarea
                  className="input w-full"
                  placeholder="Description (optional)"
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  rows={2}
                />
                <button
                  onClick={handleCreateProject}
                  disabled={!newProjectTitle.trim()}
                  className="btn"
                >
                  <Plus className="h-4 w-4 mr-1 inline" /> Create project
                </button>
              </div>
 
              {/* Project list */}
              {projects.length === 0 ? (
                <div className="text-center opacity-60 text-sm py-4">
                  No projects yet — create one above.
                </div>
              ) : (
                <div className="space-y-3">
                  {projects.map((project) => (
                    <div key={project.id} className="card space-y-3">
                      {/* Project header */}
                      <div className="flex items-start justify-between gap-3">
                        <button
                          className="flex-1 text-left"
                          onClick={() =>
                            setExpandedProjects((prev) => ({
                              ...prev,
                              [project.id]: !prev[project.id],
                            }))
                          }
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{project.title}</span>
                            {expandedProjects[project.id]
                              ? <ChevronUp className="h-4 w-4 opacity-40" />
                              : <ChevronDown className="h-4 w-4 opacity-40" />
                            }
                          </div>
                          {project.description && (
                            <p className="text-sm opacity-60 mt-0.5">{project.description}</p>
                          )}
                        </button>
                        {(project.creator_id === userId || project.is_admin) && (
                          <div className="flex gap-2 shrink-0">
                            <button
                              onClick={() => {
                                setEditProjectId(project.id);
                                setEditTitle(project.title);
                                setEditDesc(project.description);
                              }}
                              className="btn btn-secondary !px-2 !py-1"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setPendingDelete({ type: "project", id: project.id });
                                setShowDeleteModal(true);
                              }}
                              className="btn btn-secondary !px-2 !py-1 text-red-500"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
 
                      {/* Edit form */}
                      {editProjectId === project.id && (
                        <div className="space-y-2">
                          <input
                            className="input w-full"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                          />
                          <textarea
                            className="input w-full"
                            value={editDesc}
                            onChange={(e) => setEditDesc(e.target.value)}
                            rows={2}
                          />
                          <div className="flex gap-2">
                            <button onClick={handleEditProject} className="btn">Save</button>
                            <button onClick={() => setEditProjectId(null)} className="btn btn-secondary">Cancel</button>
                          </div>
                        </div>
                      )}
 
                      {/* Tasks */}
                      {expandedProjects[project.id] && (
                        <div
                          className="space-y-2 pt-3"
                          style={{ borderTop: "1px solid var(--border)" }}
                        >
                          {(tasks[project.id] || []).map((task) => (
                            <div key={task.id} className="card space-y-1">
                              <div className="flex items-start justify-between gap-3">
                                <span className={`text-sm flex-1 ${task.completed ? "line-through opacity-50" : ""}`}>
                                  {task.content}
                                </span>
                                {(task.creator_id === userId || task.is_admin) && (
                                  <button
                                    onClick={() => {
                                      setPendingDelete({ type: "task", id: task.id });
                                      setShowDeleteModal(true);
                                    }}
                                    className="shrink-0 opacity-40 hover:opacity-100 transition text-red-500"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                              <div className="text-xs opacity-50">
                                Assigned to: {task.assigned_to?.username || "Unassigned"} ·{" "}
                                Completed by: {task.completed_by?.username || "—"}
                              </div>
                              <div className="flex gap-2 pt-1">
                                <button
                                  onClick={() => toggleTaskCompletion(task)}
                                  className="btn btn-secondary text-xs !px-2 !py-1"
                                >
                                  <Check className="h-3 w-3 mr-1 inline" />
                                  {task.completed ? "Undo" : "Complete"}
                                </button>
                                <button
                                  onClick={() => handleAssignTask(task.id)}
                                  className="btn btn-secondary text-xs !px-2 !py-1"
                                >
                                  Assign to me
                                </button>
                              </div>
                            </div>
                          ))}
 
                          {/* Add task */}
                          <div className="flex gap-2 pt-1">
                            <input
                              className="input flex-1 min-w-0 text-sm"
                              placeholder="New task…"
                              value={newTaskContent[project.id] || ""}
                              onChange={(e) =>
                                setNewTaskContent((prev) => ({
                                  ...prev,
                                  [project.id]: e.target.value,
                                }))
                              }
                              onKeyDown={(e) => e.key === "Enter" && addTask(project.id)}
                            />
                            <button
                              onClick={() => addTask(project.id)}
                              className="btn"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </CollapsibleComponent>
    </>
  );
}