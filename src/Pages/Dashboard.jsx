import React from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Coins, Vote, BrainCog, Star } from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 font-sans">
      <h1 className="text-4xl font-bold mb-8 text-center tracking-tight">DAO Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-12">
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-bold mb-1">GOV_T</h2>
            <p className="text-sm text-gray-400 mb-2">Governance Voting Token</p>
            <p className="text-3xl font-extrabold">12</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-bold mb-1">SOV_T</h2>
            <p className="text-sm text-gray-400 mb-2">Store of Value Token</p>
            <p className="text-3xl font-extrabold">350.75</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-bold mb-1">MEME_T</h2>
            <p className="text-sm text-gray-400 mb-2">Community Engagement Token</p>
            <p className="text-3xl font-extrabold">8,420</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-bold mb-1">NFTs</h2>
            <p className="text-sm text-gray-400 mb-2">Held: Rare ×1</p>
            <p className="text-3xl font-extrabold">🎖️</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Button onClick={() => navigate("/staking")} className="w-full flex items-center gap-2">
          <Coins className="w-5 h-5" /> Staking
        </Button>
        <Button onClick={() => navigate("/vote")} className="w-full flex items-center gap-2">
          <Vote className="w-5 h-5" /> DAO Voting
        </Button>
        <Button onClick={() => navigate("/ai")} className="w-full flex items-center gap-2">
          <BrainCog className="w-5 h-5" /> AI Access
        </Button>
        <Button variant="outline" disabled className="w-full flex items-center gap-2">
          <Star className="w-5 h-5" /> Events (Coming Soon)
        </Button>
      </div>
    </div>
  );
};

export default Dashboard;
