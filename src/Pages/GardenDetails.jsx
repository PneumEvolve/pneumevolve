// GardenDetails.jsx
import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";

const GardenDetails = () => {
  const { id } = useParams();
  const [garden, setGarden] = useState(null);
  const [volunteers, setVolunteers] = useState([]);
  const [formData, setFormData] = useState({ name: "", email: "", message: "" });
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    // Fetch garden details and volunteers (replace with Supabase calls)
    setGarden({
      id,
      hostName: "Jamie R.",
      location: "East Hill",
      description: "Looking for help building raised beds on May 25th",
    });
    setVolunteers([
      { id: 1, name: "Alex V.", email: "alex@email.com", message: "Love gardening!", approved: false },
    ]);
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Submit to Supabase here
    setSubmitted(true);
  };

  const approveVolunteer = (volunteerId) => {
    // Update volunteer approval in Supabase
    setVolunteers((prev) =>
      prev.map((v) => (v.id === volunteerId ? { ...v, approved: true } : v))
    );
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {garden && (
          <>
            <h1 className="text-3xl font-bold">Garden by {garden.hostName}</h1>
            <p><strong>Location:</strong> {garden.location}</p>
            <p>{garden.description}</p>
          </>
        )}

        <h2 className="text-2xl font-semibold mt-8">Apply to Volunteer</h2>
        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input name="name" value={formData.name} onChange={handleChange} placeholder="Your Name" className="w-full p-2 border rounded" required />
            <input name="email" value={formData.email} onChange={handleChange} placeholder="Email Address" className="w-full p-2 border rounded" required />
            <textarea name="message" value={formData.message} onChange={handleChange} placeholder="Tell the host a bit about yourself..." className="w-full p-2 border rounded" rows={4} required />
            <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded">Submit</button>
          </form>
        ) : (
          <p className="text-green-500">Thank you for applying! The host will contact you soon.</p>
        )}

        <h2 className="text-2xl font-semibold mt-8">Volunteer Requests</h2>
        <ul className="space-y-4">
          {volunteers.map((vol) => (
            <li key={vol.id} className="p-4 border rounded bg-gray-100 dark:bg-gray-800">
              <p><strong>Name:</strong> {vol.name}</p>
              <p><strong>Email:</strong> {vol.email}</p>
              <p><strong>Message:</strong> {vol.message}</p>
              <p><strong>Status:</strong> {vol.approved ? "✅ Approved" : "⏳ Pending"}</p>
              {!vol.approved && (
                <button onClick={() => approveVolunteer(vol.id)} className="mt-2 bg-blue-600 text-white px-4 py-2 rounded">
                  Approve
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default GardenDetails;
