import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "../../context/AuthContext";

export default function CommunityGoals({ communityId, visible = true }) {
  const [collapsed, setCollapsed] = useState(true);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState({});
  const [expandedProjects, setExpandedProjects] = useState({});
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");
  const [newTaskContent, setNewTaskContent] = useState({});
  const [loading, setLoading] = useState(false);
  const [taskLoading, setTaskLoading] = useState(false);
  const [hasFetchedProjects, setHasFetchedProjects] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [pendingDelete, setPendingDelete] = useState({ type: null, id: null });
  const [editProjectId, setEditProjectId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");

  const API = import.meta.env.VITE_API_URL;
  const { accessToken } = useAuth();
  const userId = Number(localStorage.getItem("user_id"));

  const handleToggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    setShowDeleteModal(false);
  };

  useEffect(() => {
    if (!collapsed && !hasFetchedProjects && communityId && accessToken) {
      setLoading(true);
      api
        .get(`/communities/${communityId}/projects`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
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
  }, [collapsed, hasFetchedProjects, communityId, accessToken]);

  useEffect(() => {
    const fetchTasksForExpandedProjects = async () => {
      for (const projectId of Object.keys(expandedProjects)) {
        if (expandedProjects[projectId] && !tasks[projectId]) {
          try {
            const res = await api.get(`/communities/projects/${projectId}/tasks`, {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            setTasks((prev) => ({ ...prev, [projectId]: res.data }));
          } catch (err) {
            console.error(`Error loading tasks for project ${projectId}:`, err);
          }
        }
      }
    };
    fetchTasksForExpandedProjects();
  }, [expandedProjects, accessToken]);

  const handleCreateProject = async () => {
    try {
      const res = await api.post(
        `/communities/${communityId}/projects`,
        { title: newProjectTitle, description: newProjectDesc },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      setProjects([...projects, res.data].sort((a, b) =>
  a.title.toLowerCase().localeCompare(b.title.toLowerCase())
));
      setNewProjectTitle("");
      setNewProjectDesc("");
    } catch (err) {
      console.error("Error creating project:", err);
    }
  };

  const handleEditProject = async () => {
    try {
      const res = await api.put(
        `/communities/projects/${editProjectId}`,
        { title: editTitle, description: editDesc },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      setProjects((prev) =>
  prev
    .map((p) => (p.id === editProjectId ? res.data : p))
    .sort((a, b) => a.title.toLowerCase().localeCompare(b.title.toLowerCase()))
);
      setEditProjectId(null);
      setEditTitle("");
      setEditDesc("");
    } catch (err) {
      console.error("Error editing project:", err);
    }
  };

  const handleDeleteProject = async (projectId) => {
    try {
      await api.delete(`/communities/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      setTasks((prev) => {
        const updated = { ...prev };
        delete updated[projectId];
        return updated;
      });
      setExpandedProjects((prev) => {
        const updated = { ...prev };
        delete updated[projectId];
        return updated;
      });
    } catch (err) {
      console.error("Error deleting project:", err);
    }
  };

  const handleAssignTask = async (taskId) => {
    try {
      const res = await api.put(
        `/communities/tasks/${taskId}`,
        { assigned_to_user_id: userId },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      setTasks((prev) => {
        const updated = {};
        for (const [projectId, taskList] of Object.entries(prev)) {
          updated[projectId] = taskList.map((t) => (t.id === taskId ? res.data : t));
        }
        return updated;
      });
    } catch (err) {
      console.error("Error assigning task:", err);
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await api.delete(`/communities/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setTasks((prev) => {
        const updated = {};
        for (const [projectId, taskList] of Object.entries(prev)) {
          updated[projectId] = taskList.filter((t) => t.id !== taskId);
        }
        return updated;
      });
    } catch (err) {
      console.error("Error deleting task:", err);
    }
  };

  const toggleTaskCompletion = async (task) => {
    try {
      const res = await api.put(
        `/communities/tasks/${task.id}`,
        { completed: !task.completed,
        completed_by_user_id: !task.completed ? userId : null,
        },
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      setTasks((prev) => {
        const updated = {};
        for (const [projectId, taskList] of Object.entries(prev)) {
          updated[projectId] = taskList.map((t) =>
            t.id === task.id ? res.data : t
          );
        }
        return updated;
      });
    } catch (err) {
      console.error("Error toggling task:", err);
    }
  };

  if (!visible) return null;

  return (
    <div className="border rounded mb-4 bg-white shadow">
      <button
        onClick={handleToggleCollapse}
        className="w-full text-left px-4 py-2 bg-gray-100 hover:bg-gray-200 font-bold text-lg flex justify-between items-center"
      >
        📌 Community Goals
        <span className="text-sm">{collapsed ? "➕" : "➖"}</span>
      </button>
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-md text-center max-w-xs">
            <h3 className="text-lg font-bold mb-4">Confirm Deletion</h3>
            <p className="mb-4">
              Are you sure you want to delete this {pendingDelete.type}?
            </p>
            <div className="flex justify-center gap-4">
              <button
                className="bg-red-600 text-white px-4 py-2 rounded"
                onClick={() => {
                  if (pendingDelete.type === "project") handleDeleteProject(pendingDelete.id);
                  if (pendingDelete.type === "task") handleDeleteTask(pendingDelete.id);
                  setShowDeleteModal(false);
                }}
              >
                Yes, Delete
              </button>
              <button
                className="bg-gray-300 px-4 py-2 rounded"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {!collapsed && (
        <>
          {/* New Project Form */}
          <div className="mb-6 px-4 max-w-3xl mx-auto">
  <div className="bg-white border rounded p-4 shadow">
    <input
      className="border p-2 w-full mb-3 rounded"
      placeholder="Project Title"
      value={newProjectTitle}
      onChange={(e) => setNewProjectTitle(e.target.value)}
    />
    <textarea
      className="border p-2 w-full mb-3 rounded"
      placeholder="Project Description"
      value={newProjectDesc}
      onChange={(e) => setNewProjectDesc(e.target.value)}
    />
    <button
      onClick={handleCreateProject}
      className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
    >
      Create Project
    </button>
  </div>
</div>

          {/* Project List */}
          <div className="mb-6 px-4">
            {projects.map((project) => (
              <div key={project.id} className="mb-4 border rounded p-4 bg-white max-w-3xl mx-auto">
                <div className="flex justify-between items-start">
                  <div
                    className="cursor-pointer"
                    onClick={() =>
                      setExpandedProjects((prev) => ({
                        ...prev,
                        [project.id]: !prev[project.id],
                      }))
                    }
                  >
                    <div className="font-bold text-lg">{project.title}</div>
                    <div className="text-sm text-gray-600">{project.description}</div>
                  </div>
                  <div className="flex gap-2">
                    {(project.creator_id === userId || project.is_admin) && (
                      <>
                        <button
                          className="text-yellow-600 text-xs hover:underline"
                          onClick={() => {
                            setEditProjectId(project.id);
                            setEditTitle(project.title);
                            setEditDesc(project.description);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="text-red-600 text-xs hover:underline"
                          onClick={() => {
                            setPendingDelete({ type: "project", id: project.id });
                            setShowDeleteModal(true);
                          }}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {editProjectId === project.id && (
                  <div className="mt-2">
                    <input
                      className="border p-1 w-full mb-1"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                    />
                    <textarea
                      className="border p-1 w-full mb-1"
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                    />
                    <button
                      onClick={handleEditProject}
                      className="bg-yellow-500 text-white px-3 py-1 rounded"
                    >
                      Save Changes
                    </button>
                  </div>
                )}

                {/* Task List */}
                {expandedProjects[project.id] && (
  <div className="mt-2 bg-gray-100 px-4 py-6 rounded">
                    {taskLoading ? (
                      <p>Loading tasks...</p>
                    ) : (
                      tasks[project.id]?.map((task) => (
                        <div
  key={task.id}
  className="border p-2 rounded mb-2 bg-white"
>
  <div className="mb-1">
    <span className={task.completed ? "line-through text-gray-500" : ""}>
      {task.content}
    </span>
    <div className="text-xs text-gray-600">
      Assigned to: {task.assigned_to?.username || "Unassigned"}<br />
      Completed by: {task.completed_by?.username || "—"}
    </div>
  </div>
  <div className="flex flex-col sm:flex-row sm:justify-end sm:items-center gap-1 text-sm">
  <div className="flex gap-2">
    <button
      className="text-blue-600"
      onClick={() => toggleTaskCompletion(task)}
    >
      {task.completed ? "Undo" : "Complete"}
    </button>
    <button
      className="text-green-600"
      onClick={() => handleAssignTask(task.id)}
    >
      Assign
    </button>
  </div>

  {(task.creator_id === userId || task.is_admin) && (
    <button
      onClick={() => {
        setPendingDelete({ type: "task", id: task.id });
        setShowDeleteModal(true);
      }}
      className="text-red-600 hover:underline text-sm sm:ml-4"
    >
      Delete
    </button>
  )}
</div>
</div>
                      ))
                    )}

                    {/* New Task Form */}
                    <div className="mt-4">
                      <input
                        className="border p-2 w-full"
                        placeholder="New task..."
                        value={newTaskContent[project.id] || ""}
                        onChange={(e) =>
                          setNewTaskContent((prev) => ({
                            ...prev,
                            [project.id]: e.target.value,
                          }))
                        }
                      />
                      <button
                        onClick={async () => {
                          try {
                            const res = await api.post(
                              `/communities/projects/${project.id}/tasks`,
                              { content: newTaskContent[project.id] },
                              {
                                headers: { Authorization: `Bearer ${accessToken}` },
                              }
                            );
                            setTasks((prev) => ({
                              ...prev,
                              [project.id]: [...(prev[project.id] || []), res.data],
                            }));
                            setNewTaskContent((prev) => ({ ...prev, [project.id]: "" }));
                          } catch (err) {
                            console.error("Error adding task:", err);
                          }
                        }}
                        className="bg-blue-600 text-white px-4 py-2 rounded mt-2"
                      >
                        Add Task
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}