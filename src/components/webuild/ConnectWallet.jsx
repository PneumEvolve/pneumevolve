// /src/components/webuild/ConnectWallet.jsx
import React from 'react';
import { useWallet } from '@terra-money/wallet-kit';

const ConnectWallet = () => {
  const { connect, disconnect, status, wallets } = useWallet();

  console.log("Wallet Status:", status);
  console.log("Wallets:", wallets);

  const handleConnect = () => {
  try {
    connect('WALLETCONNECT'); // This bypasses the extension
  } catch (error) {
    console.error("Wallet connect error:", error);
  }
};

  const handleDisconnect = () => {
    try {
      disconnect();
    } catch (error) {
      console.error("Wallet disconnect error:", error);
    }
  };

  return (
    <div className="mb-4">
      {status !== 'WALLET_CONNECTED' ? (
        <button
          onClick={handleConnect}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Connect Wallet
        </button>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Connected: {wallets?.[0]?.terraAddress || "Unknown Address"}
          </p>
          <button
            onClick={handleDisconnect}
            className="bg-red-600 text-white px-4 py-2 rounded"
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
};

export default ConnectWallet;