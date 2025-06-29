import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL;

const ProjectList = () => {
  const [projects, setProjects] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();

  const token = localStorage.getItem("token");

  useEffect(() => {
    fetch(`${API_URL}/projects`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        console.log("Projects response:", data);
        setProjects(data);
      })
      .catch((err) => {
        console.error("Error loading projects:", err);
        setProjects([]);
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

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Your Projects</h1>
      <button
        className="mb-4 bg-blue-500 text-white px-4 py-2 rounded"
        onClick={handleCreateAndNavigate}
      >
        Add New Project
      </button>
      {projects.map((project) => (
        <div
          key={project.id}
          className="border p-4 mb-2 rounded hover:bg-gray-100"
        >
          <div
            className="cursor-pointer"
            onClick={() => navigate(`/projects/${project.id}`)}
          >
            <h2 className="font-semibold">{project.name}</h2>
            <p>{project.description}</p>
            {project.tasks && project.tasks.some(task => !task.completed) && (
              <ul className="list-disc ml-6 mt-2 text-sm text-gray-700">
                {project.tasks
                  .filter((task) => !task.completed)
                  .map((task) => (
                    <li key={task.id}>{task.content || "(Untitled Task)"}</li>
                  ))}
              </ul>
            )}
          </div>
          <div className="mt-2 space-x-4">
            <button
              className="text-sm text-blue-600 underline"
              onClick={() => handleEditProject(project.id)}
            >
              Edit Project
            </button>
            <button
              className="text-sm text-red-600 underline"
              onClick={() => handleDeleteProject(project.id)}
            >
              Delete Project
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProjectList;
