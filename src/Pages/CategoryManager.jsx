import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Trash, ArrowLeft } from "lucide-react";


const API_URL = "https://shea-klipper-backend.onrender.com";

const CategoryManager = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState("");
  const [categoryType, setCategoryType] = useState("food");

  useEffect(() => {
    if (!token) {
      console.error("No token found, redirecting to login.");
      navigate("/");
      return;
    }
    fetchCategories();
  }, [navigate]);

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_URL}/meal-planning/categories`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error(`Failed to fetch categories: ${res.statusText}`);

      const data = await res.json();
const combined = [
  ...data.food.map((cat) => ({ ...cat, type: "food" })),
  ...data.recipes.map((cat) => ({ ...cat, type: "recipe" })),
];
setCategories(combined);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const addCategory = async () => {
    if (!newCategory.trim()) return;
    if (categories.some((cat) => cat.name === newCategory && cat.type === categoryType)) {
      alert("Category already exists!");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/meal-planning/categories`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ categories: [newCategory], type: categoryType }),
      });

      if (!response.ok) throw new Error(`Failed to add category: ${response.statusText}`);

      fetchCategories();
      setNewCategory("");
    } catch (error) {
      console.error("Error adding category:", error);
    }
  };

  const deleteCategory = async (categoryId) => {
    try {
      const response = await fetch(`${API_URL}/meal-planning/categories/${categoryId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error(`Failed to delete category: ${response.statusText}`);

      fetchCategories();
    } catch (error) {
      console.error("Error deleting category:", error);
    }
  };

  const foodCategories = categories.filter((c) => c.type === "food");
  const recipeCategories = categories.filter((c) => c.type === "recipe");

  return (
    <div className="min-h-screen p-6 bg-white text-gray-900 dark:bg-gray-900 dark:text-white flex flex-col items-center">
      <div className="w-full max-w-2xl">
        <div className="flex justify-between items-center mb-4">
                  <Button onClick={() => navigate("/mealplanning")} className="flex items-center">
                    <ArrowLeft className="mr-2" /> Back to Meal Planning
                  </Button>
                  <Button onClick={() => navigate("/FoodInventory")} className="ml-2">
                    Food Inventory
                  </Button>
                  <Button onClick={() => navigate("/Recipes")} className="ml-2">
                    Recipes
                  </Button>
                </div>

        <h1 className="text-3xl font-bold mb-6 text-center">Category Manager</h1>

        {/* Add Category */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold">Add Category</h2>
          <div className="flex gap-2 mt-2">
            <input
              type="text"
              placeholder="New Category"
              className="w-full p-2 border rounded-lg"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
            />
            <select
              className="p-2 border rounded-lg"
              value={categoryType}
              onChange={(e) => setCategoryType(e.target.value)}
            >
              <option value="food">Food</option>
              <option value="recipe">Recipe</option>
            </select>
            <Button onClick={addCategory}>Add</Button>
          </div>
        </div>

        {/* Food Categories */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Food Categories</h2>
          {foodCategories.map((category) => (
            <div key={category.id} className="flex justify-between items-center p-2 border-b">
              <span>{category.name}</span>
              <Button size="sm" variant="destructive" onClick={() => deleteCategory(category.id)}>
                <Trash className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>

        {/* Recipe Categories */}
        <div>
          <h2 className="text-xl font-semibold mb-2">Recipe Categories</h2>
          {recipeCategories.map((category) => (
            <div key={category.id} className="flex justify-between items-center p-2 border-b">
              <span>{category.name}</span>
              <Button size="sm" variant="destructive" onClick={() => deleteCategory(category.id)}>
                <Trash className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CategoryManager;