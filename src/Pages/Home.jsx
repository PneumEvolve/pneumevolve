import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white p-8">
      <h1 className="text-5xl font-bold mb-4 text-center">NewWorld DAO</h1>
      <p className="text-lg mb-8 text-center max-w-xl">
        A decentralized collective experimenting with tokens, AI services, NFT-gated tools, and new forms of governance. Built on love, curiosity, and code.
      </p>
      <div className="space-x-4">
        <Button onClick={() => navigate("/dashboard")}>Enter Dashboard</Button>
        <Button variant="outline" onClick={() => window.open("https://terra.money", "_blank")}>Learn About Terra</Button>
      </div>
    </div>
  );
};

export default Home;
