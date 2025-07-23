import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";

const API_URL = "https://shea-klipper-backend.onrender.com";

const NodesPage = () => {
  const [nodes, setNodes] = useState([]);
  const [error, setError] = useState("");
  const [joinedNodes, setJoinedNodes] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchNodes();
  }, []);

  const fetchNodes = async () => {
    try {
      const res = await fetch(`${API_URL}/nodes`);
      if (!res.ok) throw new Error("Failed to fetch nodes");
      const data = await res.json();
      setNodes(data);
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Failed to load nodes");
    }
  };

  const handleJoin = async (nodeId) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/nodes/join/${nodeId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Failed to join node");
      setJoinedNodes([...joinedNodes, nodeId]);
    } catch (err) {
      console.error("Join error:", err);
      setError("Unable to join node");
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold text-center">Explore Community Nodes</h1>
      {error && <p className="text-red-500 text-center">{error}</p>}
      {nodes.length === 0 && <p className="text-center">No nodes found.</p>}

      {nodes.map((node) => (
        <Card key={node.id} className="border border-gray-200">
          <CardContent className="p-4 space-y-2">
            <h2 className="text-xl font-semibold">{node.name}</h2>
            <p><strong>Purpose:</strong> {node.mission || "No purpose provided"}</p>
            <p><strong>Values:</strong> {node.resources || "No values listed"}</p>
            <p><strong>Skills Needed:</strong> {node.skills_needed || "Not specified"}</p>
            <Button
              onClick={() => handleJoin(node.id)}
              disabled={joinedNodes.includes(node.id)}
              className="mt-2"
            >
              {joinedNodes.includes(node.id) ? "Joined" : "Join Node"}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default NodesPage;