import React from "react";
import { Button } from "@/components/ui/button";

const API_URL = "https://shea-klipper-backend.onrender.com";

const FindRecipesButton = ({ token }) => {
  const handleFindRecipes = async () => {
    try {
      const response = await fetch(`${API_URL}/meal-planning/food-inventory`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch inventory.");

      const data = await response.json();
      const items = data.items || [];

      const ingredientNames = items
        .filter(item => item.quantity > 0)
        .map(item => item.name.trim())
        .filter(name => name.length > 0);

      if (ingredientNames.length === 0) {
        alert("You have no ingredients with quantity > 0.");
        return;
      }

      const query = encodeURIComponent(ingredientNames.join(" ") + " What can I make with these ingredients?");
      window.open(`https://www.google.com/search?q=${query}`, "_blank");
    } catch (error) {
      console.error("Error finding recipes:", error);
      alert("❌ Failed to fetch inventory.");
    }
  };

  return (
    <Button onClick={handleFindRecipes} className="bg-amber-500 text-white">
      🍳 Find Recipes with My Ingredients
    </Button>
  );
};

export default FindRecipesButton;