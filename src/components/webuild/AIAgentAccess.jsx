// /src/components/webuild/AIAgentAccess.jsx
import React from 'react';

const AIAgentAccess = ({ state }) => {
  const hasAccess = state.root >= 1000 || state.nfts.branchNFT;

  return (
    <div className="bg-white dark:bg-gray-900 p-4 rounded-xl shadow">
      <h2 className="text-xl font-semibold mb-2">🤖 AI Agent Access</h2>
      {hasAccess ? (
        <div className="text-green-500 font-medium">
          ✅ Access Granted — Welcome to the AI Agent interface.
        </div>
      ) : (
        <div className="text-red-500">
          🔒 Access Denied — Requires 1000+ ROOT or Branch NFT
        </div>
      )}
    </div>
  );
};

export default AIAgentAccess;
