// src/pages/WeHelp.jsx
import React, { useState } from "react";
import { Button } from "../components/ui/button";
import { Plus, LifeBuoy } from "lucide-react";
import { Link } from "react-router-dom";

const WeHelp = () => {
  const [requests, setRequests] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    need: "",
    urgency: "",
  });

  const handleSubmit = () => {
    const entry = { ...formData, id: Date.now() };
    setRequests([entry, ...requests]);
    setFormData({ name: "", need: "", urgency: "" });
  };

  return (
    <div className="max-w-3xl mx-auto p-6 text-black">
      <h1 className="text-4xl font-bold mb-4">💞 We Help – The Mutual Aid Portal</h1>
      <p className="mb-6 text-lg text-black">
        If you're in need, you're not alone. Post your help request and let others respond with love and support.
      </p>

      <div className="bg-gray-300 p-4 rounded-lg shadow mb-6">
        <h2 className="text-2xl font-semibold mb-2">🆘 Ask for Help</h2>
        <input
          type="text"
          placeholder="Your Name or Alias"
          className="w-full p-2 mb-2 text-black rounded"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
        <textarea
          placeholder="What do you need help with?"
          className="w-full p-2 mb-2 text-black rounded"
          rows={3}
          value={formData.need}
          onChange={(e) => setFormData({ ...formData, need: e.target.value })}
        />
        <input
          type="text"
          placeholder="Urgency (e.g. today, this week, ongoing)"
          className="w-full p-2 mb-4 text-black rounded"
          value={formData.urgency}
          onChange={(e) => setFormData({ ...formData, urgency: e.target.value })}
        />
        <Button onClick={handleSubmit}>
          <Plus className="mr-2" /> Submit Request
        </Button>
      </div>

      <h2 className="text-2xl font-semibold mb-4">📋 Posted Help Requests</h2>
      {requests.length === 0 ? (
        <p className="text-gray-400">No requests posted yet. Be the first to reach out.</p>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <div key={req.id} className="bg-gray-700 p-4 rounded shadow">
              <h3 className="font-bold text-lg text-yellow-300">
                <LifeBuoy className="inline-block mr-2" />
                {req.name}
              </h3>
              <p className="mt-1 text-sm text-gray-100">{req.need}</p>
              <p className="mt-1 text-xs text-pink-300 italic">
                Urgency: {req.urgency || "Unspecified"}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 text-center">
        <Link to="/experiments" className="text-blue-400 underline">
          ← Back to Experiments
        </Link>
      </div>
    </div>
  );
};

export default WeHelp;