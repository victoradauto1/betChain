"use client";

import Web3 from "web3";
import { createContext, useContext, useEffect, useState } from "react";
import BetChainABI from "../abi/BetChain.json";

const TARGET_CHAIN_ID = "0xaa36a7"; // Sepolia chainId
const CONTRACT_ADDRESS = "0x5B49C937B0c431D26478e6C9E7a73a5d3b267f7A";

export const BetChainContext = createContext(null);

export const BetChainProvider = ({ children }) => {
  const [web3, setWeb3] = useState(null);
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask!");
      return;
    }

    const ethereum = window.ethereum;

    // Validate network
    const chainId = await ethereum.request({ method: "eth_chainId" });
    if (chainId !== TARGET_CHAIN_ID) {
      try {
        await ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: TARGET_CHAIN_ID }],
        });
      } catch (err) {
        // If chain is not added to MetaMask
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
          console.error("Network switch error:", err);
          return;
        }
      }
    }

    const accounts = await ethereum.request({ method: "eth_requestAccounts" });
    const web3Instance = new Web3(ethereum);
    const contractInstance = new web3Instance.eth.Contract(
      BetChainABI,
      CONTRACT_ADDRESS
    );

    setWeb3(web3Instance);
    setAccount(accounts[0]);
    setContract(contractInstance);

    ethereum.on("accountsChanged", (accs) => setAccount(accs[0]));
    ethereum.on("chainChanged", () => window.location.reload());
  };

  useEffect(() => {
    connectWallet();
  }, []);

  return (
    <BetChainContext.Provider
      value={{ web3, account, contract, connectWallet }}
    >
      {children}
    </BetChainContext.Provider>
  );
};

export const useBetChain = () => useContext(BetChainContext);
