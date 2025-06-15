// /src/components/webuild/StakingPanel.jsx
import React, { useState } from 'react';

const StakingPanel = ({ state, setState }) => {
  const [amounts, setAmounts] = useState({ root: 0, seed: 0 });

  const handleChange = (type, value) => {
    setAmounts(prev => ({ ...prev, [type]: Number(value) }));
  };

  const handleStake = (type) => {
    const amt = Math.min(amounts[type], state[type]);
    if (amt > 0) {
      setState(prev => ({
        ...prev,
        [type]: prev[type] - amt,
        [`staked${type.charAt(0).toUpperCase() + type.slice(1)}`]: (prev[`staked${type.charAt(0).toUpperCase() + type.slice(1)}`] || 0) + amt
      }));
    }
    setAmounts(prev => ({ ...prev, [type]: 0 }));
  };

  const handleUnstake = (type) => {
    const stakedKey = `staked${type.charAt(0).toUpperCase() + type.slice(1)}`;
    const amt = Math.min(amounts[type], state[stakedKey] || 0);
    if (amt > 0) {
      setState(prev => ({
        ...prev,
        [type]: prev[type] + amt,
        [stakedKey]: prev[stakedKey] - amt
      }));
    }
    setAmounts(prev => ({ ...prev, [type]: 0 }));
  };

  return (
    <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">🌳 Stake ROOT Tokens</h2>
        <p className="text-gray-700 dark:text-gray-300 mb-2">
          Stake your <strong>ROOT</strong> tokens to gain governance power, unlock sub-DAO access, and more.
        </p>
        <div className="flex flex-col md:flex-row items-center gap-4">
          <input
            type="number"
            className="p-2 border rounded w-full max-w-xs"
            value={amounts.root}
            onChange={e => handleChange('root', e.target.value)}
            placeholder="Amount of ROOT"
            min={0}
          />
          <div className="flex gap-2">
            <button
              onClick={() => handleStake('root')}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              Stake
            </button>
            <button
              onClick={() => handleUnstake('root')}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Unstake
            </button>
          </div>
        </div>
        <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          <p>Available ROOT: <strong>{state.root}</strong></p>
          <p>Staked ROOT: <strong>{state.stakedRoot || 0}</strong></p>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-2">🌱 Stake SEED Tokens</h2>
        <p className="text-gray-700 dark:text-gray-300 mb-2">
          Stake <strong>SEED</strong> to receive BRANCH tokens or access gardening/volunteer perks.
        </p>
        <div className="flex flex-col md:flex-row items-center gap-4">
          <input
            type="number"
            className="p-2 border rounded w-full max-w-xs"
            value={amounts.seed}
            onChange={e => handleChange('seed', e.target.value)}
            placeholder="Amount of SEED"
            min={0}
          />
          <div className="flex gap-2">
            <button
              onClick={() => handleStake('seed')}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              Stake
            </button>
            <button
              onClick={() => handleUnstake('seed')}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Unstake
            </button>
          </div>
        </div>
        <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          <p>Available SEED: <strong>{state.seed}</strong></p>
          <p>Staked SEED: <strong>{state.stakedSeed || 0}</strong></p>
        </div>
      </div>
    </div>
  );
};

export default StakingPanel;
