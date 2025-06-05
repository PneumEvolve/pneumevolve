// src/pages/Nodes.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Loader2 } from "lucide-react";

const API_URL = "https://shea-klipper-backend.onrender.com/nodes/nodes";

const NodesPage = () => {
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchNodes = async () => {
      try {
        const res = await fetch(API_URL);
        if (!res.ok) {
          throw new Error("Failed to fetch nodes");
        }
        const data = await res.json();
        setNodes(data);
      } catch (err) {
        console.error("Error fetching nodes:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchNodes();
  }, []);

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex justify-between mb-4">
                <Button onClick={() => navigate("/Experiments")}>← Shea's Experiments</Button>
                <Button onClick={() => navigate("/NodeCreation")}>Create Node</Button>
              </div>
      <h1 className="text-4xl font-bold text-center">Community Nodes</h1>

      {loading && (
        <div className="flex justify-center items-center">
          <Loader2 className="animate-spin w-6 h-6 mr-2" />
          <span>Loading nodes...</span>
        </div>
      )}

      {error && <p className="text-red-500 text-center">{error}</p>}

      {!loading && nodes.length === 0 && (
        <p className="text-center text-gray-600">No nodes have been created yet.</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {nodes.map((node) => (
          <Card key={node.id}>
            <CardContent className="space-y-2 p-4">
              <h2 className="text-xl font-semibold">{node.name}</h2>
              {node.mission && <p><strong>Mission:</strong> {node.mission}</p>}
              {node.resources && <p><strong>Resources:</strong> {node.resources}</p>}
              {node.skills_needed && <p><strong>Skills Needed:</strong> {node.skills_needed}</p>}
              <p className="text-sm text-gray-500">Created by user #{node.user_id}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default NodesPage;