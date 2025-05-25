import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Link } from "react-router-dom";

const WeDo = () => {
  const [offers, setOffers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [formType, setFormType] = useState("offer");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    tags: "",
  });

  const handleSubmit = () => {
    const entry = { ...formData, type: formType, id: Date.now() };
    if (formType === "offer") {
      setOffers([entry, ...offers]);
    } else {
      setRequests([entry, ...requests]);
    }
    setFormData({ title: "", description: "", tags: "" });
  };

  return (
    <div className="max-w-4xl mx-auto p-6 text-white">
      <h1 className="text-4xl font-bold mb-4">🤝 We Do – The Action Hub</h1>
      <p className="mb-4 text-lg text-gray-300">
        Offer help, request support, and co-create projects that matter. This is where action lives.
      </p>

      <div className="bg-gray-800 p-4 rounded-lg mb-6">
        <div className="flex items-center gap-4 mb-2">
          <Button
            onClick={() => setFormType("offer")}
            variant={formType === "offer" ? "default" : "ghost"}
          >
            I Can Offer
          </Button>
          <Button
            onClick={() => setFormType("request")}
            variant={formType === "request" ? "default" : "ghost"}
          >
            I Need Help
          </Button>
        </div>

        <input
          type="text"
          placeholder="Title"
          className="w-full p-2 rounded mb-2 text-black"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        />
        <textarea
          placeholder="Describe the help or offer..."
          className="w-full p-2 rounded mb-2 text-black"
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
        />
        <input
          type="text"
          placeholder="Tags (comma-separated)"
          className="w-full p-2 rounded mb-4 text-black"
          value={formData.tags}
          onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
        />
        <Button onClick={handleSubmit}>
          <Plus className="mr-2" /> Post {formType === "offer" ? "Offer" : "Request"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-2xl font-semibold mb-2">🌿 Offers</h2>
          {offers.length === 0 ? (
            <p className="text-gray-400">No offers yet.</p>
          ) : (
            offers.map((offer) => (
              <div key={offer.id} className="bg-gray-700 p-4 rounded mb-2">
                <h3 className="font-bold">{offer.title}</h3>
                <p className="text-sm">{offer.description}</p>
                <p className="text-xs text-gray-300 mt-1">{offer.tags}</p>
              </div>
            ))
          )}
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-2">🆘 Requests</h2>
          {requests.length === 0 ? (
            <p className="text-gray-400">No requests yet.</p>
          ) : (
            requests.map((request) => (
              <div key={request.id} className="bg-gray-700 p-4 rounded mb-2">
                <h3 className="font-bold">{request.title}</h3>
                <p className="text-sm">{request.description}</p>
                <p className="text-xs text-gray-300 mt-1">{request.tags}</p>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-8 text-center">
        <Link to="/experiments" className="text-blue-400 underline">
          ← Back to Experiments
        </Link>
      </div>
    </div>
  );
};

export default WeDo;