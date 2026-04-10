// src/pages/CategoryManager.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Trash } from "lucide-react";
import { api } from "@/lib/api";
 
export default function CategoryManager() {
  const navigate = useNavigate();
 
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState("");
  const [categoryType, setCategoryType] = useState("food");
 
  useEffect(() => { fetchCategories(); }, []);
 
  const fetchCategories = async () => {
    try {
      const res = await api.get("/meal-planning/categories");
      const data = res.data;
      const combined = [
        ...data.food.map((cat) => ({ ...cat, type: "food" })),
        ...data.recipes.map((cat) => ({ ...cat, type: "recipe" })),
      ];
      setCategories(combined);
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
  };
 
  const addCategory = async () => {
    if (!newCategory.trim()) return;
    const duplicate = categories.some((cat) => cat.name === newCategory && cat.type === categoryType);
    if (duplicate) { alert("Category already exists!"); return; }
    try {
      await api.post("/meal-planning/categories", {
        categories: [newCategory],
        type: categoryType,
      });
      setNewCategory("");
      fetchCategories();
    } catch (err) {
      console.error("Error adding category:", err);
    }
  };
 
  const deleteCategory = async (categoryId) => {
    try {
      await api.delete(`/meal-planning/categories/${categoryId}`);
      fetchCategories();
    } catch (err) {
      console.error("Error deleting category:", err);
    }
  };
 
  const foodCategories = categories.filter((c) => c.type === "food");
  const recipeCategories = categories.filter((c) => c.type === "recipe");
 
  return (
    <main className="main p-6 space-y-6">
      {/* Slim top nav */}
      <nav className="flex items-center gap-3 text-sm">
        <button onClick={() => navigate("/meal-planning")} className="btn btn-secondary">← Meal Planning</button>
      </nav>
 
      <div className="section-bar">
        <h1 className="text-2xl font-bold">🗂️ Category Manager</h1>
      </div>
 
      {/* Add form */}
      <section className="card space-y-3">
        <h2 className="font-semibold">Add category</h2>
        <div className="flex gap-2 flex-wrap">
          <input
            type="text"
            placeholder="Category name"
            className="input flex-1 min-w-0"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCategory()}
          />
          <select
            className="input w-auto"
            value={categoryType}
            onChange={(e) => setCategoryType(e.target.value)}
          >
            <option value="food">Food</option>
            <option value="recipe">Recipe</option>
          </select>
          <button onClick={addCategory} className="btn">Add</button>
        </div>
      </section>
 
      {/* Food categories */}
      <section className="space-y-2">
        <div className="section-bar">
          <h2 className="font-semibold">Food categories</h2>
        </div>
        {foodCategories.length === 0 ? (
          <div className="card text-center opacity-60 text-sm">No food categories yet.</div>
        ) : (
          foodCategories.map((cat) => (
            <div key={cat.id} className="card flex items-center justify-between gap-3">
              <span>{cat.name}</span>
              <button
                onClick={() => deleteCategory(cat.id)}
                className="btn btn-secondary !px-2 !py-1 text-red-500"
              >
                <Trash className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </section>
 
      {/* Recipe categories */}
      <section className="space-y-2">
        <div className="section-bar">
          <h2 className="font-semibold">Recipe categories</h2>
        </div>
        {recipeCategories.length === 0 ? (
          <div className="card text-center opacity-60 text-sm">No recipe categories yet.</div>
        ) : (
          recipeCategories.map((cat) => (
            <div key={cat.id} className="card flex items-center justify-between gap-3">
              <span>{cat.name}</span>
              <button
                onClick={() => deleteCategory(cat.id)}
                className="btn btn-secondary !px-2 !py-1 text-red-500"
              >
                <Trash className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </section>
    </main>
  );
}