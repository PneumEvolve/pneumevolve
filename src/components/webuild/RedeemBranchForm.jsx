// /src/components/webuild/RedeemBranchForm.jsx
import React from 'react';

const RedeemBranchForm = ({ state, setState }) => {
  const now = Date.now();
  const { branchLocked, unlockTime } = state.vesting;
  const canRedeem = unlockTime && now >= unlockTime;

  const handleRedeem = () => {
    if (!canRedeem) {
      alert('Branch tokens still vesting. Please wait.');
      return;
    }

    const fruitGained = Math.floor(branchLocked / 2);

    setState(prev => ({
      ...prev,
      branch: prev.branch - branchLocked,
      fruit: prev.fruit + fruitGained,
      vesting: {
        branchLocked: 0,
        unlockTime: null
      }
    }));
  };

  return (
    <div className="bg-white dark:bg-gray-900 p-4 rounded-xl shadow">
      <h2 className="text-xl font-semibold mb-2">🍎 Redeem BRANCH for FRUIT</h2>
      <p className="text-sm text-gray-400 mb-2">
        {canRedeem ? `Ready to redeem ${branchLocked} BRANCH → ${Math.floor(branchLocked / 2)} FRUIT` :
          `⏳ Vesting in progress. Please wait...`}
      </p>
      <button
        onClick={handleRedeem}
        disabled={!canRedeem}
        className={`px-4 py-2 rounded text-white ${canRedeem ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-500 cursor-not-allowed'}`}
      >
        Redeem BRANCH
      </button>
    </div>
  );
};

export default RedeemBranchForm;