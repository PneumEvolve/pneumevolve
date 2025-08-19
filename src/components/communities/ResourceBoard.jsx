import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "../../context/AuthContext";
import CollapsibleComponent from "../ui/CollapsibleComponent";


export default function ResourceBoard({ communityId, isAdmin }) {
  const { accessToken, userId } = useAuth();
  const [resources, setResources] = useState([]);
  const [newResource, setNewResource] = useState({ title: "", url: "", description: "" });
  const [editingId, setEditingId] = useState(null);
  const [showExtras, setShowExtras] = useState(false);

  const fetchResources = async () => {
    try {
      const res = await api.get(`/communities/${communityId}/resources`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setResources(res.data || []);
    } catch (err) {
      console.error("Error fetching resources:", err);
    }
  };

  useEffect(() => {
    fetchResources();
  }, [communityId, accessToken]);

  const normalizeUrl = (url) => {
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return `https://${url}`;
  }
  return url;
};

  const handleAddResource = async () => {
    try {
      const res = await api.post(
        `/communities/${communityId}/resources`,
        newResource,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      setResources([res.data, ...resources]);
      setNewResource({ title: "", url: "", description: "" });
    } catch (err) {
      console.error("Failed to add resource:", err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/communities/${communityId}/resources/${id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setResources(resources.filter((r) => r.id !== id));
    } catch (err) {
      console.error("Failed to delete resource:", err);
    }
  };

  const handleEdit = async (id, updated) => {
    try {
      const res = await api.put(
        `/communities/${communityId}/resources/${id}`,
        updated,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      setResources(resources.map((r) => (r.id === id ? res.data : r)));
      setEditingId(null);
    } catch (err) {
      console.error("Failed to update resource:", err);
    }
  };

  const canEdit = (r) =>
    r.user_id === parseInt(userId) || isAdmin || r.is_creator;

  return (
    <CollapsibleComponent title="📚 Resource Board">
      <div className="space-y-6 mt-2">

        {/* Add New Resource (collapsible) */}
        <CollapsibleComponent title="➕ Add a Resource" startCollapsed={true}>
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Title"
              className="border px-2 py-1 w-full rounded"
              value={newResource.title}
              onChange={(e) => setNewResource({ ...newResource, title: e.target.value })}
            />
            <input
              type="text"
              placeholder="URL"
              className="border px-2 py-1 w-full rounded"
              value={newResource.url}
              onChange={(e) => setNewResource({ ...newResource, url: e.target.value })}
            />
            <textarea
              placeholder="Description (optional)"
              className="border px-2 py-1 w-full rounded"
              value={newResource.description}
              onChange={(e) =>
                setNewResource({ ...newResource, description: e.target.value })
              }
            />
            <button
              className="bg-green-600 text-white px-4 py-1 rounded"
              onClick={handleAddResource}
            >
              ➕ Submit
            </button>
          </div>
        </CollapsibleComponent>

        {/* Show Extras Toggle */}
        <div className="flex justify-end">
          <button
            className="text-sm text-blue-600"
            onClick={() => setShowExtras(!showExtras)}
          >
            {showExtras ? "Hide URLs & Descriptions" : "Show URLs & Descriptions"}
          </button>
        </div>

        {/* Resource List */}
        {resources.length === 0 ? (
          <p className="text-gray-500">No resources yet.</p>
        ) : (
          <ul className="space-y-4">
            {resources.map((r) => (
              <li key={r.id} className="border p-3 rounded bg-gray-50">
                {editingId === r.id ? (
                  <div className="space-y-2">
                    <input
                      className="w-full border px-2 py-1 rounded"
                      value={r.title}
                      onChange={(e) =>
                        setResources((prev) =>
                          prev.map((item) =>
                            item.id === r.id ? { ...item, title: e.target.value } : item
                          )
                        )
                      }
                    />
                    <input
                      className="w-full border px-2 py-1 rounded"
                      value={r.url}
                      onChange={(e) =>
                        setResources((prev) =>
                          prev.map((item) =>
                            item.id === r.id ? { ...item, url: e.target.value } : item
                          )
                        )
                      }
                    />
                    <textarea
                      className="w-full border px-2 py-1 rounded"
                      value={r.description}
                      onChange={(e) =>
                        setResources((prev) =>
                          prev.map((item) =>
                            item.id === r.id ? { ...item, description: e.target.value } : item
                          )
                        )
                      }
                    />
                    <div className="flex gap-2">
                      <button
                        className="bg-blue-600 text-white px-3 py-1 rounded"
                        onClick={() =>
                          handleEdit(r.id, {
                            title: r.title,
                            url: r.url,
                            description: r.description,
                          })
                        }
                      >
                        Save
                      </button>
                      <button
                        className="bg-gray-400 text-white px-3 py-1 rounded"
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <a href={normalizeUrl(r.url)} target="_blank" rel="noopener noreferrer" className="text-blue-700 font-semibold text-lg underline">
                      {r.title}
                    </a>
                    {showExtras && (
                      <>
                        <p className="text-xs text-gray-600 break-all mt-1">{r.url}</p>
                        {r.description && (
                          <p className="text-sm text-gray-700 mt-1">{r.description}</p>
                        )}
                      </>
                    )}
                    {canEdit(r) && (
                      <div className="flex gap-2 mt-2">
                        <button
                          className="text-sm text-yellow-700"
                          onClick={() => setEditingId(r.id)}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          className="text-sm text-red-700"
                          onClick={() => handleDelete(r.id)}
                        >
                          🗑 Delete
                        </button>
                      </div>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </CollapsibleComponent>
  );
}