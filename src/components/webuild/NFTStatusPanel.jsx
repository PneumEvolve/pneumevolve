// /src/components/webuild/NFTStatusPanel.jsx
import React from 'react';

const NFTStatusPanel = ({ state }) => {
  const { nfts } = state;

  return (
    <div className="bg-white dark:bg-gray-900 p-4 rounded-xl shadow">
      <h2 className="text-xl font-semibold mb-2">🖼️ NFT Ownership</h2>
      <ul className="space-y-1">
        <li>
          {nfts.seedNFT ? '✅' : '❌'} Seed NFT — Lower DEX Fees
        </li>
        <li>
          {nfts.fruitNFT ? '✅' : '❌'} Fruit NFT — Access to Premium Rewards
        </li>
        <li>
          {nfts.branchNFT ? '✅' : '❌'} Branch NFT — Boosted BRANCH→ROOT Yield
        </li>
      </ul>
    </div>
  );
};

export default NFTStatusPanel;
