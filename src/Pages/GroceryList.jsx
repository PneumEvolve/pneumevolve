import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { ArrowLeft, Save, Trash, Check, X, Plus } from "lucide-react";


const API_URL = "https://shea-klipper-backend.onrender.com";

const GroceryList = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [items, setItems] = useState([]);
  const [listId, setListId] = useState(null);
  const [newItem, setNewItem] = useState({ name: "", quantity: 1 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  fetchList();
}, []);

  const fetchList = async () => {
    try {
      const res = await fetch(`${API_URL}/grocery-list/grocery-list`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      setItems(data.items);
      setListId(data.id);
    } catch (err) {
      console.error("Error fetching grocery list:", err);
    } finally {
      setLoading(false);
    }
  };

  const addItem = async () => {
    if (!newItem.name.trim()) return;
    try {
      const res = await fetch(`${API_URL}/grocery-list/grocery-list/item`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newItem),
      });
      const data = await res.json();
      setItems((prev) => [...prev, data.item]);
      setNewItem({ name: "", quantity: 1 });
    } catch (err) {
      console.error("Failed to add item:", err);
    }
  };

  const updateItem = async (index, updates) => {
    const item = { ...items[index], ...updates };
    try {
      await fetch(`${API_URL}/grocery-list/grocery-list/item/${item.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(item),
      });
      const updated = [...items];
      updated[index] = item;
      setItems(updated);
    } catch (err) {
      console.error("Error updating item:", err);
    }
  };

  const importToInventory = async () => {
  try {
    const res = await fetch(`${API_URL}/grocery-list/grocery-list/import-to-inventory`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to import");

    const data = await res.json();
    alert("✅ " + data.message);
    fetchList(); // refresh the grocery list
  } catch (err) {
    console.error("Import failed:", err);
    alert("❌ Could not import to inventory.");
  }
};

  const deleteItem = async (index) => {
    const item = items[index];
    try {
      await fetch(`${API_URL}/grocery-list/grocery-list/item/${item.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setItems(items.filter((_, i) => i !== index));
    } catch (err) {
      console.error("Error deleting item:", err);
    }
  };

  const toggleChecked = (index) => {
    updateItem(index, { checked: !items[index].checked });
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
