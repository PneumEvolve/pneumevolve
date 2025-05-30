import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Sparkles } from "lucide-react";

const AI = () => {
  const navigate = useNavigate();
  const [usedAI, setUsedAI] = useState(false);

  const handleUseAI = () => {
    setUsedAI(true);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 font-sans">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold tracking-tight">AI Services</h1>
        <Button variant="outline" onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardContent className="p-6">
          <h2 className="text-2xl text-black font-semibold mb-4">Access On-Chain AI Tools</h2>
          <p className="text-black mb-6">
            Spend 100 MEME_T or 1 SOV_T to access our powerful AI tools for analytics, content generation, or dream channeling.
          </p>

          {usedAI ? (
            <div className="text-green-400">
              ✅ AI Access Granted! You can now use the service. (Coming Soon)
            </div>
          ) : (
            <Button onClick={handleUseAI} className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" /> Use AI Tool
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AI;
