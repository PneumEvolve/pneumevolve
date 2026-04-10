// src/Pages/ProjectList.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Plus, ChevronDown, ChevronUp, Pencil, Trash2 } from "lucide-react";
 
export default function ProjectList() {
  const [projects, setProjects] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [sortMethod, setSortMethod] = useState("date");
 
  const { accessToken, userProfile } = useAuth();
  const navigate = useNavigate();
 
  useEffect(() => {
    if (!accessToken) {
      navigate("/login");
      return;
    }
    fetchProjects();
  }, [accessToken]);
 
  const fetchProjects = async () => {
  const token = localStorage.getItem("access_token");
  console.log("[ProjectList] token at fetch time:", token ? "present" : "MISSING");
  try {
    const res = await api.get("/projects/");
    setProjects(Array.isArray(res.data) ? res.data : []);
  } catch (err) {
    console.error("[ProjectList] Error loading projects:", err);
  }
};

useEffect(() => {
  if (!accessToken) {
    navigate("/login");
    return;
  }
  fetchProjects();
}, [accessToken]);
 
  const handleCreate = async () => {
    try {
      const res = await api.post("/projects/", {
        name: "New Project",
        description: "",
        links: [],
      });
      navigate(`/projects/${res.data.id}?edit=true`);
    } catch (err) {
      console.error("Error creating project:", err);
      alert("Failed to create project.");
    }
  };
 
  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Delete this project?")) return;
    try {
      await api.delete(`/projects/${id}`);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error("Error deleting project:", err);
      alert("Failed to delete project.");
    }
  };
 
  const toggleExpand = (id) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
 
  const sorted = useMemo(() => {
    return [...projects].sort((a, b) =>
      sortMethod === "alphabetical"
        ? a.name.localeCompare(b.name)
        : new Date(b.created_at) - new Date(a.created_at)
    );
  }, [projects, sortMethod]);
 
  const incompleteTasks = (project) =>
    (project.tasks || []).filter((t) => !t.completed);
 
  return (
    <main className="main p-6 space-y-6">
      {/* Profile header */}
      <section className="card flex items-center gap-4">
        {userProfile?.profile_pic && (
          <img
            src={userProfile.profile_pic}
            alt="Profile"
            className="w-12 h-12 rounded-full border shrink-0"
            style={{ borderColor: "var(--border)" }}
          />
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold truncate">
            {userProfile?.username ? `${userProfile.username}'s Projects` : "Your Projects"}
          </h1>
          {userProfile?.username && (
            <p className="text-sm opacity-60">Welcome back, {userProfile.username} 👋</p>
          )}
        </div>
        <button onClick={handleCreate} className="btn shrink-0">
          <Plus className="h-4 w-4 mr-1 inline" /> New project
        </button>
      </section>
 
      {/* Controls */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="section-bar flex-1">
          <span className="font-semibold">
            {projects.length} {projects.length === 1 ? "project" : "projects"}
          </span>
        </div>
        <select
          value={sortMethod}
          onChange={(e) => setSortMethod(e.target.value)}
          className="input w-auto"
        >
          <option value="date">Newest first</option>
          <option value="alphabetical">A–Z</option>
        </select>
      </div>
 
      {/* Project list */}
      {sorted.length === 0 ? (
        <div className="card text-center space-y-3">
          <p className="opacity-60 text-sm">No projects yet.</p>
          <button onClick={handleCreate} className="btn">
            <Plus className="h-4 w-4 mr-1 inline" /> Start your first project
          </button>
        </div>
      ) : (
        <section className="space-y-3">
          {sorted.map((project) => {
            const open = expanded[project.id];
            const pending = incompleteTasks(project);
            const done = (project.tasks || []).filter((t) => t.completed);
 
            return (
              <div key={project.id} className="card space-y-0">
                {/* Header row — click to expand */}
                <button
                  onClick={() => toggleExpand(project.id)}
                  className="w-full flex items-center justify-between gap-3 text-left"
                >
                  <div className="flex-1 min-w-0">
                    <h2 className="font-semibold text-lg truncate">{project.name}</h2>
                    {!open && project.description && (
                      <p className="text-sm opacity-60 truncate mt-0.5">{project.description}</p>
                    )}
                  </div>
 
                  <div className="flex items-center gap-3 shrink-0">
                    {pending.length > 0 && (
                      <span className="badge">{pending.length} task{pending.length !== 1 ? "s" : ""}</span>
                    )}
                    {done.length > 0 && !open && (
                      <span className="badge opacity-50">{done.length} done</span>
                    )}
                    {open ? (
                      <ChevronUp className="h-4 w-4 opacity-40" />
                    ) : (
                      <ChevronDown className="h-4 w-4 opacity-40" />
                    )}
                  </div>
                </button>
 
                {/* Expanded content */}
                {open && (
                  <div
                    className="mt-4 pt-4 space-y-4"
                    style={{ borderTop: "1px solid var(--border)" }}
                  >
                    {project.description && (
                      <p className="text-sm opacity-80">{project.description}</p>
                    )}
 
                    {/* Pending tasks preview */}
                    {pending.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium opacity-50 uppercase tracking-wide">To do</p>
                        <ul className="space-y-1">
                          {pending.slice(0, 5).map((t) => (
                            <li key={t.id} className="flex items-center gap-2 text-sm">
                              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-40 shrink-0" />
                              {t.content || "(Untitled)"}
                            </li>
                          ))}
                          {pending.length > 5 && (
                            <li className="text-xs opacity-40">+{pending.length - 5} more</li>
                          )}
                        </ul>
                      </div>
                    )}
 
                    {/* Links preview */}
                    {(project.links || []).length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium opacity-50 uppercase tracking-wide">Links</p>
                        <ul className="space-y-1">
                          {project.links.slice(0, 3).map((link, i) => (
                            <li key={i}>
                              <a
                                href={link}
                                target="_blank"
                                rel="noreferrer"
                                className="text-sm underline underline-offset-4 opacity-70 hover:opacity-100 truncate block"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {link}
                              </a>
                            </li>
                          ))}
                          {project.links.length > 3 && (
                            <li className="text-xs opacity-40">+{project.links.length - 3} more</li>
                          )}
                        </ul>
                      </div>
                    )}
 
                    {/* Actions */}
                    <div className="flex items-center gap-3 pt-1">
                      <button
                        onClick={() => navigate(`/projects/${project.id}`)}
                        className="btn"
                      >
                        Open project
                      </button>
                      <button
                        onClick={() => navigate(`/projects/${project.id}?edit=true`)}
                        className="btn btn-secondary"
                      >
                        <Pencil className="h-4 w-4 mr-1 inline" /> Edit
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, project.id)}
                        className="btn btn-secondary text-red-500 ml-auto"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}
    </main>
  );
}