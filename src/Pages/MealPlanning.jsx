// src/pages/MealPlanning.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { ShoppingCart, UtensilsCrossed, BookOpen, Tag } from "lucide-react";
 
export default function MealPlanning() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
 
  const [counts, setCounts] = useState({ inventory: null, recipes: null, grocery: null });
 
  useEffect(() => {
    if (!isLoggedIn) return;
    const fetchCounts = async () => {
      try {
        const [invRes, recRes, groRes] = await Promise.allSettled([
          api.get("/meal-planning/food-inventory"),
          api.get("/meal-planning/recipes"),
          api.get("/grocery-list/grocery-list"),
        ]);
        setCounts({
          inventory: invRes.status === "fulfilled" ? (invRes.value.data?.items?.length ?? 0) : null,
          recipes:   recRes.status === "fulfilled" ? (recRes.value.data?.length ?? 0) : null,
          grocery:   groRes.status === "fulfilled" ? (groRes.value.data?.items?.length ?? 0) : null,
        });
      } catch {
        // counts stay null — cards still render, just without numbers
      }
    };
    fetchCounts();
  }, [isLoggedIn]);
 
  const sections = [
    {
      title: "Food Inventory",
      description: "Track what you have on hand and how much you need.",
      icon: UtensilsCrossed,
      to: "/food-inventory",
      count: counts.inventory,
      countLabel: "items",
      accent: "text-green-600 dark:text-green-400",
    },
    {
      title: "Recipes",
      description: "Create, import, and browse your personal recipe collection.",
      icon: BookOpen,
      to: "/recipes",
      count: counts.recipes,
      countLabel: "saved",
      accent: "text-orange-500 dark:text-orange-400",
    },
    {
      title: "Grocery List",
      description: "Build your shopping list from inventory shortfalls or recipes.",
      icon: ShoppingCart,
      to: "/grocery-list",
      count: counts.grocery,
      countLabel: "items",
      accent: "text-blue-600 dark:text-blue-400",
    },
  ];
 
  return (
    <main className="main p-6 space-y-8">
      {/* Header */}
      <section className="card text-center space-y-2">
        <h1 className="text-3xl sm:text-4xl font-bold">🍽️ Meal Planning</h1>
        <p className="opacity-80 max-w-lg mx-auto">
          Track your food, build recipes, and plan your shopping — all in one place.
        </p>
        {!isLoggedIn && (
          <p className="text-sm opacity-60 italic">Sign in to save your data across devices.</p>
        )}
      </section>
 
      {/* Section cards */}
      <section>
        <div className="section-bar mb-4">
          <h2 className="font-semibold">Where do you want to go?</h2>
        </div>
        <ul className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {sections.map(({ title, description, icon: Icon, to, count, countLabel, accent }) => (
            <li key={to}>
              <button
                onClick={() => navigate(to)}
                className="card p-5 w-full text-left hover:shadow-lg transition group space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className={`h-10 w-10 rounded-xl grid place-items-center border ${accent}`}
                    style={{ borderColor: "var(--border)", background: "color-mix(in oklab, var(--bg) 85%, transparent)" }}>
                    <Icon className="h-5 w-5" />
                  </span>
                  {isLoggedIn && count !== null && (
                    <span className="badge">{count} {countLabel}</span>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-lg leading-tight">{title}</h3>
                  <p className="text-sm opacity-70 mt-1">{description}</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </section>
 
      {/* Categories link — demoted to utility */}
      <section className="text-center">
        <button
          onClick={() => navigate("/category-manager")}
          className="text-sm opacity-60 hover:opacity-100 underline underline-offset-4 transition flex items-center gap-1 mx-auto"
        >
          <Tag className="h-3.5 w-3.5" /> Manage categories
        </button>
      </section>
 
      {/* Upcoming features */}
      <section className="space-y-2">
        <div className="section-bar">
          <h2 className="font-semibold">Coming soon</h2>
        </div>
        <div className="card text-sm opacity-70 space-y-1">
          <p>✨ AI recipe suggestions based on your current inventory</p>
          <p>💰 Grocery cost estimator with editable prices</p>
          <p>🔁 Weekly meal planner with portion control</p>
          <p>🌐 Community-shared recipes and seasonal suggestions</p>
        </div>
      </section>
    </main>
  );
}