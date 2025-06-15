// /src/pages/WebuildMockup.jsx
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import TokenBalances from '../components/webuild/TokenBalances';
import AmmSwapMock from '../components/webuild/AmmSwapMock';
import MintBranchForm from '../components/webuild/MintBranchForm';
import RedeemBranchForm from '../components/webuild/RedeemBranchForm';
import GovernancePanel from '../components/webuild/GovernancePanel';
import NFTStatusPanel from '../components/webuild/NFTStatusPanel';
import AIAgentAccess from '../components/webuild/AIAgentAccess';
import TokenDevTools from '../components/webuild/TokenDevTools';
import StakingPanel from '../components/webuild/StakingPanel';

const componentMap = {
  balances: TokenBalances,
  swap: AmmSwapMock,
  mint: MintBranchForm,
  redeem: RedeemBranchForm,
  nfts: NFTStatusPanel,
  governance: GovernancePanel,
  ai: AIAgentAccess,
  dev: TokenDevTools,
  stake: StakingPanel
};

const WebuildMockup = () => {
  const [state, setState] = useState({
    seed: 10000,
    fruit: 0,
    branch: 0,
    root: 0,
    stakedRoot: 0,
    nfts: {
      seedNFT: false,
      fruitNFT: false,
      branchNFT: false
    },
    vesting: {
      branchLocked: 0,
      unlockTime: null
    },
    pools: {
      'SEED/USDC': { SEED: 10000, USDC: 5000 },
      'FRUIT/USDC': { FRUIT: 5000, USDC: 5000 },
      'BRANCH/ROOT': { BRANCH: 1000, ROOT: 500 }
    }
  });

  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const viewParam = params.get('view');

  const views = viewParam === 'all' ? Object.keys(componentMap) : viewParam ? [viewParam] : [];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">🌱 WeBuild DAO Ecosystem Mockup</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link to="?view=balances" className="bg-white dark:bg-gray-800 p-3 rounded shadow hover:bg-gray-100">Token Balances</Link>
        <Link to="?view=swap" className="bg-white dark:bg-gray-800 p-3 rounded shadow hover:bg-gray-100">AMM Swap</Link>
        <Link to="?view=mint" className="bg-white dark:bg-gray-800 p-3 rounded shadow hover:bg-gray-100">Mint BRANCH</Link>
        <Link to="?view=redeem" className="bg-white dark:bg-gray-800 p-3 rounded shadow hover:bg-gray-100">Redeem BRANCH</Link>
        <Link to="?view=nfts" className="bg-white dark:bg-gray-800 p-3 rounded shadow hover:bg-gray-100">NFT Panel</Link>
        <Link to="?view=governance" className="bg-white dark:bg-gray-800 p-3 rounded shadow hover:bg-gray-100">Governance</Link>
        <Link to="?view=ai" className="bg-white dark:bg-gray-800 p-3 rounded shadow hover:bg-gray-100">AI Agent</Link>
        <Link to="?view=dev" className="bg-white dark:bg-gray-800 p-3 rounded shadow hover:bg-gray-100">Dev Tools</Link>
        <Link to="?view=stake" className="bg-white dark:bg-gray-800 p-3 rounded shadow hover:bg-gray-100">Stake ROOT & SEED</Link>
        <Link to="?view=all" className="bg-blue-100 dark:bg-blue-900 p-3 rounded shadow hover:bg-blue-200 col-span-2">🔁 Show All</Link>
      </div>

      {views.length > 0 ? (
        <div className="space-y-8">
          {views.map(key => {
            const Component = componentMap[key];
            return Component ? (
              <div key={key} className="border-t pt-4">
                <Component state={state} setState={setState} />
              </div>
            ) : null;
          })}
        </div>
      ) : (
        <p className="text-gray-600 dark:text-gray-300 mt-4">
          Select a tool from above to view and test it.
        </p>
      )}
    </div>
  );
};

export default WebuildMockup;