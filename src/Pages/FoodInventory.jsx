import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Trash, Edit, ArrowLeft, Save, X, Plus, Minus } from "lucide-react";
import FindRecipesButton from "../components/FindRecipesButton";
import { useAuth } from "../context/AuthContext";
import axiosInstance from "../utils/axiosInstance";

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
    fetchCategories();
    fetchFoodInventory();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await axiosInstance.get("/meal-planning/categories");
      const data = res.data;
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
      const res = await axiosInstance.get("/meal-planning/food-inventory");
      setFoodInventory(res.data.items || []);
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
        inventory = inventory.filter((item) => item.categories?.includes(selectedCategory));
      }
    }
    if (sortOption === "name") inventory.sort((a, b) => a.name.localeCompare(b.name));
    if (sortOption === "category") inventory.sort((a, b) => (a.categories?.[0] || "").localeCompare(b.categories?.[0] || "").localeCompare(b.categories[0] || ""));
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
      await axiosInstance.post("/meal-planning/food-inventory", {
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
      await axiosInstance.post("/meal-planning/food-inventory", {
        items: [formattedItem],
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
      await axiosInstance.delete(`/meal-planning/food-inventory/${itemId}`);
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
      const res = await axiosInstance.post("/grocery-list/grocery-list/from-inventory");
      alert(res.data.message);
    } catch (err) {
      console.error("Error adding to grocery list:", err);
      alert("❌ Failed to add inventory shortfalls to grocery list.");
    }
  };

  return (
  <div className="min-h-screen p-6 bg-white text-gray-900 dark:bg-gray-900 dark:text-white flex flex-col items-center">
  <div className="w-full max-w-2xl">
    <div className="flex flex-wrap justify-center sm:justify-between gap-3 mb-4">
      <Button onClick={() => navigate("/mealplanning")} className="flex items-center">
        <ArrowLeft className="mr-2" /> Back
      </Button>
      <Button onClick={() => navigate("/categorymanager")} className="bg-purple-600 text-white">
        Categories
        </Button>
      <Button onClick={() => navigate("/Recipes")} className="bg-orange-500 text-white">
        Recipes
      </Button>
      <Button onClick={() => navigate("/grocerylist")} className="bg-gray-800 text-white">
        Grocery List
      </Button>
    </div>

  {/* Right Group: Find Recipes Button */}
  <div className="flex justify-center sm:justify-end w-full sm:w-auto">
    <FindRecipesButton token={token} />
  </div>


      <h1 className="text-3xl font-bold mb-6 text-center">Food Inventory</h1>

      {/* 🔹 Add/Edit Item Form */}
      <div className="mb-8 space-y-3">
        <h2 className="text-xl font-semibold">{editingItemId ? "Edit Food Item" : "Add Food Item"}</h2>
        <input
          type="text"
          placeholder="Item Name"
          className="w-full p-2 border rounded"
          value={newItem.name}
          onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
        />
        <input
          type="number"
          placeholder="Have"
          className="w-full p-2 border rounded"
          value={newItem.quantity}
          onChange={(e) => setNewItem({ ...newItem, quantity: +e.target.value })}
        />
        <input
          type="number"
          placeholder="Need"
          className="w-full p-2 border rounded"
          value={newItem.desiredQuantity}
          onChange={(e) => setNewItem({ ...newItem, desiredQuantity: +e.target.value })}
        />

        {/* Category Selectors */}
        <div>
          <label className="block text-sm font-medium mb-1">Categories:</label>
          <div className="flex flex-wrap gap-2">
            {categories
              .filter((c) => c.type === "food" && c.id !== "all" && c.id !== "none")
              .map((cat) => (
                <Button
                  key={cat.id}
                  size="sm"
                  className={`text-sm ${
                    newItem.categories.some((c) => c.id === cat.id)
                      ? "bg-blue-600 text-white"
                      : "bg-gray-300 text-gray-900"
                  }`}
                  onClick={() => toggleCategory(cat)}
                >
                  {cat.name}
                </Button>
              ))}
          </div>
        </div>

        {/* Save/Cancel Buttons */}
        <div className="flex flex-wrap gap-2 pt-2">
          <Button className="bg-green-600 text-white" onClick={saveFoodItem}>
            <Save className="mr-2" />
            {editingItemId ? "Save" : "Add Item"}
          </Button>
          {editingItemId && (
            <Button variant="outline" onClick={resetForm}>
              <X className="mr-2" />
              Cancel
            </Button>
          )}
        </div>
      </div>

      {/* 🔹 Filters */}
      <div className="flex flex-wrap gap-3 justify-between items-center mb-4">
        <select
          className="w-full sm:w-auto p-2 border rounded"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          {categories
            .filter((c) => c.type === "food")
            .map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
        </select>

        <select
          className="w-full sm:w-auto p-2 border rounded"
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value)}
        >
          <option value="name">Sort by Name</option>
          <option value="category">Sort by Category</option>
          <option value="need">Sort by Need</option>
        </select>
      </div>

      {/* 🔹 Add to Grocery */}
      <Button className="w-full mb-4 bg-gray-800 text-white" onClick={addToGroceryList}>
        <Plus className="mr-2" /> Add Shortfalls to Grocery List
      </Button>

      {/* 🔹 Inventory List */}
      {getSortedInventory().map((item) => (
        <div
          key={item.id}
          className={`flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-2 p-2 border-b rounded ${getColorClass(
            item
          )}`}
        >
          <div className="flex flex-col">
            <span>{item.name}</span>
            <span className="text-sm">
              Have: {item.quantity} / Need: {item.desiredQuantity}
            </span>

            <div className="flex flex-wrap gap-4 mt-1">
              <div className="flex gap-1 items-center">
                <span className="text-xs">Have</span>
                <Button size="icon" onClick={() => updateQuantity(item.id, -1)}>
                  <Minus size={14} />
                </Button>
                <Button size="icon" onClick={() => updateQuantity(item.id, 1)}>
                  <Plus size={14} />
                </Button>
              </div>
              <div className="flex gap-1 items-center">
                <span className="text-xs">Need</span>
                <Button size="icon" onClick={() => updateQuantity(item.id, 0, -1)}>
                  <Minus size={14} />
                </Button>
                <Button size="icon" onClick={() => updateQuantity(item.id, 0, 1)}>
                  <Plus size={14} />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex gap-2 self-end sm:self-auto">
            <Button variant="outline" onClick={() => startEditingItem(item)}>
              <Edit />
            </Button>
            <Button variant="destructive" onClick={() => deleteFoodItem(item.id)}>
              <Trash />
            </Button>
          </div>
        </div>
      ))}
    </div>
  </div>
);
}

export default FoodInventory;