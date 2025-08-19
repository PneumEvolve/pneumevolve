import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { api } from "@/lib/api"
import { useAuth } from "../context/AuthContext";

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


const isTokenExpired = (token) => {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
};

const RecipesPage = () => {
  const navigate = useNavigate();
  const { isLoggedIn, accessToken: token } = useAuth();

  const [recipes, setRecipes] = useState([]);
  const [selectedRecipes, setSelectedRecipes] = useState({});
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [expandedRecipes, setExpandedRecipes] = useState({});

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchRecipes();
  }, [selectedCategory]);

  const fetchCategories = async () => {
  try {
    const { data } = await api.get("/meal-planning/categories");
    setCategories(data.recipes || []);
  } catch (err) {
    if (err.response?.status === 401) {
      console.warn("Unauthorized access to categories, showing limited view");
    } else {
      console.error("Error fetching categories:", err);
    }
  }
};

  const fetchRecipes = async () => {
  try {
    setRecipes([]);
    const endpoint =
      selectedCategory === "all"
        ? "/meal-planning/recipes"
        : `/meal-planning/recipes?category=${encodeURIComponent(selectedCategory)}`;

    const { data } = await api.get(endpoint);
    setRecipes(data);
  } catch (error) {
    if (error.response?.status === 401) {
      console.warn("Unauthorized access to recipes, showing limited view");
    } else {
      console.error("Error fetching recipes:", error);
    }
  }
};

  const handleImportRecipe = async () => {
  if (!importUrl.trim()) return;
  if (!isLoggedIn) {
    alert("You must be logged in to import recipes.");
    return;
  }
  setImporting(true);

  try {
    const { data } = await api.post("/meal-planning/recipes/import", {
      url: importUrl.trim(),
    });

    setEditingRecipe({
      name: data.name,
      ingredients: data.ingredients,
      instructions: data.instructions,
      category: "",
    });
  } catch (err) {
    const message = err.response?.data?.detail || err.message || "Import failed";
    alert("Error importing recipe: " + message);
  } finally {
    setImporting(false);
    setImportUrl("");
  }
};

  const deleteRecipe = async (recipeId) => {
  if (!isLoggedIn) {
    alert("You must be logged in to delete a recipe.");
    return;
  }
  try {
    await api.delete(`/meal-planning/recipes/${recipeId}`);
    fetchRecipes(); // Refresh list after deletion
  } catch (error) {
    console.error("Error deleting recipe:", error);
    alert("Failed to delete recipe.");
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

  if (!isLoggedIn) {
    alert("Login required to generate grocery list.");
    return;
  }

  try {
    const { data } = await api.post("/grocery-list/from-recipes", selectedIds);
    alert(data.message || "✅ Items added to your grocery list.");
    navigate("/grocerylist");
  } catch (error) {
    console.error("Error generating grocery list:", error);
    alert("❌ Failed to generate grocery list.");
  }
};

  const handleNewRecipe = () => {
    if (!isLoggedIn) {
      alert("You must be logged in to create or edit recipes.");
      return;
    }
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
  if (!isLoggedIn) {
    alert("You must be logged in to create or edit recipes.");
    return;
  }

  try {
    const payload = {
      name: editingRecipe.name,
      ingredients: Array.isArray(editingRecipe.ingredients)
        ? editingRecipe.ingredients
        : editingRecipe.ingredients.split(",").map((i) => i.trim()),
      instructions: editingRecipe.instructions,
      category: editingRecipe.category,
    };

    if (editingRecipe.id) {
      payload.id = editingRecipe.id;
    }

    await api.post("/meal-planning/recipes", payload);
    await fetchRecipes();
    setEditingRecipe(null);
  } catch (err) {
    console.error("Error saving recipe:", err);
    alert("❌ Failed to save recipe.");
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
    <div className="flex flex-wrap justify-center sm:justify-between items-center gap-3 mb-4">
      <Button onClick={() => navigate("/mealplanning")} className="flex items-center">
        <ArrowLeft className="mr-2" /> Back
      </Button>
      
      <Button onClick={() => navigate("/categorymanager")} className="bg-purple-600 text-white">
        Categories
      </Button>
      
      <Button onClick={() => navigate("/FoodInventory")} className="bg-green-600 text-white">
        Food Inventory
      </Button>

      
      <Button onClick={() => navigate("/grocerylist")} className="bg-gray-800 text-white">
          Grocery List
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
            <Button onClick={handleImportRecipe} disabled={importing || !isLoggedIn}>
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
          className="mb-4 bg-gray-800 text-white"
          onClick={crossCheckInventory}
          disabled={!isLoggedIn || Object.keys(selectedRecipes).length === 0}
        >
          Generate Grocery List from Selected
        </Button>

        <div className="space-y-4">
  {recipes.map((recipe) => (
    <div
      key={recipe.id}
      className="p-4 border rounded-lg bg-gray-100 dark:bg-gray-800"
    >
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
        {/* Left Side: Name + Category */}
        <div>
          <h2 className="text-xl font-semibold">{recipe.name}</h2>
          {recipe.category && (
            <p className="text-xs text-gray-400 mt-1">
              Category: {recipe.category}
            </p>
          )}
        </div>

        {/* Right Side: Input + Buttons */}
        <div className="flex flex-wrap gap-2 items-center justify-start sm:justify-end">
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
            className="w-20 p-1 border rounded"
          />
          <Button variant="yellow" onClick={() => setEditingRecipe(recipe)}>
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
