import React, { useState, useEffect } from "react";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Trash,
  StickyNote,
  ListTodo,
  Save,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import axios from "axios";
import ReactMarkdown from "react-markdown";

const API = import.meta.env.VITE_API_URL;

const EditableSection = ({ section, onUpdate, onDelete, index, editable }) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(section.title);
  const [description, setDescription] = useState(section.description);
  const [tasks, setTasks] = useState(section.tasks || []);
  const [newTask, setNewTask] = useState("");
  const navigate = useNavigate();

  // Update parent state whenever local values change
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
    setTasks(tasks.filter((_, i) => i !== taskIndex));
  };

  return (
    <div className="border rounded-xl shadow bg-white text-gray-800 dark:bg-gray-900 dark:text-white p-4 mb-4">
      <div className="flex flex-wrap items-center justify-between gap-2 cursor-pointer">
        <div
          className="flex items-center gap-2 w-full sm:w-auto min-w-0 flex-grow"
          onClick={() => setOpen(!open)}
        >
          {open ? <ChevronDown /> : <ChevronRight />}
          {editable ? (
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-transparent border-b border-gray-400 focus:outline-none w-full text-base sm:text-xl font-semibold"
              placeholder="Section Title"
            />
          ) : (
            <span className="text-base sm:text-xl font-semibold truncate">
              {title || `Untitled Section`}
            </span>
          )}
        </div>
        <div className="flex gap-2 items-center">
          <StickyNote
            className="cursor-pointer text-yellow-500"
            onClick={() => navigate(`/notes/${index}`)}
            title="Edit Plan"
          />
          {editable && (
            <Trash
              className="text-red-500 cursor-pointer"
              onClick={() => onDelete(index)}
              title="Delete Section"
            />
          )}
        </div>
      </div>

      {open && (
        <div className="mt-4 space-y-4">
          <div className="prose dark:prose-invert max-w-none text-sm sm:text-base">
            <ReactMarkdown
              components={{
                h1: ({ node, ...props }) => (
                  <h1 className="text-2xl font-bold mb-2" {...props} />
                ),
                h2: ({ node, ...props }) => (
                  <h2 className="text-xl font-semibold mb-2" {...props} />
                ),
                p: ({ node, ...props }) => <p className="mb-2" {...props} />,
                ul: ({ node, ...props }) => (
                  <ul className="list-disc ml-6 mb-2" {...props} />
                ),
                ol: ({ node, ...props }) => (
                  <ol className="list-decimal ml-6 mb-2" {...props} />
                ),
                li: ({ node, ...props }) => <li className="mb-1" {...props} />,
                a: ({ node, ...props }) => (
      <a
        {...props}
        className="text-blue-600 underline hover:text-blue-800"
        target="_blank"
        rel="noopener noreferrer"
      />
    ),
                code: ({ node, ...props }) => (
                  <code
                    className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm"
                    {...props}
                  />
                ),
                pre: ({ node, ...props }) => (
                  <pre
                    className="bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-x-auto text-sm"
                    {...props}
                  />
                ),
              }}
            >
              {description || "_No plan written yet._"}
            </ReactMarkdown>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-1 flex items-center gap-2">
              <ListTodo className="w-5 h-5" />
              Tasks
            </h3>

            {editable && (
              <div className="flex flex-col sm:flex-row items-stretch gap-2 mb-2">
                <input
                  type="text"
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  placeholder="New task..."
                  className="flex-grow p-2 rounded border text-sm sm:text-base"
                />
                <button
                  onClick={addTask}
                  className="bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 text-sm sm:text-base"
                >
                  Add
                </button>
              </div>
            )}

            <ul className="list-disc pl-5 space-y-1 text-sm sm:text-base">
              {tasks.map((task, i) => (
                <li
                  key={i}
                  className="flex justify-between items-center gap-2"
                >
                  <span className="flex-grow">{task}</span>
                  {editable && (
                    <button
                      onClick={() => deleteTask(i)}
                      className="text-red-500 hover:underline text-sm"
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
      const data = res.data;

      // Backfill missing IDs
      const withIds = data.map(section =>
        section.id ? section : { ...section, id: crypto.randomUUID() }
      );

      setSections(withIds);

      // Optionally push back to backend with new IDs
      await axios.post(`${API}/living-plan`, withIds, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

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
  const newSection = {
    id: crypto.randomUUID(), // Or Date.now() if you're not using UUID
    title: "",
    description: "",
    tasks: [],
    notes: ""
  };
  setSections([...sections, newSection]);
};

  const updateSection = (index, updated) => {
    const newSections = [...sections];
    newSections[index] = updated;
    setSections(newSections);
  };

  const deleteSection = async (indexToDelete) => {
  const confirm = window.confirm("Are you sure you want to delete this section?");
  if (!confirm) return;

  try {
    const updated = sections.filter((_, i) => i !== indexToDelete);
    setSections(updated);

    // ✅ Now sync to backend
    await axios.post(`${API}/living-plan`, updated, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    alert("Section deleted!");
  } catch (err) {
    alert("Failed to delete section.");
    console.error(err);
  }
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
            key={section.id}
            index={index}
            section={section}
            onUpdate={updateSection}
            onDelete={deleteSection}
            editable={isEditable}
          />
        ))}

        {isEditable && (
          <div className="flex flex-wrap gap-4 mt-6">
            <button
              onClick={addSection}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
            >
              <Plus /> Add Section
            </button>
            <button
              onClick={saveToBackend}
              className="flex items-center gap-2 text-green-600 hover:text-green-800 font-medium"
            >
              <Save /> Save Changes
            </button>
          </div>
        )}
      </div>
    </div>
  );
}