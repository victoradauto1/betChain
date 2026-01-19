"use client";

/**
 * BetChainProvider
 *
 * Handles wallet connection, network validation and
 * authenticated WRITE access to the BetChain smart contract.
 *
 * This context is intentionally scoped to WRITE operations only.
 * It manages signer-based interactions, transaction execution
 * and custom error propagation from the contract.
 *
 * Read-only blockchain access MUST NOT depend on this context,
 * allowing public data consumption without a connected wallet.
 */

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { BrowserProvider, Contract } from "ethers";
import BetChainABI from "../abi/BetChain.json";

const TARGET_CHAIN_ID = BigInt(process.env.NEXT_PUBLIC_CHAIN_ID || "0xaa36a7");
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

export const BetChainContext = createContext(null);

export function BetChainProvider({ children }) {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const isReady = useMemo(() => {
    return Boolean(provider && signer && contract && account);
  }, [provider, signer, contract, account]);

  const connectWallet = useCallback(async () => {
    if (!window.ethereum || isConnecting) return;

    try {
      setIsConnecting(true);

      const provider = new BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();

      if (network.chainId !== TARGET_CHAIN_ID) {
        throw new Error("Wrong network");
      }

      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      const contract = new Contract(
        CONTRACT_ADDRESS,
        BetChainABI,
        signer
      );

      setProvider(provider);
      setSigner(signer);
      setAccount(address);
      setContract(contract);

      sessionStorage.removeItem("walletDisconnected");
    } catch (err) {
      console.error("Wallet connection error:", err);
    } finally {
      setIsConnecting(false);
    }
  }, [isConnecting]);

  const disconnectWallet = useCallback(() => {
    setProvider(null);
    setSigner(null);
    setAccount(null);
    setContract(null);
    sessionStorage.setItem("walletDisconnected", "true");
  }, []);

  /** ------------------------------------------------
   * Safe transaction executor (custom errors aware)
   * ------------------------------------------------*/
  const executeTx = useCallback(async (txFn) => {
    try {
      const tx = await txFn();
      return await tx.wait();
    } catch (err) {
      if (err?.errorName) {
        throw new Error(err.errorName);
      }
      throw err;
    }
  }, []);

  /** ------------------------------------------------
   * WRITE METHODS (semantic API)
   * ------------------------------------------------*/
  const actions = useMemo(() => {
    if (!contract) return null;

    return {
      createBet: (title, deadline) =>
        executeTx(() => contract.createBet(title, deadline)),

      addOption: (betId, name) =>
        executeTx(() => contract.addOption(betId, name)),

      placeBet: (betId, optionId, value) =>
        executeTx(() =>
          contract.placeBet(betId, optionId, { value })
        ),

      closeBet: (betId) =>
        executeTx(() => contract.closeBet(betId)),

      settleBet: (betId, winningOption) =>
        executeTx(() => contract.settleBet(betId, winningOption)),

      withdraw: (betId) =>
        executeTx(() => contract.withdraw(betId)),
    };
  }, [contract, executeTx]);

  /** Wallet listeners */
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts) => {
      if (!accounts.length) disconnectWallet();
      else setAccount(accounts[0]);
    };

    const handleChainChanged = () => window.location.reload();

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, [disconnectWallet]);

  const value = useMemo(
    () => ({
      provider,
      signer,
      account,
      contract,
      isReady,
      isConnecting,
      connectWallet,
      disconnectWallet,
      actions,
    }),
    [
      provider,
      signer,
      account,
      contract,
      isReady,
      isConnecting,
      connectWallet,
      disconnectWallet,
      actions,
    ]
  );

  return (
    <BetChainContext.Provider value={value}>
      {children}
    </BetChainContext.Provider>
  );
}

export function useBetChain() {
  const context = useContext(BetChainContext);
  if (!context) {
    throw new Error("useBetChain must be used within BetChainProvider");
  }
  return context;
}
