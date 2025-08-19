import React, { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";


const ProjectDetail = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [newTask, setNewTask] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [editedProject, setEditedProject] = useState({ name: "", description: "", links: [] });


  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    setEditMode(queryParams.get("edit") === "true");

    api
  .get(`/projects/${id}`)
  .then((res) => {
    const data = res.data;
    setProject(data);
    setEditedProject({ name: data.name, description: data.description, links: data.links });
  })
  .catch((err) => console.error("Error loading project:", err));
  }, [id, location.search]);

  const handleAddTask = () => {
    api
  .post(`/projects/${id}/tasks`, { content: newTask })
  .then((res) => {
    const newTaskObj = res.data;
    setProject((prev) => ({
      ...prev,
      tasks: [...prev.tasks, newTaskObj],
    }));
    setNewTask("");
  })
  .catch((err) => console.error("Error adding task:", err));
  };

  const toggleTask = (taskId, completed) => {
  const task = project.tasks.find((t) => t.id === taskId);
  if (!task) return;

  api
  .put(`/projects/tasks/${taskId}`, {
    content: task.content,
    completed: !completed,
  })
  .then(() => {
    setProject((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === taskId ? { ...t, completed: !completed } : t
      ),
    }));
  })
  .catch((err) => console.error("Error toggling task:", err));
};

  const deleteTask = (taskId) => {
    api
  .delete(`/projects/tasks/${taskId}`)
  .then(() => {
    setProject((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((t) => t.id !== taskId),
    }));
  })
  .catch((err) => console.error("Error deleting task:", err));
  };

  const handleSaveProject = () => {
    api
  .put(`/projects/${id}`, editedProject)
  .then((res) => {
    const updated = res.data;
    setProject(updated);
    setEditMode(false);
    navigate(`/projects/${id}`);
  })
  .catch((err) => console.error("Error saving project:", err));
  };

  if (!project) return <p>Loading...</p>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <button onClick={() => navigate("/projects")} className="text-blue-600 underline">
          ← Back to Projects
        </button>
        <button
          onClick={() => setEditMode((prev) => !prev)}
          className="bg-yellow-500 text-white px-3 py-1 rounded"
        >
          {editMode ? "Exit Edit Mode" : "Edit Project"}
        </button>
      </div>

      {editMode ? (
        <div>
          <input
            className="border p-2 w-full mb-2"
            value={editedProject.name}
            onChange={(e) => setEditedProject({ ...editedProject, name: e.target.value })}
          />
          <textarea
            className="border p-2 w-full mb-4"
            value={editedProject.description}
            onChange={(e) => setEditedProject({ ...editedProject, description: e.target.value })}
          />
          <h2 className="text-xl font-semibold mt-6">Links</h2>
          {editedProject.links.map((link, index) => (
            <div key={index} className="flex mb-2">
              <input
                className="border p-2 w-full"
                value={link}
                onChange={(e) => {
                  const newLinks = [...editedProject.links];
                  newLinks[index] = e.target.value;
                  setEditedProject({ ...editedProject, links: newLinks });
                }}
              />
              <button
                className="ml-2 text-red-600"
                onClick={() => {
                  const newLinks = editedProject.links.filter((_, i) => i !== index);
                  setEditedProject({ ...editedProject, links: newLinks });
                }}
              >
                🗑️
              </button>
            </div>
          ))}
          <button
            className="text-blue-600 mb-4"
            onClick={() =>
              setEditedProject({ ...editedProject, links: [...editedProject.links, ""] })
            }
          >
            + Add Link
          </button>
          <button
            className="bg-green-600 text-white px-4 py-2 rounded mr-2"
            onClick={handleSaveProject}
          >
            Save Project
          </button>
          <button
            className="bg-gray-400 text-white px-4 py-2 rounded"
            onClick={() => navigate(`/projects/${id}`)}
          >
            Cancel
          </button>
        </div>
      ) : (
        <div>
          <h1 className="text-2xl font-bold mb-2">{project.name}</h1>
          <p className="mb-4">{project.description}</p>

          <h2 className="text-xl font-semibold mt-4">To-Do</h2>
          {project.tasks
            .filter((t) => !t.completed)
            .map((task) => (
              <div key={task.id} className="flex justify-between items-center">
                <span>{task.content}</span>
                <div>
                  <div className="flex space-x-2">
  <button
    onClick={() => toggleTask(task.id, task.completed)}
    className="bg-green-500 text-white text-lg rounded-full w-9 h-9 flex items-center justify-center shadow"
    aria-label="Mark complete"
  >
    ✔️
  </button>
  <button
    onClick={() => deleteTask(task.id)}
    className="bg-red-500 text-white text-lg rounded-full w-9 h-9 flex items-center justify-center shadow"
    aria-label="Delete task"
  >
    ❌
  </button>
</div>
                </div>
              </div>
            ))}

          <input
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            className="border p-2 mt-2 w-full"
            placeholder="New task..."
          />
          <button
            className="bg-green-500 text-white px-4 py-2 rounded mt-2"
            onClick={handleAddTask}
          >
            Add Task
          </button>

          <h2 className="text-xl font-semibold mt-6">Completed</h2>
          {project.tasks
            .filter((t) => t.completed)
            .map((task) => (
              <div key={task.id} className="text-gray-500 line-through">
                {task.content}
              </div>
            ))}

          <h2 className="text-xl font-semibold mt-6">Links</h2>
          <ul className="list-disc pl-5">
            {project.links.map((link, index) => (
              <li key={index}>
                <a href={link} target="_blank" rel="noreferrer">
                  {link}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ProjectDetail;
