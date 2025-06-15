import React, { useState } from "react";
import { Link } from "react-router-dom";

const GardenBlitz = () => {
  const [selectedForm, setSelectedForm] = useState(null);

  const handleFormToggle = (formType) => {
    setSelectedForm((prev) => (prev === formType ? null : formType));
  };

  const renderForm = (formType) => (
    <form className="space-y-4 mt-4">
      <input
        type="text"
        placeholder="Your Name"
        className="w-full p-2 border rounded"
      />
      <input
        type="email"
        placeholder="Email Address"
        className="w-full p-2 border rounded"
      />
      <textarea
        placeholder={
          formType.includes("host")
            ? "Tell us about your garden needs..."
            : "Why do you want to volunteer?"
        }
        className="w-full p-2 border rounded"
        rows={4}
      />
      <button
        type="submit"
        className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700"
      >
        Submit
      </button>
    </form>
  );

  return (
    <div className="min-h-screen p-6 bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold text-center">🌱 Garden Blitz Vernon</h1>
        <p className="text-center text-lg">
          We're organizing fast garden builds & long-term support for Vernon residents. Join as a host or volunteer!
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div
            onClick={() => handleFormToggle("blitz-host")}
            className="cursor-pointer bg-green-100 dark:bg-green-800 p-6 rounded-2xl shadow hover:shadow-lg text-center"
          >
            <h2 className="text-2xl font-semibold">🌿 Blitz Garden Host</h2>
            <p>Need a garden built in a day? Register to be part of our next blitz event!</p>
            {selectedForm === "blitz-host" && renderForm("blitz-host")}
          </div>

          <div
            onClick={() => handleFormToggle("blitz-volunteer")}
            className="cursor-pointer bg-blue-100 dark:bg-blue-800 p-6 rounded-2xl shadow hover:shadow-lg text-center"
          >
            <h2 className="text-2xl font-semibold">💪 Blitz Volunteer</h2>
            <p>Help build a garden in one day! Join the blitz crew.</p>
            {selectedForm === "blitz-volunteer" && renderForm("blitz-volunteer")}
          </div>

          <div
            onClick={() => handleFormToggle("long-host")}
            className="cursor-pointer bg-green-200 dark:bg-green-700 p-6 rounded-2xl shadow hover:shadow-lg text-center"
          >
            <h2 className="text-2xl font-semibold">🌻 Long-Term Host</h2>
            <p>Need ongoing garden support and community connection? Sign up here.</p>
            {selectedForm === "long-host" && renderForm("long-host")}
          </div>

          <div
            onClick={() => handleFormToggle("long-volunteer")}
            className="cursor-pointer bg-blue-200 dark:bg-blue-700 p-6 rounded-2xl shadow hover:shadow-lg text-center"
          >
            <h2 className="text-2xl font-semibold">🌾 Long-Term Volunteer</h2>
            <p>Grow with us! Join our seasonal garden team.</p>
            {selectedForm === "long-volunteer" && renderForm("long-volunteer")}
          </div>
        </div>

        <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-2xl shadow mt-6">
          <h3 className="text-xl font-semibold mb-2">How It Works</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>Pick your role and submit your info</li>
            <li>We coordinate volunteers and hosts</li>
            <li>We run blitz events and long-term support groups</li>
            <li>Earn New SEED tokens for participating!</li>
          </ul>
        </div>

        <div className="text-center mt-8">
          <Link
            to="/gardendirectory"
            className="inline-block bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-sm font-medium px-5 py-3 rounded-xl shadow hover:shadow-md transition"
          >
            🌍 View the Garden Directory
          </Link>
        </div>

        <p className="text-center italic text-sm text-gray-500 pt-4">
          A PneumEvolve project. Powered by people, guided by Earth.
        </p>
      </div>
    </div>
  );
};

export default GardenBlitz;