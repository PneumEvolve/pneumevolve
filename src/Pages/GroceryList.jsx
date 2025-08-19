import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { ArrowLeft, Save, Trash, Check, X, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "../context/AuthContext";

const GroceryList = () => {
  const navigate = useNavigate();
  const { accessToken: token, isLoggedIn } = useAuth();

  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState({ name: "", quantity: 1 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !isLoggedIn) {
      console.log("User not logged in, showing read-only grocery list.");
      setLoading(false);
    } else {
      fetchList();
    }
  }, []);

  const fetchList = async () => {
    try {
      const res = await api.get("/grocery-list/grocery-list");
      setItems(res.data.items);
    } catch (err) {
      console.error("Error fetching grocery list:", err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const addItem = async () => {
    if (!newItem.name.trim()) return;
    try {
      const res = await api.post("/grocery-list/grocery-list/item", newItem);
      setItems((prev) => [...prev, res.data.item]);
      setNewItem({ name: "", quantity: 1 });
    } catch (err) {
      console.error("Failed to add item:", err);
    }
  };

  const updateItem = async (index, updates) => {
    const item = { ...items[index], ...updates };
    try {
      await api.put(`/grocery-list/grocery-list/item/${item.id}`, item);
      const updated = [...items];
      updated[index] = item;
      setItems(updated);
    } catch (err) {
      console.error("Error updating item:", err);
    }
  };

  const deleteItem = async (index) => {
    const item = items[index];
    try {
      await api.delete(`/grocery-list/grocery-list/item/${item.id}`);
      setItems(items.filter((_, i) => i !== index));
    } catch (err) {
      console.error("Error deleting item:", err);
    }
  };

  const toggleChecked = (index) => {
    updateItem(index, { checked: !items[index].checked });
  };

  const importToInventory = async () => {
    try {
      const res = await api.post("/grocery-list/grocery-list/import-to-inventory");
      alert("✅ " + res.data.message);
      fetchList();
    } catch (err) {
      console.error("Import failed:", err);
      alert("❌ Could not import to inventory.");
    }
  };

  const clearGroceryList = async () => {
    if (!window.confirm("Are you sure you want to clear the entire grocery list?")) return;
    try {
      const res = await api.delete("/grocery-list/grocery-list/grocery-list/clear");
      alert(res.data.message);
      setItems([]);
    } catch (err) {
      console.error("Failed to clear grocery list:", err);
      alert("❌ Error clearing grocery list.");
    }
  };

  return (
    <div className="min-h-screen p-6 bg-white text-gray-900 dark:bg-gray-900 dark:text-white flex flex-col items-center">
  <div className="w-full max-w-2xl">
    <div className="flex flex-wrap justify-center sm:justify-between gap-3 mb-4">
      <Button onClick={() => navigate("/mealplanning")} className="flex items-center">
        <ArrowLeft className="mr-2" /> Back
      </Button>
      <Button onClick={() => navigate("/foodinventory")} className="bg-green-600 text-white">
          Food Inventory
        </Button>
      <Button onClick={() => navigate("/categorymanager")} className="bg-purple-600 text-white">
        Categories
        </Button>
      <Button onClick={() => navigate("/Recipes")} className="bg-orange-500 text-white">
        Recipes
      </Button>
    
    </div>
    </div>

  {/* 🛒 Action Buttons */}
  <div className="flex flex-col sm:flex-row flex-wrap gap-3 mb-6">
    <Button
      className="bg-green-600 text-white w-full sm:w-auto"
      onClick={importToInventory}
      disabled={!items.some(item => item.checked)}
    >
      <Plus className="mr-2" /> Import In-Cart Items to Food Inventory
    </Button>

    <Button
      className="bg-red-600 text-white w-full sm:w-auto"
      onClick={clearGroceryList}
    >
      <Trash className="mr-2" /> Clear Entire List
    </Button>
  </div>


      <h1 className="text-3xl font-bold mb-4">🛒 Grocery List</h1>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Item name"
          value={newItem.name}
          onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
          className="p-2 border rounded w-full"
        />
        <input
          type="number"
          value={newItem.quantity}
          onChange={(e) => setNewItem({ ...newItem, quantity: Number(e.target.value) })}
          className="p-2 border rounded w-24"
        />
        <Button onClick={addItem}>
          <Plus />
        </Button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : items.length === 0 ? (
        <p>No items in grocery list yet.</p>
      ) : (
        <div className="space-y-4">
          {items.map((item, index) => (
            <div
              key={item.id}
              className={`p-4 rounded border flex justify-between items-center transition-colors duration-300 ${
                item.checked ? "bg-green-100 dark:bg-green-800" : "bg-red-100 dark:bg-red-800"
              }`}
            >
              <div className="flex-1">
                <p className="text-lg font-medium">
                  {item.name} - {item.quantity}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
  onClick={() => toggleChecked(index)}
  variant={item.checked ? "destructive" : "green"}
>
  {item.checked ? <X /> : <Check />}
</Button>
                <Button onClick={() => deleteItem(index)} variant="destructive">
                  <Trash />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GroceryList;