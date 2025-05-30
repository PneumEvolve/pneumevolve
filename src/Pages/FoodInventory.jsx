import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Trash, Edit, ArrowLeft, Save, X, Plus, Minus } from "lucide-react";
import FindRecipesButton from "../components/FindRecipesButton";
import { useAuth } from "../context/AuthContext";


const API_URL = "https://shea-klipper-backend.onrender.com";

const isTokenExpired = (token) => {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000 < Date.now();
  } catch (error) {
    return true;
  }
};

const FoodInventory = () => {
  const navigate = useNavigate();
  const { token } = useAuth(); 

  const [foodInventory, setFoodInventory] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [newItem, setNewItem] = useState({ name: "", quantity: 1, desiredQuantity: 1, categories: [] });
  const [editingItemId, setEditingItemId] = useState(null);
  const [sortOption, setSortOption] = useState("name");

  useEffect(() => {
  if (token && !isTokenExpired(token)) {
    fetchCategories();
    fetchFoodInventory();
  } else {
    // You can choose to fetch public data or just show read-only UI
    fetchCategories();
    fetchFoodInventory(); // If you allow guests to see food data
  }
}, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_URL}/meal-planning/categories`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const combined = [
        { id: "none", name: "No Category", type: "food" },
        { id: "all", name: "All", type: "food" },
        ...data.food.map((cat) => ({ ...cat, type: "food" })),
        ...data.recipes.map((cat) => ({ ...cat, type: "recipe" })),
      ];
      setCategories(combined);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchFoodInventory = async () => {
    try {
      const res = await fetch(`${API_URL}/meal-planning/food-inventory`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setFoodInventory(data.items || []);
    } catch (error) {
      console.error("Error fetching inventory:", error);
    }
  };

  const getColorClass = (item) => {
    if (item.quantity === 0) return "bg-red-100 text-red-800";
    if (item.quantity < item.desiredQuantity) return "bg-yellow-100 text-yellow-800";
    if (item.quantity === item.desiredQuantity) return "bg-green-100 text-green-800";
    return "";
  };

  const getSortedInventory = () => {
    let inventory = [...foodInventory];
    if (selectedCategory !== "all") {
      if (selectedCategory === "none") {
        inventory = inventory.filter((item) => item.categories.length === 0);
      } else {
        inventory = inventory.filter((item) => item.categories.includes(selectedCategory));
      }
    }
    if (sortOption === "name") inventory.sort((a, b) => a.name.localeCompare(b.name));
    if (sortOption === "category") inventory.sort((a, b) => (a.categories[0] || "").localeCompare(b.categories[0] || ""));
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
      await fetch(`${API_URL}/meal-planning/food-inventory`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ items: [{ ...updatedItem, categories: updatedItem.categories.map(String) }] }),
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
      await fetch(`${API_URL}/meal-planning/food-inventory`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ items: [formattedItem] }),
      });
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
      await fetch(`${API_URL}/meal-planning/food-inventory/${itemId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
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
      const res = await fetch(`${API_URL}/grocery-list/grocery-list/from-inventory`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      alert(data.message);
    } catch (err) {
      console.error("Error adding to grocery list:", err);
      alert("❌ Failed to add inventory shortfalls to grocery list.");
    }
  };

return (
  <div className="min-h-screen p-6 bg-white text-gray-900 dark:bg-gray-900 dark:text-white flex flex-col items-center">
    <div className="w-full max-w-2xl">
      {/* Header Buttons */}
      <div className="flex flex-wrap gap-2 justify-center sm:justify-between items-center mb-4">
        <Button onClick={() => navigate("/mealplanning")} className="w-full sm:w-auto flex items-center justify-center">
          <ArrowLeft className="mr-2" /> Back
        </Button>
        <Button onClick={() => navigate("/categorymanager")} className="w-full sm:w-auto">Manage Categories</Button>
        <div className="w-full sm:w-auto">
          <FindRecipesButton token={token} />
        </div>
      </div>

      <h1 className="text-3xl font-bold mb-6 text-center">Food Inventory</h1>

      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-2">{editingItemId ? "Edit Food Item" : "Add Food Item"}</h2>
        <input type="text" placeholder="Item Name" className="w-full p-2 border rounded" value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} />
        <input type="number" className="w-full p-2 border rounded mt-2" placeholder="Have" value={newItem.quantity} onChange={(e) => setNewItem({ ...newItem, quantity: +e.target.value })} />
        <input type="number" className="w-full p-2 border rounded mt-2" placeholder="Need" value={newItem.desiredQuantity} onChange={(e) => setNewItem({ ...newItem, desiredQuantity: +e.target.value })} />

        <div className="mt-2">
          <label className="block text-sm font-medium">Categories:</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {categories.filter((c) => c.type === "food" && c.id !== "all" && c.id !== "none").map((cat) => (
              <Button
                key={cat.id}
                size="sm"
                className={`text-sm ${newItem.categories.some((c) => c.id === cat.id) ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-900"}`}
                onClick={() => toggleCategory(cat)}
              >
                {cat.name}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          <Button className="w-full sm:w-auto" onClick={saveFoodItem}>
            <Save className="mr-2" />{editingItemId ? "Save" : "Add Item"}
          </Button>
          {editingItemId && (
            <Button className="w-full sm:w-auto" variant="outline" onClick={resetForm}>
              <X className="mr-2" />Cancel
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 justify-between items-center mb-4">
        <select className="w-full sm:w-auto p-2 border rounded" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
          {categories.filter((c) => c.type === "food").map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>

        <select className="w-full sm:w-auto p-2 border rounded" value={sortOption} onChange={(e) => setSortOption(e.target.value)}>
          <option value="name">Sort by Name</option>
          <option value="category">Sort by Category</option>
          <option value="need">Sort by Need</option>
        </select>
      </div>

      <Button className="w-full mb-4" onClick={addToGroceryList}>
        <Plus className="mr-2" /> Add Shortfalls to Grocery List
      </Button>

      {getSortedInventory().map((item) => (
        <div key={item.id} className={`flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-2 p-2 border-b rounded ${getColorClass(item)}`}>
          <div className="flex flex-col">
            <span>{item.name}</span>
            <span className="text-sm">Have: {item.quantity} / Need: {item.desiredQuantity}</span>
            <div className="flex flex-wrap gap-4 mt-1">
              <div className="flex gap-1 items-center">
                <span className="text-xs">Have</span>
                <Button size="icon" onClick={() => updateQuantity(item.id, -1)}><Minus size={14} /></Button>
                <Button size="icon" onClick={() => updateQuantity(item.id, 1)}><Plus size={14} /></Button>
              </div>
              <div className="flex gap-1 items-center">
                <span className="text-xs">Need</span>
                <Button size="icon" onClick={() => updateQuantity(item.id, 0, -1)}><Minus size={14} /></Button>
                <Button size="icon" onClick={() => updateQuantity(item.id, 0, 1)}><Plus size={14} /></Button>
              </div>
            </div>
          </div>
          <div className="flex gap-2 self-end sm:self-auto">
            <Button variant="outline" onClick={() => startEditingItem(item)}><Edit /></Button>
            <Button variant="destructive" onClick={() => deleteFoodItem(item.id)}><Trash /></Button>
          </div>
        </div>
      ))}
    </div>
  </div>
);
};

export default FoodInventory;
