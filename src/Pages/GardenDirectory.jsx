import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";

const GardenDirectory = () => {
  const [gardens, setGardens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [locationFilter, setLocationFilter] = useState("All");
  const [locations, setLocations] = useState([]);

  useEffect(() => {
    const fetchGardens = async () => {
      try {
        const res = await api.get("/gardens");
        setGardens(res.data);
        setLocations(["All", ...new Set(res.data.map((g) => g.location).filter(Boolean))]);
      } catch (err) {
        console.error("Error fetching gardens:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchGardens();
  }, []);

  const filtered = gardens.filter((garden) => {
    if (filter !== "All") {
      const isBlitz = garden.type === "Blitz";
      const isHost = garden.description?.includes("Host");
      if (filter === "Blitz Host" && !(isBlitz && isHost)) return false;
      if (filter === "Blitz Volunteer" && !(isBlitz && !isHost)) return false;
      if (filter === "Long-Term Host" && !(!isBlitz && isHost)) return false;
      if (filter === "Long-Term Volunteer" && !(!isBlitz && !isHost)) return false;
    }
    if (locationFilter !== "All" && garden.location !== locationFilter) return false;
    return true;
  });

  return (
    <main className="min-h-screen" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <div className="max-w-4xl mx-auto px-6 py-12 space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2">🌾 Garden Directory</h1>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Browse local gardens part of the Garden Blitz and Ongoing Support program.
          </p>
        </div>

        <div className="text-center">
          <Link to="/garden-blitz" className="btn btn-secondary text-sm">
            ← Back to Garden Blitz
          </Link>
        </div>

        <div className="card p-4 flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Type:</label>
            <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ width: "auto" }}>
              <option value="All">Show All</option>
              <option value="Blitz Host">🌿 Blitz Host</option>
              <option value="Blitz Volunteer">💪 Blitz Volunteer</option>
              <option value="Long-Term Host">🌻 Long-Term Host</option>
              <option value="Long-Term Volunteer">🌾 Long-Term Volunteer</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Location:</label>
            <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} style={{ width: "auto" }}>
              {locations.map((loc, idx) => <option key={idx} value={loc}>{loc}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <p className="text-center" style={{ color: "var(--muted)" }}>Loading gardens...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center" style={{ color: "var(--muted)" }}>No gardens found.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filtered.map((garden) => (
              <div key={garden.id} className="card p-5 space-y-2">
                <h2 className="text-base font-semibold">{garden.host_name} — {garden.type}</h2>
                <p className="text-sm italic" style={{ color: "var(--muted)" }}>{garden.description}</p>
                <p className="text-sm"><span className="font-medium">Location:</span> {garden.location}</p>
                <p className="text-sm"><span className="font-medium">Status:</span> {garden.status}</p>
                <p className="text-sm"><span className="font-medium">Notes:</span> {garden.notes}</p>
                <Link to={`/garden-details/${garden.id}`}>
                  <button className="btn btn-secondary text-sm mt-2">View Details</button>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
};

export default GardenDirectory;