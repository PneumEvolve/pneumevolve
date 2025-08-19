import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "../components/ui/button"; // ✅ Optional: use if you want styling consistency

const ProjectList = () => {
  const [projects, setProjects] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [sortMethod, setSortMethod] = useState("alphabetical");
  const [showLoginModal, setShowLoginModal] = useState(false);

  const { accessToken, userProfile } = useAuth();
  const navigate = useNavigate();

  const fetchProjects = async () => {
    try {
      const res = await api.get("/projects");
      setProjects(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("[ProjectList] Error loading projects:", err);
      setShowLoginModal(true);
    }
  };

  useEffect(() => {
    if (!accessToken) {
      setShowLoginModal(true);
    } else {
      fetchProjects();
    }
  }, [accessToken]);

  const handleCreateAndNavigate = async () => {
    try {
      const res = await api.post("/projects", {
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

  const handleEditProject = (id) => navigate(`/projects/${id}?edit=true`);

  const handleDeleteProject = async (id) => {
    if (!window.confirm("Are you sure you want to delete this project?")) return;
    try {
      await api.delete(`/projects/${id}`);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error("Error deleting project:", err);
      alert("Failed to delete project.");
    }
  };

  const toggleExpand = (id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const sortedProjects = useMemo(() => {
    return [...projects].sort((a, b) =>
      sortMethod === "alphabetical"
        ? a.name.localeCompare(b.name)
        : new Date(b.created_at) - new Date(a.created_at)
    );
  }, [projects, sortMethod]);

  return (
    <div className="p-6 bg-white dark:bg-black text-black dark:text-white min-h-screen">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">
            {userProfile?.username ? `${userProfile.username}'s Projects` : "Your Projects"}
          </h1>
          {userProfile?.username && (
            <p className="text-gray-600 dark:text-gray-400">
              Welcome back, {userProfile.username} 👋
            </p>
          )}
        </div>
        {userProfile?.profile_pic && (
          <img
            src={userProfile.profile_pic}
            alt="Profile"
            className="w-12 h-12 rounded-full border"
          />
        )}
      </div>

      <div className="flex justify-between items-center mb-4">
        <Button onClick={handleCreateAndNavigate}>Add New Project</Button>
        <select
          value={sortMethod}
          onChange={(e) => setSortMethod(e.target.value)}
          className="p-2 border rounded"
        >
          <option value="alphabetical">Sort A–Z</option>
          <option value="date">Sort by Newest</option>
        </select>
      </div>

      {sortedProjects.length === 0 ? (
        <p className="italic text-gray-500">No projects yet. Start building something great.</p>
      ) : (
        sortedProjects.map((project) => (
          <div
            key={project.id}
            className="border p-4 mb-2 rounded hover:bg-gray-100 transition bg-white dark:bg-gray-800"
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
              <div className="mt-2 bg-gray-100 dark:bg-gray-700 p-3 rounded">
                <p className="mb-2">{project.description || "No description"}</p>
                {Array.isArray(project.tasks) && project.tasks.some((t) => !t.completed) && (
                  <ul className="list-disc ml-5 text-sm text-gray-700 dark:text-gray-300 mb-2">
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
        ))
      )}

      {showLoginModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg text-center max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4">Login Required</h2>
            <p className="mb-4">You must be logged in to view or manage your projects.</p>
            <div className="flex justify-center gap-4">
              <Button onClick={() => navigate("/login")}>Go to Login</Button>
              <Button variant="yellow" onClick={() => setShowLoginModal(false)}>
                Continue Browsing
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectList;