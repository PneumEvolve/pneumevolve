import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

import {
  ArrowLeft,
  Trash,
  Pencil,
  Save,
  X,
  Plus,
  Globe,
  Eye,
  EyeOff,
} from "lucide-react";

const API_URL = "https://shea-klipper-backend.onrender.com";

const RecipesPage = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [recipes, setRecipes] = useState([]);
  const [selectedRecipes, setSelectedRecipes] = useState({});
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [expandedRecipes, setExpandedRecipes] = useState({});

  useEffect(() => {
    if (!token) {
      navigate("/");
      return;
    }
    fetchCategories();
  }, [navigate]);

  useEffect(() => {
    fetchRecipes();
  }, [selectedCategory]);

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_URL}/meal-planning/categories`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setCategories(data.recipes || []);
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
  };

  const fetchRecipes = async () => {
    try {
      setRecipes([]);
      const url =
        selectedCategory === "all"
          ? `${API_URL}/meal-planning/recipes`
          : `${API_URL}/meal-planning/recipes?category=${encodeURIComponent(selectedCategory)}`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setRecipes(data);
    } catch (error) {
      console.error("Error fetching recipes:", error);
    }
  };

  const handleImportRecipe = async () => {
    if (!importUrl.trim()) return;
    setImporting(true);

    try {
      const res = await fetch(`${API_URL}/meal-planning/recipes/import`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ url: importUrl.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Import failed");

      setEditingRecipe({
        name: data.name,
        ingredients: data.ingredients,
        instructions: data.instructions,
        category: "",
      });
    } catch (err) {
      alert("Error importing recipe: " + err.message);
    } finally {
      setImporting(false);
      setImportUrl("");
    }
  };

  const deleteRecipe = async (recipeId) => {
    try {
      await fetch(`${API_URL}/meal-planning/recipes/${recipeId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchRecipes();
    } catch (error) {
      console.error("Error deleting recipe:", error);
    }
  };

  const toggleExpand = (id) => {
    setExpandedRecipes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const crossCheckInventory = async () => {
  const selectedIds = Object.entries(selectedRecipes)
    .filter(([_, qty]) => qty > 0)
    .map(([id]) => Number(id));

  if (selectedIds.length === 0) {
    alert("Please select at least one recipe.");
    return;
  }

  try {
    const response = await fetch(`${API_URL}/grocery-list/from-recipes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(selectedIds),
    });

    if (!response.ok) throw new Error("Failed to generate grocery list");

    const data = await response.json();
    alert(data.message || "✅ Items added to your grocery list.");
    navigate("/grocerylist");
  } catch (error) {
    console.error("Error generating grocery list:", error);
    alert("❌ Failed to generate grocery list.");
  }
};

  const handleNewRecipe = () => {
    setEditingRecipe({
      name: "",
      ingredients: [],
      instructions: "",
      category: "",
    });
  };

  const updateRecipeField = (field, value) => {
    setEditingRecipe((prev) => ({ ...prev, [field]: value }));
  };

  const saveEditedRecipe = async () => {
    try {
      const payload = {
        ...editingRecipe,
        id: editingRecipe.id,
        ingredients: Array.isArray(editingRecipe.ingredients)
          ? editingRecipe.ingredients
          : editingRecipe.ingredients.split(",").map((i) => i.trim()),
      };

      const response = await fetch(`${API_URL}/meal-planning/recipes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Failed to save recipe");

      await fetchRecipes();
      setEditingRecipe(null);
    } catch (err) {
      console.error("Error saving recipe:", err);
    }
  };

  const renderFullScreenEditor = () => {
    if (!editingRecipe) return null;

    return (
      <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900 overflow-y-auto p-6">
        <h2 className="text-2xl font-bold mb-4">
          {editingRecipe.id ? "Edit Recipe" : "New Recipe"}
        </h2>
        <input
          className="w-full p-2 border rounded-lg mb-2"
          placeholder="Recipe Name"
          value={editingRecipe.name}
          onChange={(e) => updateRecipeField("name", e.target.value)}
        />
        <textarea
          className="w-full p-2 border rounded-lg mb-2"
          rows={4}
          placeholder="Ingredients (comma-separated)"
          value={
            Array.isArray(editingRecipe.ingredients)
              ? editingRecipe.ingredients.join(", ")
              : editingRecipe.ingredients
          }
          onChange={(e) => updateRecipeField("ingredients", e.target.value)}
        />
        <textarea
          className="w-full p-2 border rounded-lg mb-4"
          rows={6}
          placeholder="Instructions"
          value={editingRecipe.instructions}
          onChange={(e) => updateRecipeField("instructions", e.target.value)}
        />
        <label className="block text-sm font-medium mb-1">Category:</label>
        <select
          className="w-full p-2 border rounded-lg mb-4"
          value={editingRecipe.category || ""}
          onChange={(e) => updateRecipeField("category", e.target.value)}
        >
          <option value="">None</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.name}>
              {cat.name}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <Button onClick={saveEditedRecipe}>
            <Save className="mr-2" /> Save
          </Button>
          <Button variant="outline" onClick={() => setEditingRecipe(null)}>
            <X className="mr-2" /> Cancel
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen p-6 bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-4">
                  <Button onClick={() => navigate("/mealplanning")} className="flex items-center">
                    <ArrowLeft className="mr-2" /> Back to Meal Planning
                  </Button>
                  <Button onClick={() => navigate("/categorymanager")} className="ml-2">
                    Manage Categories
                  </Button>
                </div>

        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-4 gap-2">
          <h1 className="text-3xl font-bold">Your Recipes</h1>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleNewRecipe}>
              <Plus className="mr-2" /> New Recipe
            </Button>
            <input
              type="text"
              placeholder="Paste recipe URL..."
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              className="p-2 border rounded-lg text-black dark:text-white w-full max-w-xs"
            />
            <Button onClick={handleImportRecipe} disabled={importing}>
              <Globe className="mr-2" /> {importing ? "Importing..." : "Import from Link"}
            </Button>
          </div>
        </div>

        <label className="block text-sm font-medium mb-1">Filter by Category:</label>
        <select
          className="w-full p-2 border rounded-lg mb-4"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          <option value="all">All</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.name}>
              {cat.name}
            </option>
          ))}
        </select>

        <Button
          className="mb-4"
          onClick={crossCheckInventory}
          disabled={Object.keys(selectedRecipes).length === 0}
        >
          Generate Grocery List from Selected
        </Button>

        <div className="space-y-4">
          {recipes.map((recipe) => (
            <div
              key={recipe.id}
              className="p-4 border rounded-lg bg-gray-100 dark:bg-gray-800"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-semibold">{recipe.name}</h2>
                  {recipe.category && (
                    <p className="text-xs text-gray-400 mt-1">Category: {recipe.category}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    value={selectedRecipes[recipe.id] || 0}
                    onChange={(e) =>
                      setSelectedRecipes((prev) => ({
                        ...prev,
                        [recipe.id]: Number(e.target.value),
                      }))
                    }
                    className="w-16 p-1 border rounded"
                  />
                  <Button variant="outline" onClick={() => setEditingRecipe(recipe)}>
                    <Pencil />
                  </Button>
                  <Button variant="outline" onClick={() => toggleExpand(recipe.id)}>
                    {expandedRecipes[recipe.id] ? <EyeOff /> : <Eye />}
                  </Button>
                  <Button variant="destructive" onClick={() => deleteRecipe(recipe.id)}>
                    <Trash />
                  </Button>
                </div>
              </div>
              {expandedRecipes[recipe.id] && (
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    Ingredients: {recipe.ingredients.join(", ")}
                  </p>
                  <p className="mt-2">{recipe.instructions}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {renderFullScreenEditor()}
      </div>
    </div>
  );
};

export default RecipesPage;