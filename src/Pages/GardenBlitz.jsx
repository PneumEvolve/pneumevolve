import React, { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";

const GardenBlitz = () => {
  const [selectedForm, setSelectedForm] = useState(null);
  const [formData, setFormData] = useState({ name: "", email: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleFormToggle = (formType) => {
    setSelectedForm((prev) => (prev === formType ? null : formType));
    setFormData({ name: "", email: "", message: "" });
    setSubmitted(false);
  };

  const handleInputChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/gardens", {
        type: selectedForm.includes("blitz") ? "Blitz" : "Ongoing",
        host_name: formData.name,
        location: "Vernon, BC",
        description: selectedForm.includes("host") ? "Garden Host Application" : "Volunteer Application",
        notes: formData.message,
        status: "Pending",
      });
      setSubmitted(true);
    } catch (err) {
      alert("Error submitting form: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const renderForm = (formType) => (
    <form onSubmit={handleSubmit} className="space-y-3 mt-4">
      <input type="text" name="name" value={formData.name} onChange={handleInputChange}
        placeholder="Your Name" required />
      <input type="email" name="email" value={formData.email} onChange={handleInputChange}
        placeholder="Email Address" required />
      <textarea name="message" value={formData.message} onChange={handleInputChange} rows={4}
        placeholder={formType.includes("host") ? "Tell us about your garden needs..." : "Why do you want to volunteer?"}
        required />
      <button type="submit" disabled={submitting} className="btn">
        {submitting ? "Submitting..." : "Submit"}
      </button>
      {submitted && <p className="text-sm" style={{ color: "var(--muted)" }}>Submitted successfully!</p>}
    </form>
  );

  const cards = [
    { key: "blitz-host", emoji: "🌿", title: "Blitz Garden Host", desc: "Need a garden built in a day? Register to be part of our next blitz event!" },
    { key: "blitz-volunteer", emoji: "💪", title: "Blitz Volunteer", desc: "Help build a garden in one day! Join the blitz crew." },
    { key: "long-host", emoji: "🌻", title: "Long-Term Host", desc: "Need ongoing garden support and community connection? Sign up here." },
    { key: "long-volunteer", emoji: "🌾", title: "Long-Term Volunteer", desc: "Grow with us! Join our seasonal garden team." },
  ];

  return (
    <main className="min-h-screen" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <div className="max-w-4xl mx-auto px-6 py-12 space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-3">🌱 Garden Blitz Vernon</h1>
          <p className="text-base" style={{ color: "var(--muted)", lineHeight: 1.7 }}>
            Organizing fast garden builds and long-term support for Vernon residents.
            Join as a host or volunteer!
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {cards.map(({ key, emoji, title, desc }) => (
            <div key={key} className="card p-5">
              <h2 className="text-lg font-semibold mb-2">{emoji} {title}</h2>
              <p className="text-sm mb-4" style={{ color: "var(--muted)", lineHeight: 1.6 }}>{desc}</p>
              <button onClick={() => handleFormToggle(key)} className="btn btn-secondary text-sm">
                {selectedForm === key ? "Close Form" : "Open Form"}
              </button>
              {selectedForm === key && renderForm(key)}
            </div>
          ))}
        </div>

        <div className="card p-5">
          <h3 className="text-base font-semibold mb-3">How It Works</h3>
          <ul className="text-sm space-y-2" style={{ color: "var(--muted)" }}>
            <li>• Pick your role and submit your info</li>
            <li>• We coordinate volunteers and hosts</li>
            <li>• We run blitz events and long-term support groups</li>
            <li>• Earn SEED tokens for participating!</li>
          </ul>
        </div>

        <div className="text-center">
          <Link to="/garden-directory" className="btn btn-secondary">
            🌍 View the Garden Directory
          </Link>
        </div>

        <p className="text-center text-xs" style={{ color: "var(--muted)" }}>
          A PneumEvolve project. Powered by people, guided by Earth.
        </p>
      </div>
    </main>
  );
};

export default GardenBlitz;