import React from "react";

export default function MyCommunityPortal() {
  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-4xl font-bold mb-6 text-center">🌎 My Community Portal</h1>

      {/* COMMUNITY SELECTOR */}
      <div className="mb-10">
        <label className="block text-sm font-medium mb-2">Select Community:</label>
        <select className="w-full p-2 border rounded">
          <option value="vernon-full">PneumEvolve Vernon (City-wide)</option>
          <option value="vernon-mens">Vernon Men's Group</option>
        </select>
      </div>

      {/* GOVERNANCE MODULE */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">🗳️ Governance</h2>
        <p className="mb-2">View and vote on active proposals. Or submit new ideas to shape your community.</p>
        <ul className="list-disc ml-6 text-sm">
          <li>Proposal: Add new greenhouse to Community Garden – <em>Voting ends in 2 days</em></li>
          <li>Proposal: Host monthly town halls – <em>Voting open</em></li>
        </ul>
        <button className="mt-4 bg-blue-600 text-white px-4 py-2 rounded">Submit New Proposal</button>
      </section>

      {/* FOOD MODULE */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">🌿 Food Systems</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-bold">Garden Directory</h3>
            <ul className="list-disc ml-5 text-sm">
              <li>Maple Street Garden – 5 active volunteers</li>
              <li>Men's Group Plot – ready for spring planting</li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold">Food Shares</h3>
            <ul className="list-disc ml-5 text-sm">
              <li>Free carrots available at 1525 Elm St</li>
              <li>Need: Chickens for new coop build</li>
            </ul>
          </div>
        </div>
        <button className="mt-4 bg-green-600 text-white px-4 py-2 rounded">Add Garden or Share</button>
      </section>

      {/* SHELTER MODULE */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">🏡 Shelter & Housing</h2>
        <p className="mb-2">Explore housing options, co-living opportunities, or post needs and availability.</p>
        <ul className="list-disc ml-6 text-sm">
          <li>Offer: Shared tiny home space in East Vernon</li>
          <li>Need: Elderly man looking for caretaker roommate</li>
        </ul>
        <button className="mt-4 bg-yellow-500 text-white px-4 py-2 rounded">Add Housing Option</button>
      </section>

      {/* COMMUNITY VALUES */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">💡 Community Identity</h2>
        <p className="mb-2">Edit your group's values, vision, and featured modules.</p>
        <ul className="list-disc ml-6 text-sm">
          <li><strong>Values:</strong> Mutual aid, sovereignty, Earth stewardship</li>
          <li><strong>Vision:</strong> To grow a self-sufficient Vernon by 2030</li>
          <li><strong>Active Modules:</strong> Governance, Food, Shelter</li>
        </ul>
        <button className="mt-4 bg-gray-800 text-white px-4 py-2 rounded">Edit Identity</button>
      </section>

      <p className="text-center text-sm text-gray-600">
        This is a living mockup of what a PneumEvolve node could look like — built by and for the people.
      </p>
    </div>
  );
}