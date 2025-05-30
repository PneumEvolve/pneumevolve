import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const Staking = () => {
  const navigate = useNavigate();
  const [stakedSOV, setStakedSOV] = useState(0);
  const [stakedMEME, setStakedMEME] = useState(0);

  const handleStakeSOV = () => setStakedSOV(stakedSOV + 100);
  const handleStakeMEME = () => setStakedMEME(stakedMEME + 1000);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 font-sans">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold tracking-tight">Staking Center</h1>
        <Button variant="outline" onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* SOV_T Staking */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl text-black font-bold mb-1">Stake SOV_T</h2>
            <p className="text-sm text-black mb-4">100 SOV_T for 1 year = 15% APR</p>
            <Button onClick={handleStakeSOV}>Stake 100 SOV_T</Button>
            {stakedSOV > 0 && (
              <p className="mt-4 text-green-400">
                You’ve staked {stakedSOV} SOV_T. Expected yearly reward: {(stakedSOV * 0.15).toFixed(2)} SOV_T
              </p>
            )}
          </CardContent>
        </Card>

        {/* MEME_T Staking */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl text-black font-bold mb-1">Stake MEME_T</h2>
            <p className="text-sm text-black mb-4">1000 MEME_T for 30 days = 3% APR</p>
            <Button onClick={handleStakeMEME}>Stake 1000 MEME_T</Button>
            {stakedMEME > 0 && (
              <p className="mt-4 text-green-400">
                You’ve staked {stakedMEME} MEME_T. Expected yearly reward: {(stakedMEME * 0.03).toFixed(2)} MEME_T
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Staking;
