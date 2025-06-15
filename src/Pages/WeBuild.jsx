// /src/pages/WebuildMockup.jsx
import React, { useState } from 'react';
import TokenBalances from '../components/webuild/TokenBalances';
import AmmSwapMock from '../components/webuild/AmmSwapMock';
import MintBranchForm from '../components/webuild/MintBranchForm';
import RedeemBranchForm from '../components/webuild/RedeemBranchForm';
import GovernancePanel from '../components/webuild/GovernancePanel';
import NFTStatusPanel from '../components/webuild/NFTStatusPanel';
import AIAgentAccess from '../components/webuild/AIAgentAccess';
import TokenDevTools from '../components/webuild/TokenDevTools';

const WebuildMockup = () => {
  const [state, setState] = useState({
    seed: 10000,
    fruit: 0,
    branch: 0,
    root: 0,
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

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">🌱 WeBuild DAO Ecosystem Mockup</h1>
      <TokenBalances state={state} />
      <AmmSwapMock state={state} setState={setState} />
      <MintBranchForm state={state} setState={setState} />
      <RedeemBranchForm state={state} setState={setState} />
      <NFTStatusPanel state={state} />
      <GovernancePanel state={state} setState={setState} />
      <AIAgentAccess state={state} />
      <TokenDevTools state={state} setState={setState} />
    </div>
  );
};

export default WebuildMockup;