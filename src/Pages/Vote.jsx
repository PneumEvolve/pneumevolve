import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

const Vote = () => {
  const navigate = useNavigate();
  const [vote, setVote] = useState(null);

  const handleVote = (choice) => {
    setVote(choice);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 font-sans">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold tracking-tight">DAO Proposal</h1>
        <Button variant="outline" onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardContent className="p-6">
          <h2 className="text-xl font-bold mb-2">Proposal #12</h2>
          <p className="text-sm text-black mb-6 leading-relaxed">
            Should the DAO lock 10% more SOV_T this year to increase scarcity and strengthen the token economy?
          </p>

          {vote ? (
            <div className="text-green-400 text-lg">
              You voted: <strong>{vote.toUpperCase()}</strong>
            </div>
          ) : (
            <div className="flex gap-4">
              <Button onClick={() => handleVote("yes")} className="flex items-center gap-2">
                <Check className="w-5 h-5" /> Vote Yes
              </Button>
              <Button onClick={() => handleVote("no")} className="flex items-center gap-2">
                <X className="w-5 h-5" /> Vote No
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Vote;