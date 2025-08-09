// GardenDetails.jsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axiosInstance from "../utils/axiosInstance";



const GardenDetails = () => {
  const { id } = useParams();
  const [garden, setGarden] = useState(null);
  const [requests, setRequests] = useState([]);
  const [volunteerName, setVolunteerName] = useState("");
  const [volunteerEmail, setVolunteerEmail] = useState("");
  const [loading, setLoading] = useState(true);

  const loggedInUserId = localStorage.getItem("user_id");

  useEffect(() => {
    const fetchGarden = async () => {
  try {
    const res = await axiosInstance.get(`/gardens/${id}`);
    setGarden(res.data);
  } catch (err) {
    console.error("Garden fetch error", err);
  }
};

    const fetchRequests = async () => {
      try {
        const res = await axiosInstance.get(`/volunteers/requests/${id}`);
        setRequests(res.data);
      } catch (err) {
        console.error("Error fetching requests", err);
      }
    };

    fetchGarden();
    fetchRequests();
    setLoading(false);
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axiosInstance.post(`/volunteers/request`, {
  garden_id: parseInt(id),
  volunteer_name: volunteerName,
  volunteer_email: volunteerEmail,
});
      alert("Request sent!");
      setVolunteerName("");
      setVolunteerEmail("");
    } catch (err) {
      console.error("Submission error", err);
      alert("Error submitting request.");
    }
  };

  const handleApproval = async (requestId, status) => {
  if (!garden || parseInt(loggedInUserId) !== garden.host_id) {
    alert("Only the garden host can approve or reject requests.");
    return;
  }
  try {
    await axiosInstance.patch(`/volunteers/approve/${requestId}`, { status });
    setRequests((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, status } : r))
    );
  } catch (err) {
    console.error("Approval error", err);
    alert("Approval failed. Please ensure you're logged in.");
  }
};

  if (loading || !garden) return <p className="text-center mt-6">Loading...</p>;

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
      <h1 className="text-3xl font-bold mb-4">{garden.host_name} — {garden.type}</h1>
      <p><strong>Description:</strong> {garden.description}</p>
      <p><strong>Location:</strong> {garden.location}</p>
      <p><strong>Status:</strong> {garden.status}</p>
      <p><strong>Notes:</strong> {garden.notes}</p>

      <hr className="my-6" />

      <h2 className="text-xl font-semibold mb-2">🌱 Volunteer for this garden</h2>
      <form onSubmit={handleSubmit} className="space-y-2">
        <input
          type="text"
          placeholder="Your Name"
          value={volunteerName}
          onChange={(e) => setVolunteerName(e.target.value)}
          className="w-full p-2 border rounded"
          required
        />
        <input
          type="email"
          placeholder="Email Address"
          value={volunteerEmail}
          onChange={(e) => setVolunteerEmail(e.target.value)}
          className="w-full p-2 border rounded"
        />
        <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded">
          Submit Request
        </button>
      </form>

      <hr className="my-6" />

      <h2 className="text-xl font-semibold mb-2">👥 Volunteer Requests</h2>
      {requests.length === 0 ? (
        <p>No requests yet.</p>
      ) : (
        <ul className="space-y-2">
          {requests.map((r) => (
            <li
              key={r.id}
              className="p-3 border rounded flex justify-between items-center"
            >
              <div>
                <strong>{r.volunteer_name}</strong>
                {parseInt(loggedInUserId) === garden.host_id && (
                  <> ({r.volunteer_email || "No email"})</>
                )}
                <br />
                Status: <span className="font-medium">{r.status}</span>
              </div>
              {r.status === "Pending" && parseInt(loggedInUserId) === garden.host_id && (
                <div className="space-x-2">
                  <button
                    onClick={() => handleApproval(r.id, "Approved")}
                    className="bg-blue-500 text-white px-3 py-1 rounded"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleApproval(r.id, "Rejected")}
                    className="bg-red-500 text-white px-3 py-1 rounded"
                  >
                    Reject
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default GardenDetails;