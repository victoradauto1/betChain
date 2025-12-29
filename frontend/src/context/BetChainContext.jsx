"use client";

import Web3 from "web3";
import { createContext, useContext, useEffect, useState } from "react";
import BetChainABI from "../abi/BetChain.json";

const TARGET_CHAIN_ID = process.env.NEXT_PUBLIC_CHAIN_ID || "0xaa36a7";
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

export const BetChainContext = createContext(null);

export const BetChainProvider = ({ children }) => {
  const [web3, setWeb3] = useState(null);
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [isManuallyDisconnected, setIsManuallyDisconnected] = useState(false);

  const setupProvider = async (ethereum, selectedAccount) => {
    const web3Instance = new Web3(ethereum);
    const contractInstance = new web3Instance.eth.Contract(
      BetChainABI,
      CONTRACT_ADDRESS
    );

    setWeb3(web3Instance);
    setAccount(selectedAccount);
    setContract(contractInstance);
    setIsManuallyDisconnected(false);
  };

  const validateNetwork = async (ethereum) => {
    const chainId = await ethereum.request({ method: "eth_chainId" });

    if (chainId !== TARGET_CHAIN_ID) {
      try {
        await ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: TARGET_CHAIN_ID }],
        });
      } catch (err) {
        if (err.code === 4902) {
          await ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: TARGET_CHAIN_ID,
                chainName: "Sepolia Test Network",
                rpcUrls: ["https://rpc.sepolia.org"],
                nativeCurrency: {
                  name: "ETH",
                  symbol: "ETH",
                  decimals: 18,
                },
                blockExplorerUrls: ["https://sepolia.etherscan.io"],
              },
            ],
          });
        } else {
          throw err;
        }
      }
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask!");
      return;
    }

    try {
      await validateNetwork(window.ethereum);
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      await setupProvider(window.ethereum, accounts[0]);
    } catch (err) {
      console.error("Wallet connection error:", err);
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setContract(null);
    setWeb3(null);
    setIsManuallyDisconnected(true);
    localStorage.setItem("walletDisconnected", "true");
  };

  const checkWalletConnection = async () => {
    if (!window.ethereum) return;

    const wasDisconnected = localStorage.getItem("walletDisconnected");
    if (wasDisconnected === "true" || isManuallyDisconnected) return;

    try {
      const accounts = await window.ethereum.request({
        method: "eth_accounts",
      });

      if (accounts.length > 0) {
        await validateNetwork(window.ethereum);
        await setupProvider(window.ethereum, accounts[0]);
      }
    } catch (err) {
      console.error("Wallet check error:", err);
    }
  };

  useEffect(() => {
    checkWalletConnection();

    if (window.ethereum) {
      window.ethereum.on("accountsChanged", (accs) => {
        if (accs.length > 0) {
          setAccount(accs[0]);
          setIsManuallyDisconnected(false);
          localStorage.removeItem("walletDisconnected");
        } else {
          setAccount(null);
          setContract(null);
          setWeb3(null);
        }
      });

      window.ethereum.on("chainChanged", () => {
        window.location.reload();
      });
    }
  }, []);

  return (
    <BetChainContext.Provider
      value={{
        web3,
        account,
        contract,
        connectWallet,
        disconnectWallet
      }}
    >
      {children}
    </BetChainContext.Provider>
  );
};

export const useBetChain = () => useContext(BetChainContext);