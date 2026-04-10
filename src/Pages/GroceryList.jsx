// src/pages/GroceryList.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Save, Trash, Check, X, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
 
export default function GroceryList() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
 
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState({ name: "", quantity: 1 });
  const [loading, setLoading] = useState(true);
 
  useEffect(() => {
    if (!isLoggedIn) {
      setLoading(false);
      return;
    }
    fetchList();
  }, [isLoggedIn]);
 
  const fetchList = async () => {
    try {
      const res = await api.get("/grocery-list/grocery-list");
      setItems(res.data?.items ?? []);
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
 
  const toggleChecked = (index) => updateItem(index, { checked: !items[index].checked });
 
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
    if (!window.confirm("Clear the entire grocery list?")) return;
    try {
      const res = await api.delete("/grocery-list/grocery-list/grocery-list/clear");
      alert(res.data.message);
      setItems([]);
    } catch (err) {
      console.error("Failed to clear grocery list:", err);
      alert("❌ Error clearing grocery list.");
    }
  };
 
  const checkedCount = items.filter((i) => i.checked).length;
 
  return (
    <main className="main p-6 space-y-6">
      {/* Slim top nav */}
      <nav className="flex items-center gap-3 flex-wrap text-sm">
        <button onClick={() => navigate("/meal-planning")} className="btn btn-secondary">← Meal Planning</button>
        <button onClick={() => navigate("/food-inventory")} className="btn btn-secondary">Inventory</button>
        <button onClick={() => navigate("/recipes")} className="btn btn-secondary">Recipes</button>
      </nav>
 
      <div className="section-bar flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">🛒 Grocery List</h1>
        {items.length > 0 && (
          <span className="badge">{checkedCount}/{items.length} in cart</span>
        )}
      </div>
 
      {/* Add item */}
      {isLoggedIn && (
        <section className="card flex gap-2 flex-wrap">
          <input
            type="text"
            placeholder="Item name"
            value={newItem.name}
            onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && addItem()}
            className="input flex-1 min-w-0"
          />
          <input
            type="number"
            value={newItem.quantity}
            onChange={(e) => setNewItem({ ...newItem, quantity: Number(e.target.value) })}
            className="input w-20 text-center"
          />
          <button onClick={addItem} className="btn">
            <Plus className="h-4 w-4 mr-1 inline" /> Add
          </button>
        </section>
      )}
 
      {/* Bulk actions */}
      {isLoggedIn && items.length > 0 && (
        <section className="flex flex-wrap gap-3">
          <button
            onClick={importToInventory}
            disabled={checkedCount === 0}
            className="btn btn-secondary"
          >
            <Save className="h-4 w-4 mr-1 inline" /> Import checked to inventory
          </button>
          <button onClick={clearGroceryList} className="btn btn-secondary text-red-500">
            <Trash className="h-4 w-4 mr-1 inline" /> Clear all
          </button>
        </section>
      )}
 
      {/* List */}
      <section className="space-y-2">
        {!isLoggedIn ? (
          <div className="card text-center opacity-60 text-sm">
            Sign in to manage your grocery list.
          </div>
        ) : loading ? (
          <div className="card text-center opacity-60 text-sm">Loading…</div>
        ) : items.length === 0 ? (
          <div className="card text-center opacity-60 text-sm">
            No items yet — add one above or generate from recipes/inventory.
          </div>
        ) : (
          items.map((item, index) => (
            <div
              key={item.id}
              className={`card flex items-center gap-3 transition-opacity ${item.checked ? "opacity-50" : ""}`}
            >
              <button
                onClick={() => toggleChecked(index)}
                className={`shrink-0 h-6 w-6 rounded-full border-2 flex items-center justify-center transition ${
                  item.checked
                    ? "bg-green-500 border-green-500 text-white"
                    : "border-[var(--border)] hover:border-green-400"
                }`}
              >
                {item.checked && <Check className="h-3.5 w-3.5" />}
              </button>
 
              <p className={`flex-1 font-medium ${item.checked ? "line-through" : ""}`}>
                {item.name}
                <span className="text-sm opacity-50 ml-2">×{item.quantity}</span>
              </p>
 
              <button
                onClick={() => deleteItem(index)}
                className="btn btn-secondary !px-2 !py-1 text-red-500 shrink-0"
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