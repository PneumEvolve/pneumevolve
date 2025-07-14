import React from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function LoginPrompt({ setShowLoginModal }) {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-sm text-center">
        <h2 className="text-xl font-bold mb-2">Login Required</h2>
        <p className="mb-4">Please log in to use the Smart Journal features.</p>
        <div className="flex justify-center gap-4">
          <Button onClick={() => navigate("/login")}>Go to Login</Button>
          <Button variant="ghost" onClick={() => setShowLoginModal(false)}>Continue Browsing</Button>
        </div>
      </div>
    </div>
  );
}