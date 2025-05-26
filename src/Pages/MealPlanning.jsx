import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";


const MealPlanningPage = () => {
  const navigate = useNavigate();

  return (
    <div className="p-6 bg-white text-gray-900 dark:bg-gray-900 dark:text-white flex flex-col items-center">
      <h1 className="text-3xl font-bold mb-6">Meal Planning</h1>

      {/* 🔹 Navigation Buttons */}
      <Button onClick={() => navigate("/")} className="bg-blue-600 text-white px-4 py-2 rounded-md mb-4">
        Back to Dashboard
      </Button>
      <Button onClick={() => navigate("/categorymanager")} className="bg-purple-600 text-white px-4 py-2 rounded-md mb-4">
        Manage Categories
      </Button>
      <Button onClick={() => navigate("/foodinventory")} className="bg-green-600 text-white px-4 py-2 rounded-md">
        Manage Food Inventory
      </Button>
      <Button onClick={() => navigate("/recipes")} className="bg-orange-500 text-white px-4 py-2 rounded-md">
      Go to Recipes
      </Button>
      <Button onClick={() => navigate("/grocerylist")} className="mb-4">
      🛒 View Grocery List
      </Button>

      {/* Placeholder for Future Features */}
      <p className="mt-6 text-gray-500">Sign in to use features.</p>
    </div>
  );
};

export default MealPlanningPage;