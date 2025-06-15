// /src/components/webuild/TokenBalances.jsx
import React from 'react';

const TokenBalances = ({ state }) => {
  const { seed, fruit, branch, root } = state;

  return (
    <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-xl shadow">
      <h2 className="text-xl font-semibold mb-2">💰 Token Balances</h2>
      <ul className="space-y-1">
        <li>🌱 SEED: {seed}</li>
        <li>🍎 FRUIT: {fruit}</li>
        <li>🌿 BRANCH: {branch}</li>
        <li>🌳 ROOT: {root}</li>
      </ul>
    </div>
  );
};

export default TokenBalances;
