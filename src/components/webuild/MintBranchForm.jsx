// /src/components/webuild/MintBranchForm.jsx
import React, { useState } from 'react';

const MintBranchForm = ({ state, setState }) => {
  const [seedAmount, setSeedAmount] = useState(0);

  const handleMint = () => {
    const seed = Number(seedAmount);
    const fruit = seed * 0.25;
    const totalRequiredFruit = Math.ceil(fruit);

    if (state.seed < seed || state.fruit < totalRequiredFruit) {
      alert('Not enough SEED or FRUIT');
      return;
    }

    const branchMinted = Math.floor(seed + totalRequiredFruit);

    setState(prev => ({
      ...prev,
      seed: prev.seed - seed,
      fruit: prev.fruit - totalRequiredFruit,
      branch: prev.branch + branchMinted,
      vesting: {
        ...prev.vesting,
        branchLocked: branchMinted,
        unlockTime: Date.now() + 30000 // 30 second vesting mock
      }
    }));
  };

  return (
    <div className="bg-white dark:bg-gray-900 p-4 rounded-xl shadow">
      <h2 className="text-xl font-semibold mb-2">🌿 Mint BRANCH Token</h2>
      <p className="text-sm text-gray-400">Requires 80% SEED + 20% FRUIT</p>
      <input
        type="number"
        placeholder="Amount of SEED to convert"
        value={seedAmount}
        onChange={e => setSeedAmount(e.target.value)}
        className="p-2 rounded border w-full mt-2"
      />
      <button
        onClick={handleMint}
        className="mt-3 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
      >
        Mint BRANCH
      </button>
    </div>
  );
};

export default MintBranchForm;