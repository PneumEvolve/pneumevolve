import React from "react";
import { useNavigate } from "react-router-dom";

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-blue-50 px-4 py-6 flex flex-col items-center text-gray-900">
      {/* Header */}
      <div className="w-full max-w-md text-center space-y-4 mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold">🌱 PneumEvolve</h1>
        <p className="text-lg sm:text-xl text-gray-700 leading-snug">
          <strong>Let’s heal the world together.</strong><br />
          Name what needs fixing. Join others to solve it.
        </p>
      </div>

      {/* Main CTA: Share a Problem */}
      <div className="w-full max-w-md space-y-4 text-center">
        <p className="text-base sm:text-lg font-medium">
          💬 What’s the biggest problem you see in the world right now?
        </p>
        <button
          onClick={() => navigate("/submit")}
          className="w-full bg-blue-600 text-white text-base py-3 rounded-lg shadow hover:bg-blue-700 transition"
        >
          Share a Problem
        </button>
      </div>

      {/* Divider */}
      <div className="w-full max-w-md border-t mt-10 pt-8 space-y-6">
        {/* Explore Problems */}
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold">🔥 Community Priorities</h2>
          <p className="text-sm text-gray-600">
            These are the problems the community is focused on solving right now.
          </p>
          <button
            onClick={() => navigate("/problems")}
            className="text-blue-600 font-medium hover:underline"
          >
            Explore Problems →
          </button>
        </div>

        {/* Lyra Teaser */}
        <div className="text-center space-y-2 border-t pt-8">
          <h2 className="text-lg font-semibold">✨ Need help expressing yourself?</h2>
          <p className="text-sm text-gray-600">
            Talk to Lyra, our AI. She’ll help you phrase and reflect.
          </p>
          <button
            onClick={() => navigate("/lyra")}
            className="w-full bg-gray-800 text-white py-3 rounded shadow hover:bg-gray-700"
          >
            Talk to Lyra
          </button>
        </div>

        {/* Reputation Preview */}
        <div className="text-center space-y-2 border-t pt-8">
          <h2 className="text-base font-semibold">🧬 Reputation is Coming</h2>
          <p className="text-sm text-gray-500">
            The more you participate, the more you grow. PneumEvolve recognizes your impact — not with money, but with meaning.
          </p>
        </div>
      </div>
    </div>
  );
}