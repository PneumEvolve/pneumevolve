import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";

const NodeCreationPage = () => {
  const [form, setForm] = useState({
    name: "",
    purpose: "",
    values: "",
    openJoin: true,
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({
      ...form,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleCreate = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("https://shea-klipper-backend.onrender.com/nodes/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Failed to create node.");
      }

      setSuccess(true);
      setTimeout(() => navigate("/nodes"), 1500);
    } catch (err) {
      console.error("Error creating node:", err);
      setError(err.message);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
        <div className="flex justify-between mb-4">
        <Button onClick={() => navigate("/experiments")}>← Shea's Experiments</Button>
        <Button onClick={() => navigate("/nodeViewer")}>View All Nodes</Button>
      </div>

      <h1 className="text-3xl font-bold text-center">Create a New Node</h1>

      {error && <p className="text-red-500 text-center">{error}</p>}
      {success && <p className="text-green-600 text-center">Node created! Redirecting...</p>}

      <Card>
        <CardContent className="space-y-4 p-6">
          <input
            type="text"
            name="name"
            placeholder="Node Name"
            value={form.name}
            onChange={handleChange}
            className="w-full p-2 border rounded"
          />
          <textarea
            name="purpose"
            placeholder="Purpose of this Node"
            value={form.purpose}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            rows={3}
          />
          <textarea
            name="values"
            placeholder="Shared Values (comma-separated)"
            value={form.values}
            onChange={handleChange}
            className="w-full p-2 border rounded"
            rows={2}
          />
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              name="openJoin"
              checked={form.openJoin}
              onChange={handleChange}
            />
            <span>Allow anyone to join</span>
          </label>

          <Button onClick={handleCreate}>Create Node</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default NodeCreationPage;
