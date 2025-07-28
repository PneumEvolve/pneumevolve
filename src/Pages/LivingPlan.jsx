import React, { useState, useEffect } from "react";
import { ChevronDown, ChevronRight, Plus, Trash, StickyNote, ListTodo, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import axios from "axios";

const API = import.meta.env.VITE_API_URL;

const EditableSection = ({ section, onUpdate, onDelete, index, editable }) => {
  const [open, setOpen] = useState(true);
  const [title, setTitle] = useState(section.title);
  const [description, setDescription] = useState(section.description);
  const [tasks, setTasks] = useState(section.tasks || []);
  const [newTask, setNewTask] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    onUpdate(index, { ...section, title, description, tasks });
  }, [title, description, tasks]);

  const addTask = () => {
    if (newTask.trim()) {
      setTasks([...tasks, newTask]);
      setNewTask("");
    }
  };

  const deleteTask = (taskIndex) => {
    const newTasks = tasks.filter((_, i) => i !== taskIndex);
    setTasks(newTasks);
  };

  return (
    <div className="border rounded-xl shadow bg-white text-gray-800 dark:bg-gray-900 dark:text-white p-4 mb-4">
      <div className="flex items-center justify-between cursor-pointer">
        <div className="flex items-center gap-2 w-full" onClick={() => setOpen(!open)}>
          {open ? <ChevronDown /> : <ChevronRight />}
          {editable ? (
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-transparent border-b border-gray-400 focus:outline-none flex-grow text-xl font-semibold"
              placeholder="Section Title"
            />
          ) : (
            <span className="text-xl font-semibold">{title}</span>
          )}
        </div>
        <div className="flex gap-2 items-center">
          <StickyNote
            className="cursor-pointer text-yellow-500"
            onClick={() => navigate(`/notes/${index}`)}
          />
          {editable && (
            <Trash className="text-red-500 cursor-pointer" onClick={() => onDelete(index)} />
          )}
        </div>
      </div>

      {open && (
        <div className="mt-4 space-y-4">
          {editable ? (
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Section content..."
              className="w-full bg-transparent border border-gray-300 rounded p-2 focus:outline-none min-h-[80px]"
            />
          ) : (
            <p className="whitespace-pre-wrap">{description}</p>
          )}

          <div>
            <h3 className="text-lg font-medium mb-1 flex items-center gap-1">
              <ListTodo className="w-5 h-5" /> Tasks
            </h3>

            {editable && (
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  placeholder="New task..."
                  className="flex-grow p-2 rounded border"
                />
                <button
                  onClick={addTask}
                  className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
            )}

            <ul className="list-disc pl-6 space-y-1">
              {tasks.map((task, i) => (
                <li key={i} className="flex justify-between items-center">
                  <span>{task}</span>
                  {editable && (
                    <button
                      onClick={() => deleteTask(i)}
                      className="text-sm text-red-500 hover:underline"
                    >
                      Delete
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default function LivingPlan() {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const { userEmail, accessToken } = useAuth();
const isEditable = userEmail === "sheaklipper@gmail.com";



  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get(`${API}/living-plan`);
        setSections(res.data);
      } catch (err) {
        console.error("Error fetching living plan:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const saveToBackend = async () => {
    try {
      await axios.post(`${API}/living-plan`, sections, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      alert("Saved successfully!");
    } catch (err) {
      alert("Failed to save. Check console for error.");
      console.error(err);
    }
  };

  const addSection = () => {
    setSections([...sections, { title: "", description: "", tasks: [], notes: "" }]);
  };

  const updateSection = (index, updated) => {
    const newSections = [...sections];
    newSections[index] = updated;
    setSections(newSections);
  };

  const deleteSection = (index) => {
    const newSections = [...sections];
    newSections.splice(index, 1);
    setSections(newSections);
  };

  if (loading) {
    return <p className="text-center text-gray-500">Loading Living Plan...</p>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-4xl font-bold mb-6 text-center">🌱 The Living Plan</h1>

      <div className="space-y-4">
        {sections.map((section, index) => (
          <EditableSection
            key={index}
            index={index}
            section={section}
            onUpdate={updateSection}
            onDelete={deleteSection}
            editable={isEditable}
          />
        ))}

        {isEditable && (
          <>
            <button
              onClick={addSection}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium mt-6"
            >
              <Plus /> Add Section
            </button>
            <button
              onClick={saveToBackend}
              className="ml-4 flex items-center gap-2 text-green-600 hover:text-green-800 font-medium"
            >
              <Save /> Save Changes
            </button>
          </>
        )}
      </div>
    </div>
  );
}