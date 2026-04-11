import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "@/lib/api";

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
        const res = await api.get(`/gardens/${id}`);
        setGarden(res.data);
      } catch (err) {
        console.error("Garden fetch error", err);
      }
    };
    const fetchRequests = async () => {
      try {
        const res = await api.get(`/volunteers/requests/${id}`);
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
      await api.post(`/volunteers/request`, {
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
      await api.patch(`/volunteers/approve/${requestId}`, { status });
      setRequests((prev) => prev.map((r) => (r.id === requestId ? { ...r, status } : r)));
    } catch (err) {
      console.error("Approval error", err);
      alert("Approval failed.");
    }
  };

  if (loading || !garden) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)", color: "var(--muted)" }}>
      Loading...
    </div>
  );

  return (
    <main className="min-h-screen" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <div className="max-w-3xl mx-auto px-6 py-12 space-y-6">

        <div className="card p-6 space-y-2">
          <h1 className="text-2xl font-bold">{garden.host_name} — {garden.type}</h1>
          <p className="text-sm"><span className="font-medium">Description:</span> {garden.description}</p>
          <p className="text-sm"><span className="font-medium">Location:</span> {garden.location}</p>
          <p className="text-sm"><span className="font-medium">Status:</span> {garden.status}</p>
          <p className="text-sm"><span className="font-medium">Notes:</span> {garden.notes}</p>
        </div>

        <div className="card p-6 space-y-3">
          <h2 className="text-lg font-semibold">🌱 Volunteer for this garden</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input type="text" placeholder="Your Name" value={volunteerName}
              onChange={(e) => setVolunteerName(e.target.value)} required />
            <input type="email" placeholder="Email Address" value={volunteerEmail}
              onChange={(e) => setVolunteerEmail(e.target.value)} />
            <button type="submit" className="btn">Submit Request</button>
          </form>
        </div>

        <div className="card p-6 space-y-3">
          <h2 className="text-lg font-semibold">👥 Volunteer Requests</h2>
          {requests.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--muted)" }}>No requests yet.</p>
          ) : (
            <ul className="space-y-3">
              {requests.map((r) => (
                <li key={r.id} className="flex justify-between items-center p-3 rounded-xl"
                  style={{ border: "1px solid var(--border)", background: "var(--bg)" }}>
                  <div>
                    <p className="text-sm font-medium">{r.volunteer_name}</p>
                    {parseInt(loggedInUserId) === garden.host_id && (
                      <p className="text-xs" style={{ color: "var(--muted)" }}>{r.volunteer_email || "No email"}</p>
                    )}
                    <p className="text-xs" style={{ color: "var(--muted)" }}>Status: {r.status}</p>
                  </div>
                  {r.status === "Pending" && parseInt(loggedInUserId) === garden.host_id && (
                    <div className="flex gap-2">
                      <button onClick={() => handleApproval(r.id, "Approved")} className="btn text-xs py-1 px-3">
                        Approve
                      </button>
                      <button onClick={() => handleApproval(r.id, "Rejected")} className="btn btn-danger text-xs py-1 px-3">
                        Reject
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
};

export default GardenDetails;