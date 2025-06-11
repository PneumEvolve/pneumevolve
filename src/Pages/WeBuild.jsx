// This is a React mockup of the "We Build" platform structure
// Each section will be represented by a component placeholder

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const WeBuildMockup = () => {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-6 space-y-10 text-gray-900 dark:text-white">
      <div className="text-center space-y-4">
        <h1 className="text-5xl font-bold">We Build</h1>
        <p className="text-lg max-w-xl mx-auto">
          A platform for post-capitalist cooperation. Contribute, earn SEEDs, vote with ROOT, and co-create the systems of tomorrow.
        </p>
        <Button>Join the Movement</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardContent>
            <h2 className="text-2xl font-semibold">🌱 Contribute & Earn SEED</h2>
            <p className="mt-2 text-sm">
              Log what you’ve done to help the mission. Earn SEED tokens as proof of real-world value.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <h2 className="text-2xl font-semibold">🗳️ Vote with ROOT</h2>
            <p className="mt-2 text-sm">
              Use your ROOT tokens to guide We Build decisions. Voting is transparent, stake-based, and impact-driven.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <h2 className="text-2xl font-semibold">📜 Proposals</h2>
            <p className="mt-2 text-sm">
              View and create proposals to improve the community, allocate resources, or evolve the DAO.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <h2 className="text-2xl font-semibold">🤝 Bounties & Projects</h2>
            <p className="mt-2 text-sm">
              Claim open bounties, join existing projects, or offer your skills to a shared mission.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <h2 className="text-2xl font-semibold">📊 Transparent Ledger</h2>
            <p className="mt-2 text-sm">
              View token allocations, contributor logs, and funding transparently. No secrets.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <h2 className="text-2xl font-semibold">🌍 Open Forum</h2>
            <p className="mt-2 text-sm">
              Talk, dream, and build together in our community forum. Anonymous or signed in.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="text-center pt-10">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          This is a non-functional prototype of the We Build platform.
        </p>
      </div>
    </div>
  );
};

export default WeBuildMockup;