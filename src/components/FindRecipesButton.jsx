import React from "react";
import { Button } from "../components/ui/button";
import { api } from "@/lib/api"; // ✅ unified axios client (baseURL=/api in dev, VITE_API_URL in prod)

const FindRecipesButton = ({ token }) => {
  const handleFindRecipes = async () => {
    try {
      // Let axios include cookies; if a header token is passed, use it too.
      const res = await api.get("/meal-planning/food-inventory", {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        validateStatus: () => true, // inspect non-200s
      });

      if (res.status === 401) {
        alert("Please sign in to access your food inventory.");
        return;
      }
      if (res.status !== 200) {
        throw new Error(`Failed to fetch inventory (status ${res.status})`);
      }

      // Accept either an array or { items: [...] }
      const payload = res.data;
      const items = Array.isArray(payload) ? payload : payload?.items ?? [];

      const ingredientNames = items
        .filter((it) => (it?.quantity ?? 0) > 0)
        .map((it) => String(it?.name || "").trim())
        .filter(Boolean);

      if (ingredientNames.length === 0) {
        alert("You have no ingredients with quantity > 0.");
        return;
      }

      const query = encodeURIComponent(
        ingredientNames.join(" ") + " What can I make with these ingredients?"
      );
      window.open(`https://www.google.com/search?q=${query}`, "_blank", "noopener,noreferrer");
    } catch (err) {
      console.error("Error finding recipes:", err);
      alert("❌ Failed to fetch inventory.");
    }
  };

  return (
    <Button onClick={handleFindRecipes} className="bg-amber-500 text-white">
      🍳 Find Recipes (Opens Google)
    </Button>
  );
};

export default FindRecipesButton;