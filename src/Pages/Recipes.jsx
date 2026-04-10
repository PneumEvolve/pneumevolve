// src/pages/Recipes.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Trash, Pencil, Save, X, Plus, Globe, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
 
export default function RecipesPage() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
 
  const [recipes, setRecipes] = useState([]);
  const [selectedRecipes, setSelectedRecipes] = useState({});
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [expandedRecipes, setExpandedRecipes] = useState({});
 
  useEffect(() => { fetchCategories(); }, []);
  useEffect(() => { fetchRecipes(); }, [selectedCategory]);
 
  const fetchCategories = async () => {
    try {
      const { data } = await api.get("/meal-planning/categories");
      setCategories(data.recipes || []);
    } catch (err) {
      if (err.response?.status !== 401) console.error("Error fetching categories:", err);
    }
  };
 
  const fetchRecipes = async () => {
    try {
      setRecipes([]);
      const endpoint = selectedCategory === "all"
        ? "/meal-planning/recipes"
        : `/meal-planning/recipes?category=${encodeURIComponent(selectedCategory)}`;
      const { data } = await api.get(endpoint);
      setRecipes(data);
    } catch (err) {
      if (err.response?.status !== 401) console.error("Error fetching recipes:", err);
    }
  };
 
  const handleImportRecipe = async () => {
    if (!importUrl.trim()) return;
    if (!isLoggedIn) { alert("You must be signed in to import recipes."); return; }
    setImporting(true);
    try {
      const { data } = await api.post("/meal-planning/recipes/import", { url: importUrl.trim() });
      setEditingRecipe({ name: data.name, ingredients: data.ingredients, instructions: data.instructions, category: "" });
    } catch (err) {
      alert("Error importing recipe: " + (err.response?.data?.detail || err.message || "Import failed"));
    } finally {
      setImporting(false);
      setImportUrl("");
    }
  };
 
  const deleteRecipe = async (recipeId) => {
    if (!isLoggedIn) { alert("You must be signed in to delete a recipe."); return; }
    try {
      await api.delete(`/meal-planning/recipes/${recipeId}`);
      fetchRecipes();
    } catch (err) {
      console.error("Error deleting recipe:", err);
      alert("Failed to delete recipe.");
    }
  };
 
  const toggleExpand = (id) => setExpandedRecipes((prev) => ({ ...prev, [id]: !prev[id] }));
 
  const crossCheckInventory = async () => {
    const selectedIds = Object.entries(selectedRecipes)
      .filter(([_, qty]) => qty > 0)
      .map(([id]) => Number(id));
    if (selectedIds.length === 0) { alert("Select at least one recipe."); return; }
    if (!isLoggedIn) { alert("Sign in to generate a grocery list."); return; }
    try {
      const { data } = await api.post("/grocery-list/from-recipes", selectedIds);
      alert(data.message || "✅ Items added to your grocery list.");
      navigate("/grocery-list");
    } catch (err) {
      console.error("Error generating grocery list:", err);
      alert("❌ Failed to generate grocery list.");
    }
  };
 
  const handleNewRecipe = () => {
    if (!isLoggedIn) { alert("You must be signed in to create recipes."); return; }
    setEditingRecipe({ name: "", ingredients: [], instructions: "", category: "" });
  };
 
  const updateRecipeField = (field, value) => setEditingRecipe((prev) => ({ ...prev, [field]: value }));
 
  const saveEditedRecipe = async () => {
    if (!isLoggedIn) { alert("You must be signed in to save recipes."); return; }
    try {
      const payload = {
        name: editingRecipe.name,
        ingredients: Array.isArray(editingRecipe.ingredients)
          ? editingRecipe.ingredients
          : editingRecipe.ingredients.split(",").map((i) => i.trim()),
        instructions: editingRecipe.instructions,
        category: editingRecipe.category,
      };
      if (editingRecipe.id) payload.id = editingRecipe.id;
      await api.post("/meal-planning/recipes", payload);
      await fetchRecipes();
      setEditingRecipe(null);
    } catch (err) {
      console.error("Error saving recipe:", err);
      alert("❌ Failed to save recipe.");
    }
  };
 
  const anySelected = Object.values(selectedRecipes).some((qty) => qty > 0);
 
  return (
    <main className="main p-6 space-y-6">
      {/* Slim top nav */}
      <nav className="flex items-center gap-3 flex-wrap text-sm">
        <button onClick={() => navigate("/meal-planning")} className="btn btn-secondary">← Meal Planning</button>
        <button onClick={() => navigate("/food-inventory")} className="btn btn-secondary">Inventory</button>
        <button onClick={() => navigate("/grocery-list")} className="btn btn-secondary">Grocery List</button>
      </nav>
 
      <div className="section-bar flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">📖 Recipes</h1>
        <button onClick={handleNewRecipe} className="btn">
          <Plus className="h-4 w-4 mr-1 inline" /> New recipe
        </button>
      </div>
 
      {/* Import from URL */}
      <section className="card space-y-3">
        <h2 className="font-semibold text-sm opacity-70 uppercase tracking-wide">Import from URL</h2>
        <div className="flex gap-2 flex-wrap">
          <input
            type="text"
            placeholder="Paste recipe URL…"
            value={importUrl}
            onChange={(e) => setImportUrl(e.target.value)}
            className="input flex-1 min-w-0"
          />
          <button
            onClick={handleImportRecipe}
            disabled={importing || !isLoggedIn}
            className="btn"
          >
            <Globe className="h-4 w-4 mr-1 inline" />
            {importing ? "Importing…" : "Import"}
          </button>
        </div>
      </section>
 
      {/* Filter + grocery list action */}
      <section className="flex flex-wrap gap-3 items-center">
        <select
          className="input w-auto"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          <option value="all">All categories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.name}>{cat.name}</option>
          ))}
        </select>
 
        <button
          onClick={crossCheckInventory}
          disabled={!isLoggedIn || !anySelected}
          className="btn btn-secondary ml-auto"
        >
          Generate grocery list from selected
        </button>
      </section>
 
      {/* Recipe list */}
      <section className="space-y-3">
        {recipes.length === 0 ? (
          <div className="card text-center opacity-60 text-sm">
            No recipes yet.{isLoggedIn ? " Add one above." : " Sign in to save recipes."}
          </div>
        ) : (
          recipes.map((recipe) => (
            <div key={recipe.id} className="card space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-lg truncate">{recipe.name}</h2>
                  {recipe.category && (
                    <span className="badge mt-1">{recipe.category}</span>
                  )}
                </div>
 
                <div className="flex flex-wrap gap-2 items-center shrink-0">
                  <input
                    type="number"
                    min="0"
                    value={selectedRecipes[recipe.id] || 0}
                    onChange={(e) => setSelectedRecipes((prev) => ({ ...prev, [recipe.id]: Number(e.target.value) }))}
                    className="input w-16 text-center"
                    title="Servings"
                  />
                  <button onClick={() => setEditingRecipe(recipe)} className="btn btn-secondary !px-2 !py-1"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => toggleExpand(recipe.id)} className="btn btn-secondary !px-2 !py-1">
                    {expandedRecipes[recipe.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <button onClick={() => deleteRecipe(recipe.id)} className="btn btn-secondary !px-2 !py-1 text-red-500"><Trash className="h-4 w-4" /></button>
                </div>
              </div>
 
              {expandedRecipes[recipe.id] && (
                <div className="text-sm opacity-80 space-y-1 pt-1 border-t" style={{ borderColor: "var(--border)" }}>
                  <p><span className="font-medium">Ingredients:</span> {Array.isArray(recipe.ingredients) ? recipe.ingredients.join(", ") : recipe.ingredients}</p>
                  <p className="mt-1 whitespace-pre-wrap">{recipe.instructions}</p>
                </div>
              )}
            </div>
          ))
        )}
      </section>
 
      {/* Full-screen editor overlay */}
      {editingRecipe && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-6" style={{ background: "var(--bg)" }}>
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="section-bar flex items-center justify-between">
              <h2 className="font-semibold">{editingRecipe.id ? "Edit recipe" : "New recipe"}</h2>
              <button onClick={() => setEditingRecipe(null)} className="btn btn-secondary !px-2 !py-1"><X className="h-4 w-4" /></button>
            </div>
 
            <input
              className="input w-full"
              placeholder="Recipe name"
              value={editingRecipe.name}
              onChange={(e) => updateRecipeField("name", e.target.value)}
            />
            <textarea
              className="input w-full"
              rows={4}
              placeholder="Ingredients (comma-separated)"
              value={Array.isArray(editingRecipe.ingredients) ? editingRecipe.ingredients.join(", ") : editingRecipe.ingredients}
              onChange={(e) => updateRecipeField("ingredients", e.target.value)}
            />
            <textarea
              className="input w-full"
              rows={6}
              placeholder="Instructions"
              value={editingRecipe.instructions}
              onChange={(e) => updateRecipeField("instructions", e.target.value)}
            />
 
            <div>
              <label className="text-sm font-medium opacity-70 block mb-1">Category</label>
              <select
                className="input w-full"
                value={editingRecipe.category || ""}
                onChange={(e) => updateRecipeField("category", e.target.value)}
              >
                <option value="">None</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </div>
 
            <div className="flex gap-2">
              <button onClick={saveEditedRecipe} className="btn">
                <Save className="h-4 w-4 mr-1 inline" /> Save
              </button>
              <button onClick={() => setEditingRecipe(null)} className="btn btn-secondary">
                <X className="h-4 w-4 mr-1 inline" /> Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}