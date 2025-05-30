// src/App.jsx
import React from "react";

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-blue-50 text-gray-900 flex flex-col items-center justify-center px-6 py-10">
      <img
        src="/logo.png"
        alt="PneumEvolve Sacred Spiral Logo"
        className="w-24 h-24 mb-4"
      />

      <div className="max-w-3xl text-center">
        <h1 className="text-5xl font-bold mb-4 tracking-tight">
          PneumEvolve
        </h1>
        <p className="text-xl text-gray-700 mb-8">
          A spiritual movement of remembrance — rooted in peace, creation, and unity. Everything we build — from tools to communities — is an extension of this sacred intention.
        </p>

        <div className="grid gap-4 w-full max-w-md mx-auto text-left">
          
          <a
            href="/dreammachine"
           className="block bg-white rounded-2xl shadow-md hover:shadow-xl transition p-5 border border-gray-200"
          >
           🌍 <strong>We Dream – The Dream Machine</strong> (Collective Vision Engine)
          </a>

          <a
            href="/SmartJournal"
            className="block bg-white rounded-2xl shadow-md hover:shadow-xl transition p-5 border border-gray-200"
          >
            🧠 <strong>I AM – Advanced Journal Prototype</strong> (Prototype 2.0)
          </a>

          <a
            href="/MealPlanning"
            className="block bg-white rounded-2xl shadow-md hover:shadow-xl transition p-5 border border-gray-200"
          >
            🛠 <strong>Life Tools</strong> – Homemade Meal Planner (Work in progress 🌱)
          </a>

          <a
            href="/wetalk"
            className="block bg-white rounded-2xl shadow-md hover:shadow-xl transition p-5 border border-gray-200"
          >
             <strong>We Talk</strong> – Shea's Homemade "Forum"
          </a>

          <a
            href="/experiments"
            className="block bg-white rounded-2xl shadow-md hover:shadow-xl transition p-5 border border-gray-200"
          >
            🧪 <strong>Shea’s Experiments</strong> – A Bunch Of Ideas Under Development
          </a>
        
          <a
            href="https://pneumevolve.github.io/dreamfire-gate"
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-white rounded-2xl shadow-md hover:shadow-xl transition p-5 border border-gray-200"
          >
            🔥 <strong>Dreamfire Gate</strong> – Enter the Codex
          </a>

          <a
            href="/themessage"
            className="block bg-white rounded-2xl shadow-md hover:shadow-xl transition p-5 border border-gray-200"
          >
            📜 <strong>The Message</strong> – From Shea and Lyra
          </a>
          
          <a
            href="#"
            className="block bg-white rounded-2xl shadow-md hover:shadow-xl transition p-5 border border-gray-200 opacity-50 cursor-not-allowed"
          >
            🛹 <strong>Freeskate Project</strong> – Movement Meets Freedom (Coming Soon)
          </a>
        
          <a
            href="/sheas-rambling-ideas"
            className="block bg-white rounded-2xl shadow-md hover:shadow-xl transition p-5 border border-gray-200"
          >
            ✍️ <strong>Shea’s Rambling Ideas</strong> – Basic Journal Prototype
          </a>
          
          </div>
          

        <p className="text-sm text-gray-500 mt-12">
          © {new Date().getFullYear()} PneumEvolve. Guided by Spirit, built with love.
        </p>
      </div>
    </div>
  );
}