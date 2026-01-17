"use client";

import Web3 from "web3";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";

import BetChainABI from "../abi/BetChain.json";

const TARGET_CHAIN_ID =
  process.env.NEXT_PUBLIC_CHAIN_ID || "0xaa36a7";

const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

export const BetChainContext = createContext(null);

/**
 * BetChainProvider
 *
 * Handles wallet connection, network validation and
 * write access to the BetChain smart contract.
 *
 * This context is intentionally focused on WRITE operations.
 * Read-only blockchain access should NOT depend on it,
 * allowing public usage without a connected wallet.
 */
export function BetChainProvider({ children }) {
  const [web3, setWeb3] = useState(null);
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);

  /**
   * Derived state
   * Indicates when the contract is ready for interaction
   */
  const isReady = useMemo(() => {
    return Boolean(web3 && account && contract);
  }, [web3, account, contract]);

  /**
   * Connects the user's wallet and initializes Web3 + contract
   */
  const connectWallet = useCallback(async () => {
    if (!window.ethereum || isConnecting) return;

    try {
      setIsConnecting(true);

      const web3Instance = new Web3(window.ethereum);

      const chainId = await window.ethereum.request({
        method: "eth_chainId",
      });

      if (chainId !== TARGET_CHAIN_ID) {
        throw new Error("Wrong network");
      }

      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      const contractInstance = new web3Instance.eth.Contract(
        BetChainABI,
        CONTRACT_ADDRESS
      );

      setWeb3(web3Instance);
      setAccount(accounts[0]);
      setContract(contractInstance);

      sessionStorage.removeItem("walletDisconnected");
    } catch (error) {
      console.error("Wallet connection error:", error);
    } finally {
      setIsConnecting(false);
    }
  }, [isConnecting]);

  /**
   * Disconnects the wallet (UX-controlled)
   */
  const disconnectWallet = useCallback(() => {
    setWeb3(null);
    setAccount(null);
    setContract(null);
    sessionStorage.setItem("walletDisconnected", "true");
  }, []);

  /**
   * Wallet event listeners
   * No automatic connection is performed.
   */
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts) => {
      if (!accounts.length) {
        disconnectWallet();
      } else {
        setAccount(accounts[0]);
      }
    };

    const handleChainChanged = () => {
      window.location.reload();
    };

    window.ethereum.on(
      "accountsChanged",
      handleAccountsChanged
    );
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum.removeListener(
        "accountsChanged",
        handleAccountsChanged
      );
      window.ethereum.removeListener(
        "chainChanged",
        handleChainChanged
      );
    };
  }, [disconnectWallet]);

  /**
   * Context value
   */
  const value = useMemo(
    () => ({
      web3,
      account,
      contract,
      isReady,
      isConnecting,
      connectWallet,
      disconnectWallet,
    }),
    [
      web3,
      account,
      contract,
      isReady,
      isConnecting,
      connectWallet,
      disconnectWallet,
    ]
  );

  return (
    <BetChainContext.Provider value={value}>
      {children}
    </BetChainContext.Provider>
  );
}

/**
 * Context access hook
 */
export function useBetChain() {
  const context = useContext(BetChainContext);

  if (!context) {
    throw new Error(
      "useBetChain must be used within BetChainProvider"
    );
  }

  return context;
}
