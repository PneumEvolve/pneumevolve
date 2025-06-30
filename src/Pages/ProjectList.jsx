import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL;

const ProjectList = () => {
  const [projects, setProjects] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [sortMethod, setSortMethod] = useState("alphabetical");
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  useEffect(() => {
  console.log("Token from localStorage:", token);

  fetch(`${API_URL}/projects`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
    .then((res) => {
      console.log("Response status:", res.status);
      return res.json();
    })
    .then((data) => {
      console.log("Projects fetched:", data); // <-- This should show on desktop AND mobile
      setProjects(data);
    })
    .catch((err) => {
      alert("Mobile error loading projects: " + err.message);
      console.error("Error loading projects:", err);
    });
}, []);

  const handleCreateAndNavigate = async () => {
    try {
      const res = await fetch(`${API_URL}/projects`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: "New Project",
          description: "",
          links: [],
        }),
      });
      if (!res.ok) throw new Error("Failed to create project");
      const newProject = await res.json();
      navigate(`/projects/${newProject.id}`);
    } catch (err) {
      console.error("Error creating project:", err);
    }
  };

  const handleEditProject = (projectId) => {
    navigate(`/projects/${projectId}?edit=true`);
  };

  const handleDeleteProject = async (projectId) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this project?");
    if (!confirmDelete) return;

    try {
      const res = await fetch(`${API_URL}/projects/${projectId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("Failed to delete project");
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
    } catch (err) {
      console.error("Error deleting project:", err);
    }
  };

  const toggleExpand = (projectId) => {
    setExpanded((prev) => ({ ...prev, [projectId]: !prev[projectId] }));
  };

  const sortedProjects = [...projects].sort((a, b) => {
    if (sortMethod === "alphabetical") {
      return a.name.localeCompare(b.name);
    } else {
      return new Date(b.created_at) - new Date(a.created_at);
    }
  });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Your Projects</h1>

      <div className="flex justify-between items-center mb-4">
        <button
          className="bg-blue-500 text-white px-4 py-2 rounded"
          onClick={handleCreateAndNavigate}
        >
          Add New Project
        </button>
        <select
          value={sortMethod}
          onChange={(e) => setSortMethod(e.target.value)}
          className="p-2 border rounded"
        >
          <option value="alphabetical">Sort A–Z</option>
          <option value="date">Sort by Newest</option>
        </select>
      </div>

      {sortedProjects.map((project) => (
        <div
          key={project.id}
          className="border p-4 mb-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition"
        >
          <div
            className="cursor-pointer flex justify-between items-center"
            onClick={() => toggleExpand(project.id)}
          >
            <h2 className="font-semibold text-lg">{project.name}</h2>
            <span className="text-sm text-gray-500">
              {expanded[project.id] ? "▲" : "▼"}
            </span>
          </div>

          {expanded[project.id] && (
            <div className="mt-2 bg-gray-50 dark:bg-gray-900 p-3 rounded">
              <p className="mb-2">{project.description || "No description"}</p>
              {project.tasks && project.tasks.some((task) => !task.completed) && (
                <ul className="list-disc ml-5 text-sm text-gray-700 dark:text-gray-300 mb-2">
                  {project.tasks
                    .filter((task) => !task.completed)
                    .map((task) => (
                      <li key={task.id}>{task.content || "(Untitled Task)"}</li>
                    ))}
                </ul>
              )}
              <button
                className="mt-2 text-sm underline text-blue-600"
                onClick={() => navigate(`/projects/${project.id}`)}
              >
                View Full Project
              </button>
            </div>
          )}

          <div className="mt-2 space-x-4">
            <button
              className="text-sm text-blue-600 underline"
              onClick={() => handleEditProject(project.id)}
            >
              ✏️ Edit
            </button>
            <button
              className="text-sm text-red-600 underline"
              onClick={() => handleDeleteProject(project.id)}
            >
              ❌ Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProjectList;