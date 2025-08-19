import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Trash, ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";

const CategoryManager = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState("");
  const [categoryType, setCategoryType] = useState("food");

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await api.get("/meal-planning/categories");

      const data = res.data;
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

    const duplicate = categories.some(
      (cat) => cat.name === newCategory && cat.type === categoryType
    );
    if (duplicate) {
      alert("Category already exists!");
      return;
    }

    try {
      await api.post("/meal-planning/categories", {
        categories: [newCategory],
        type: categoryType,
      });
      setNewCategory("");
      fetchCategories();
    } catch (error) {
      console.error("Error adding category:", error);
    }
  };

  const deleteCategory = async (categoryId) => {
    try {
      await api.delete(`/meal-planning/categories/${categoryId}`);
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
    <div className="flex flex-wrap justify-center sm:justify-between gap-3 mb-4">
      <Button onClick={() => navigate("/mealplanning")} className="flex items-center">
        <ArrowLeft className="mr-2" /> Back
      </Button>
      <Button onClick={() => navigate("/FoodInventory")} className="bg-green-600 text-white">
        Food Inventory
      </Button>
      <Button onClick={() => navigate("/Recipes")} className="bg-orange-500 text-white">
        Recipes
      </Button>
      <Button onClick={() => navigate("/grocerylist")} className="bg-gray-800 text-white">
        Grocery List
      </Button>
    </div>

        <h1 className="text-3xl font-bold mb-6 text-center">Category Manager</h1>

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