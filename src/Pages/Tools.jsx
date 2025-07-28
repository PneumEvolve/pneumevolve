import React from "react";
import { Link } from "react-router-dom";

export default function Tools() {
  return (
    <div className="max-w-3xl mx-auto py-10 px-4 space-y-6">
      <h1 className="text-4xl font-bold text-center">🛠️ My Tools</h1>
      <p className="text-center text-gray-600">
        Organize your thoughts, meals, and projects all in one place.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Link
          to="/journal"
          className="bg-white shadow-md p-6 rounded-xl hover:shadow-lg transition duration-200 text-center"
        >
          <h2 className="text-xl font-semibold mb-2">📝 Journal</h2>
          <p className="text-gray-500 text-sm">Capture your thoughts, dreams, and reflections.</p>
        </Link>

        <Link
          to="/MealPlanning"
          className="bg-white shadow-md p-6 rounded-xl hover:shadow-lg transition duration-200 text-center"
        >
          <h2 className="text-xl font-semibold mb-2">🍽️ Meal Planner</h2>
          <p className="text-gray-500 text-sm">Plan your meals and manage your food inventory.</p>
        </Link>

        <Link
          to="/projects"
          className="bg-white shadow-md p-6 rounded-xl hover:shadow-lg transition duration-200 text-center"
        >
          <h2 className="text-xl font-semibold mb-2">📁 Project Manager</h2>
          <p className="text-gray-500 text-sm">Track ideas, tasks, and creative projects.</p>
        </Link>
      </div>
    </div>
  );
}