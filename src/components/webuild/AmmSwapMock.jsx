// /src/components/webuild/AmmSwapMock.jsx
import React, { useState } from 'react';

const AmmSwapMock = ({ state, setState }) => {
  const [fromToken, setFromToken] = useState('SEED');
  const [toToken, setToToken] = useState('USDC');
  const [amount, setAmount] = useState(0);

  const handleSwap = () => {
    const pairKey = `${fromToken}/${toToken}`;
    const pool = state.pools[pairKey];
    if (!pool || !pool[fromToken] || !pool[toToken]) return;

    const x = pool[fromToken];
    const y = pool[toToken];
    const k = x * y;
    const newX = x + Number(amount);
    const newY = k / newX;
    const outputAmount = Math.floor(y - newY);

    if (state[fromToken.toLowerCase()] < amount) {
      alert('Insufficient balance');
      return;
    }

    setState(prev => ({
      ...prev,
      [fromToken.toLowerCase()]: prev[fromToken.toLowerCase()] - Number(amount),
      [toToken.toLowerCase()]: (prev[toToken.toLowerCase()] || 0) + outputAmount,
      pools: {
        ...prev.pools,
        [pairKey]: {
          ...pool,
          [fromToken]: newX,
          [toToken]: newY
        }
      }
    }));
  };

  return (
    <div className="bg-white dark:bg-gray-900 p-4 rounded-xl shadow">
      <h2 className="text-xl font-semibold mb-2">🔁 AMM Swap Simulation</h2>
      <div className="flex flex-col space-y-2">
        <label>From Token:
          <select value={fromToken} onChange={e => setFromToken(e.target.value)}>
            <option>SEED</option>
            <option>FRUIT</option>
            <option>BRANCH</option>
          </select>
        </label>
        <label>To Token:
          <select value={toToken} onChange={e => setToToken(e.target.value)}>
            <option>USDC</option>
            <option>ROOT</option>
          </select>
        </label>
        <input
          type="number"
          placeholder="Amount to swap"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          className="p-2 rounded border"
        />
        <button
          onClick={handleSwap}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
        >
          Simulate Swap
        </button>
      </div>
    </div>
  );
};

export default AmmSwapMock;