import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";

export default function CommunityGoals({ communityId, visible = true }) {
  const [collapsed, setCollapsed] = useState(false);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");
  const [newTaskContent, setNewTaskContent] = useState("");

  const API = import.meta.env.VITE_API_URL;
  const { accessToken } = useAuth();

  useEffect(() => {
    if (!visible) return;
    axios
      .get(`${API}/communities/${communityId}/projects`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
      .then((res) => {
        const data = res.data;
        if (Array.isArray(data)) {
          setProjects(data);
        } else if (data.projects && Array.isArray(data.projects)) {
          setProjects(data.projects);
        } else {
          console.warn("Unexpected projects response:", data);
          setProjects([]);
        }
      })
      .catch((err) => {
        console.error("Error fetching community projects:", err);
        setProjects([]);
      });
  }, [communityId, visible, accessToken]);

  useEffect(() => {
    if (!selectedProject || collapsed) {
      setTasks([]);
      return;
    }

    let cancel = false;

    axios
      .get(`${API}/communities/projects/${selectedProject.id}/tasks`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
      .then((res) => {
        if (!cancel) setTasks(res.data);
      })
      .catch((err) => {
        if (!cancel) console.error("Error fetching tasks:", err);
      });

    return () => {
      cancel = true;
    };
  }, [selectedProject, accessToken, collapsed]);

  const handleCreateProject = async () => {
    try {
      const res = await axios.post(
        `${API}/communities/${communityId}/projects`,
        {
          title: newProjectTitle,
          description: newProjectDesc,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      setProjects([...projects, res.data]);
      setNewProjectTitle("");
      setNewProjectDesc("");
    } catch (err) {
      console.error("Error creating project:", err);
    }
  };

  const handleAddTask = async () => {
    try {
      const res = await axios.post(
        `${API}/communities/projects/${selectedProject.id}/tasks`,
        { content: newTaskContent },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      setTasks([...tasks, res.data]);
      setNewTaskContent("");
    } catch (err) {
      console.error("Error adding task:", err);
    }
  };

  const toggleTaskCompletion = async (task) => {
    try {
      const res = await axios.put(
        `${API}/communities/tasks/${task.id}`,
        {
          completed: !task.completed,
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      setTasks(tasks.map((t) => (t.id === task.id ? res.data : t)));
    } catch (err) {
      console.error("Error toggling task:", err);
    }
  };

  if (!visible) return null;

  return (
    <div className="p-6 bg-white rounded shadow mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Community Goals</h2>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-sm bg-gray-200 px-3 py-1 rounded"
        >
          {collapsed ? "➕" : "➖"}
        </button>
      </div>

      {!collapsed && (
        <>
          <div className="mb-4">
            <input
              className="border p-2 w-full mb-2"
              placeholder="Project Title"
              value={newProjectTitle}
              onChange={(e) => setNewProjectTitle(e.target.value)}
            />
            <textarea
              className="border p-2 w-full mb-2"
              placeholder="Project Description"
              value={newProjectDesc}
              onChange={(e) => setNewProjectDesc(e.target.value)}
            />
            <button
              onClick={handleCreateProject}
              className="bg-green-600 text-white px-4 py-2 rounded"
            >
              Create Project
            </button>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Projects</h3>
            {projects.map((project) => (
              <div
                key={project.id}
                onClick={() =>
                  setSelectedProject((prev) =>
                    prev?.id === project.id ? null : project
                  )
                }
                className={`p-2 border rounded cursor-pointer mb-2 ${
                  selectedProject?.id === project.id ? "bg-blue-100" : ""
                }`}
              >
                <div className="font-bold">{project.title}</div>
                <div className="text-sm text-gray-600">{project.description}</div>
              </div>
            ))}
          </div>

          {selectedProject && (
            <div>
              <h4 className="text-xl font-semibold mb-2">
                Tasks for {selectedProject.title}
              </h4>
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex justify-between items-center border p-2 rounded mb-1"
                >
                  <span className={task.completed ? "line-through text-gray-500" : ""}>
                    {task.content}
                  </span>
                  <button
                    className="text-blue-600 text-sm"
                    onClick={() => toggleTaskCompletion(task)}
                  >
                    {task.completed ? "Undo" : "Complete"}
                  </button>
                </div>
              ))}

              <div className="mt-4">
                <input
                  className="border p-2 w-full"
                  placeholder="New task..."
                  value={newTaskContent}
                  onChange={(e) => setNewTaskContent(e.target.value)}
                />
                <button
                  onClick={handleAddTask}
                  className="bg-blue-600 text-white px-4 py-2 rounded mt-2"
                >
                  Add Task
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}