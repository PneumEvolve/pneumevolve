import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const MealPlanningPage = () => {
  const navigate = useNavigate();

  return (
    <div className="p-6 bg-white text-gray-900 dark:bg-gray-900 dark:text-white flex flex-col items-center">
      <h1 className="text-3xl font-bold mb-6">🍽️ Meal Planning</h1>

      {/* 🔹 Navigation Buttons */}
      <div className="flex flex-col gap-3 w-full max-w-sm mb-8">
        <Button onClick={() => navigate("/")} className="bg-blue-600 text-white">
          🔙 Back to PneumEvolve
        </Button>
        <Button onClick={() => navigate("/categorymanager")} className="bg-purple-600 text-white">
          🗂️ Manage Categories
        </Button>
        <Button onClick={() => navigate("/foodinventory")} className="bg-green-600 text-white">
          🥕 Manage Food Inventory
        </Button>
        <Button onClick={() => navigate("/recipes")} className="bg-orange-500 text-white">
          📖 Go to Recipes
        </Button>
        <Button onClick={() => navigate("/grocerylist")} className="bg-gray-800 text-white">
          🛒 View Grocery List
        </Button>
      </div>

      {/* 🔹 Feature Overview */}
      <div className="w-full max-w-2xl mt-4 bg-gray-100 dark:bg-gray-800 p-6 rounded-xl shadow space-y-4">
        <h2 className="text-xl font-semibold">✅ Available Features</h2>
        <ul className="list-disc list-inside space-y-1 text-gray-800 dark:text-gray-300">
          <li>Category management for food and recipes</li>
          <li>Food inventory tracking with quantity and color indicators</li>
          <li>Manual and URL recipe creation and editing</li>
          <li>Grocery list builder from food items and recipes</li>
        </ul>

        <h2 className="text-xl font-semibold mt-6">🛠️ Upcoming Features</h2>
        <ul className="list-disc list-inside space-y-1 text-gray-800 dark:text-gray-300">
          <li>✨ AI-powered recipe suggestions based on current food inventory</li>
          <li>💰 Smart grocery list cost estimator with editable prices</li>
          <li>🔁 Weekly meal planner with portion control and repeat meals</li>
          <li>🌐 Community-shared recipes and seasonal suggestions</li>
        </ul>
      </div>

      <p className="mt-8 text-gray-500 text-sm italic">
        Sign in to unlock full access to features.
      </p>
    </div>
  );
};

export default MealPlanningPage;