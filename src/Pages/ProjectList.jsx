import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../utils/axiosInstance";



const ProjectList = () => {
  const [projects, setProjects] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [sortMethod, setSortMethod] = useState("alphabetical");
  const [showLoginModal, setShowLoginModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
  const token = localStorage.getItem("access_token");
  if (!token) {
    setShowLoginModal(true);
    return;
  }

  const fetchProjects = async () => {
  try {
    const res = await axiosInstance.get("/projects");
    console.log("[ProjectList] Response:", res.data);
    setProjects(Array.isArray(res.data) ? res.data : []);
  } catch (err) {
    console.error("[ProjectList] Error loading projects:", err);
    setShowLoginModal(true);
  }
};

  fetchProjects();
}, []);

  const handleCreateAndNavigate = async () => {
  try {
    const res = await axiosInstance.post("/projects", {
      name: "New Project",
      description: "",
      links: [],
    });

    navigate(`/projects/${res.data.id}`);
  } catch (err) {
    console.error("Error creating project:", err);
    alert("Failed to create project.");
  }
};

  const handleEditProject = (projectId) => {
    navigate(`/projects/${projectId}?edit=true`);
  };

  const handleDeleteProject = async (projectId) => {
  const confirmDelete = window.confirm("Are you sure you want to delete this project?");
  if (!confirmDelete) return;

  try {
    await axiosInstance.delete(`/projects/${projectId}`);
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
  } catch (err) {
    console.error("Error deleting project:", err);
    alert("Failed to delete project.");
  }
};

  const toggleExpand = (projectId) => {
    setExpanded((prev) => ({ ...prev, [projectId]: !prev[projectId] }));
  };

  const sortedProjects = Array.isArray(projects)
    ? [...projects].sort((a, b) =>
        sortMethod === "alphabetical"
          ? a.name.localeCompare(b.name)
          : new Date(b.created_at) - new Date(a.created_at)
      )
    : [];

  return (
    <div className="p-6 bg-white text-black min-h-screen">
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
          className="border p-4 mb-2 rounded hover:bg-gray-100 transition bg-white"
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
            <div className="mt-2 bg-gray-100 p-3 rounded">
              <p className="mb-2">{project.description || "No description"}</p>

              {Array.isArray(project.tasks) && project.tasks.some((t) => !t.completed) && (
                <ul className="list-disc ml-5 text-sm text-gray-700 mb-2">
                  {project.tasks
                    .filter((t) => !t.completed)
                    .map((t) => (
                      <li key={t.id}>{t.content || "(Untitled Task)"}</li>
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
      {showLoginModal && (
  <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg text-center max-w-md w-full">
      <h2 className="text-xl font-semibold mb-4">Login Required</h2>
      <p className="mb-4">You must be logged in to view or manage your projects.</p>
      <div className="flex justify-center gap-4">
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded"
          onClick={() => navigate("/login")}
        >
          Go to Login
        </button>
        <button
          className="bg-gray-300 text-gray-800 px-4 py-2 rounded"
          onClick={() => setShowLoginModal(false)}
        >
          Continue Browsing
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
};

export default ProjectList;