import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { ArrowLeft, Save, Trash, Check, X, Plus } from "lucide-react";
import axiosInstance from "../utils/axiosInstance";
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
      const res = await axiosInstance.get("/grocery-list/grocery-list");
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
      const res = await axiosInstance.post("/grocery-list/grocery-list/item", newItem);
      setItems((prev) => [...prev, res.data.item]);
      setNewItem({ name: "", quantity: 1 });
    } catch (err) {
      console.error("Failed to add item:", err);
    }
  };

  const updateItem = async (index, updates) => {
    const item = { ...items[index], ...updates };
    try {
      await axiosInstance.put(`/grocery-list/grocery-list/item/${item.id}`, item);
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
      await axiosInstance.delete(`/grocery-list/grocery-list/item/${item.id}`);
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
      const res = await axiosInstance.post("/grocery-list/grocery-list/import-to-inventory");
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
      const res = await axiosInstance.delete("/grocery-list/grocery-list/grocery-list/clear");
      alert(res.data.message);
      setItems([]);
    } catch (err) {
      console.error("Failed to clear grocery list:", err);
      alert("❌ Error clearing grocery list.");
    }
  };

  return (
    <div className="min-h-screen p-6 bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
      <Button onClick={() => navigate("/mealplanning")} className="mb-6 flex items-center">
        <ArrowLeft className="mr-2" /> Back to Meal Planning
      </Button>
      <Button
        className="mb-4 bg-green-600 text-white"
        onClick={importToInventory}
        disabled={!items.some(item => item.checked)}
      >
        <Plus className="mr-2" /> Import In-Cart Items to Food Inventory
      </Button>
      <Button
        className="mb-4 bg-red-600 text-white ml-4"
        onClick={clearGroceryList}
      >
        <Trash className="mr-2" /> Clear Entire List
      </Button>

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
                <Button onClick={() => toggleChecked(index)}>
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