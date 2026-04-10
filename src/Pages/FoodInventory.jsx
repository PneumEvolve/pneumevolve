// src/pages/FoodInventory.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Trash, Edit, Save, X, Plus, Minus } from "lucide-react";
import FindRecipesButton from "@/components/FindRecipesButton";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
 
export default function FoodInventory() {
  const navigate = useNavigate();
  const { accessToken, isLoggedIn } = useAuth();
 
  const [foodInventory, setFoodInventory] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [newItem, setNewItem] = useState({ name: "", quantity: 1, desiredQuantity: 1, categories: [] });
  const [editingItemId, setEditingItemId] = useState(null);
  const [sortOption, setSortOption] = useState("name");
 
  useEffect(() => {
    fetchCategories();
    fetchFoodInventory();
  }, []);
 
  const fetchCategories = async () => {
    try {
      const res = await api.get("/meal-planning/categories");
      const data = res.data;
      const combined = [
        { id: "none", name: "No Category", type: "food" },
        { id: "all", name: "All", type: "food" },
        ...data.food.map((cat) => ({ ...cat, type: "food" })),
        ...data.recipes.map((cat) => ({ ...cat, type: "recipe" })),
      ];
      setCategories(combined);
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
  };
 
  const fetchFoodInventory = async () => {
    try {
      const res = await api.get("/meal-planning/food-inventory");
      setFoodInventory(res.data?.items ?? []);
    } catch (err) {
      console.error("Error fetching inventory:", err);
    }
  };
 
  const getStatusClass = (item) => {
    if (item.quantity === 0) return "border-l-4 border-red-500";
    if (item.quantity < item.desiredQuantity) return "border-l-4 border-yellow-400";
    if (item.quantity >= item.desiredQuantity) return "border-l-4 border-green-500";
    return "";
  };
 
  const getSortedInventory = () => {
    let inventory = [...foodInventory];
    if (selectedCategory !== "all") {
      if (selectedCategory === "none") {
        inventory = inventory.filter((item) => item.categories.length === 0);
      } else {
        inventory = inventory.filter((item) => item.categories?.includes(selectedCategory));
      }
    }
    if (sortOption === "name") inventory.sort((a, b) => a.name.localeCompare(b.name));
    if (sortOption === "need") inventory.sort((a, b) => (b.desiredQuantity - b.quantity) - (a.desiredQuantity - a.quantity));
    return inventory;
  };
 
  const updateQuantity = async (itemId, delta = 0, desiredDelta = 0) => {
    const item = foodInventory.find((i) => i.id === itemId);
    const updatedItem = {
      ...item,
      quantity: item.quantity + delta,
      desiredQuantity: item.desiredQuantity + desiredDelta,
    };
    try {
      await api.post("/meal-planning/food-inventory", {
        items: [{ ...updatedItem, categories: updatedItem.categories.map(String) }],
      });
      fetchFoodInventory();
    } catch (err) {
      console.error("Failed to update quantity:", err);
    }
  };
 
  const saveFoodItem = async () => {
    if (!newItem.name.trim()) return;
    const formattedItem = {
      id: editingItemId || undefined,
      name: newItem.name.trim(),
      quantity: newItem.quantity,
      desiredQuantity: newItem.desiredQuantity,
      categories: newItem.categories.map((c) => String(c.id)),
    };
    try {
      await api.post("/meal-planning/food-inventory", { items: [formattedItem] });
      fetchFoodInventory();
      resetForm();
    } catch (err) {
      console.error("Error saving item:", err);
    }
  };
 
  const resetForm = () => {
    setEditingItemId(null);
    setNewItem({ name: "", quantity: 1, desiredQuantity: 1, categories: [] });
  };
 
  const startEditingItem = (item) => {
    const selectedCats = categories.filter((cat) => item.categories.includes(cat.id));
    setNewItem({
      name: item.name,
      quantity: item.quantity,
      desiredQuantity: item.desiredQuantity,
      categories: selectedCats,
    });
    setEditingItemId(item.id);
  };
 
  const deleteFoodItem = async (itemId) => {
    try {
      await api.delete(`/meal-planning/food-inventory/${itemId}`);
      fetchFoodInventory();
    } catch (err) {
      console.error("Error deleting item:", err);
    }
  };
 
  const toggleCategory = (category) => {
    setNewItem((prev) => {
      const exists = prev.categories.some((c) => c.id === category.id);
      return {
        ...prev,
        categories: exists
          ? prev.categories.filter((c) => c.id !== category.id)
          : [...prev.categories, category],
      };
    });
  };
 
  const addToGroceryList = async () => {
    try {
      const res = await api.post("/grocery-list/grocery-list/from-inventory");
      alert(res.data.message);
    } catch (err) {
      console.error("Error adding to grocery list:", err);
      alert("❌ Failed to add inventory shortfalls to grocery list.");
    }
  };
 
  const sorted = getSortedInventory();
 
  return (
    <main className="main p-6 space-y-6">
      {/* Slim top nav */}
      <nav className="flex items-center gap-3 flex-wrap text-sm">
        <button onClick={() => navigate("/meal-planning")} className="btn btn-secondary">
          ← Meal Planning
        </button>
        <button onClick={() => navigate("/recipes")} className="btn btn-secondary">Recipes</button>
        <button onClick={() => navigate("/grocery-list")} className="btn btn-secondary">Grocery List</button>
        <span className="ml-auto">
          <FindRecipesButton token={accessToken} />
        </span>
      </nav>
 
      <div className="section-bar">
        <h1 className="text-2xl font-bold">🥕 Food Inventory</h1>
      </div>
 
      {/* Add / Edit form */}
      <section className="card space-y-4">
        <h2 className="font-semibold">{editingItemId ? "Edit item" : "Add item"}</h2>
 
        <div className="grid sm:grid-cols-3 gap-3">
          <input
            type="text"
            placeholder="Item name"
            className="input col-span-full sm:col-span-1"
            value={newItem.name}
            onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
          />
          <div className="flex flex-col gap-1">
  <label className="text-xs opacity-60 font-medium">Have</label>
  <input
    type="number"
    className="input"
    value={newItem.quantity}
    onChange={(e) => setNewItem({ ...newItem, quantity: +e.target.value })}
  />
</div>
<div className="flex flex-col gap-1">
  <label className="text-xs opacity-60 font-medium">Need(Total)</label>
  <input
    type="number"
    className="input"
    value={newItem.desiredQuantity}
    onChange={(e) => setNewItem({ ...newItem, desiredQuantity: +e.target.value })}
  />
</div>
        </div>
 
        {/* Category toggles */}
        <div>
          <p className="text-sm font-medium mb-2 opacity-70">Categories</p>
          <div className="flex flex-wrap gap-2">
            {categories
              .filter((c) => c.type === "food" && c.id !== "all" && c.id !== "none")
              .map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => toggleCategory(cat)}
                  className={`badge cursor-pointer transition ${
                    newItem.categories.some((c) => c.id === cat.id)
                      ? "opacity-100 ring-2 ring-offset-1"
                      : "opacity-50 hover:opacity-80"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
          </div>
        </div>
 
        <div className="flex gap-2">
          <button onClick={saveFoodItem} className="btn">
            <Save className="h-4 w-4 mr-1 inline" />
            {editingItemId ? "Save" : "Add item"}
          </button>
          {editingItemId && (
            <button onClick={resetForm} className="btn btn-secondary">
              <X className="h-4 w-4 mr-1 inline" /> Cancel
            </button>
          )}
        </div>
      </section>
 
      {/* Filters + actions */}
      <section className="flex flex-wrap gap-3 items-center">
        <select
          className="input w-auto"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          {categories.filter((c) => c.type === "food").map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
 
        <select
          className="input w-auto"
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value)}
        >
          <option value="name">Sort: Name</option>
          <option value="need">Sort: Most needed</option>
        </select>
 
        <button onClick={addToGroceryList} className="btn btn-secondary ml-auto">
          <Plus className="h-4 w-4 mr-1 inline" /> Add shortfalls to grocery list
        </button>
      </section>
 
      {/* Legend */}
      <div className="flex gap-4 text-xs opacity-60">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Out</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" /> Low</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Stocked</span>
      </div>
 
      {/* Inventory list */}
      <section className="space-y-2">
        {sorted.length === 0 ? (
          <div className="card text-center opacity-60 text-sm">No items yet — add one above.</div>
        ) : (
          sorted.map((item) => (
            <div key={item.id} className={`card flex flex-col sm:flex-row sm:items-center gap-3 ${getStatusClass(item)}`}>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{item.name}</p>
                <p className="text-sm opacity-60">Have {item.quantity} · Need {item.desiredQuantity}</p>
              </div>
 
              {/* Quantity controls */}
              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <span className="opacity-50 text-xs">Have</span>
                  <button onClick={() => updateQuantity(item.id, -1)} className="btn btn-secondary !px-2 !py-1"><Minus className="h-3 w-3" /></button>
                  <button onClick={() => updateQuantity(item.id, 1)}  className="btn btn-secondary !px-2 !py-1"><Plus  className="h-3 w-3" /></button>
                </div>
                <div className="flex items-center gap-1">
                  <span className="opacity-50 text-xs">Need</span>
                  <button onClick={() => updateQuantity(item.id, 0, -1)} className="btn btn-secondary !px-2 !py-1"><Minus className="h-3 w-3" /></button>
                  <button onClick={() => updateQuantity(item.id, 0,  1)} className="btn btn-secondary !px-2 !py-1"><Plus  className="h-3 w-3" /></button>
                </div>
              </div>
 
              {/* Edit / delete */}
              <div className="flex gap-2 shrink-0">
                <button onClick={() => startEditingItem(item)} className="btn btn-secondary !px-2 !py-1"><Edit className="h-4 w-4" /></button>
                <button onClick={() => deleteFoodItem(item.id)} className="btn btn-secondary !px-2 !py-1 text-red-500"><Trash className="h-4 w-4" /></button>
              </div>
            </div>
          ))
        )}
      </section>
    </main>
  );
}