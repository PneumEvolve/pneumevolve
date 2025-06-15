// /src/components/webuild/TokenDevTools.jsx
import React, { useState } from 'react';

const tokenLabels = {
  seed: '🌱 SEED – Tradable, earned from community action',
  branch: '🌿 BRANCH – Stakable, intermediary token',
  fruit: '🍎 FRUIT – Loyalty and reward token',
  root: '🌳 ROOT – Governance & AI Access token'
};

const TokenDevTools = ({ state, setState }) => {
  const [amounts, setAmounts] = useState({ seed: 0, fruit: 0, branch: 0, root: 0 });

  const handleChange = (type, value) => {
    setAmounts(prev => ({ ...prev, [type]: Number(value) }));
  };

  const handleAdd = () => {
    setState(prev => ({
      ...prev,
      seed: prev.seed + amounts.seed,
      fruit: prev.fruit + amounts.fruit,
      branch: prev.branch + amounts.branch,
      root: prev.root + amounts.root
    }));
  };

  const handleBurn = () => {
    setState(prev => ({
      ...prev,
      seed: Math.max(0, prev.seed - amounts.seed),
      fruit: Math.max(0, prev.fruit - amounts.fruit),
      branch: Math.max(0, prev.branch - amounts.branch),
      root: Math.max(0, prev.root - amounts.root)
    }));
  };

  return (
    <div className="bg-white dark:bg-gray-900 p-4 rounded-xl shadow">
      <h2 className="text-xl font-semibold mb-4">🧪 Token Dev Tools</h2>
      <div className="space-y-4 mb-4">
        {Object.keys(amounts).map(type => (
          <div key={type} className="flex items-center space-x-4">
            <input
              type="number"
              value={amounts[type]}
              onChange={e => handleChange(type, e.target.value)}
              className="p-2 rounded border w-32"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">{tokenLabels[type]}</span>
          </div>
        ))}
      </div>
      <div className="flex space-x-4">
        <button onClick={handleAdd} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded">
          Add Tokens
        </button>
        <button onClick={handleBurn} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded">
          Burn Tokens
        </button>
      </div>
    </div>
  );
};

export default TokenDevTools;