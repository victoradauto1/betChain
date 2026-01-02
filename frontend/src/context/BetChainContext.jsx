"use client";

import Web3 from "web3";
import { createContext, useContext, useEffect, useState } from "react";
import BetChainABI from "../abi/BetChain.json";

const TARGET_CHAIN_ID = process.env.NEXT_PUBLIC_CHAIN_ID || "0xaa36a7";
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x3d490A5bE3da102790E59DBa4afb811941589A2b";

export const BetChainContext = createContext(null);

export const BetChainProvider = ({ children }) => {
  const [web3, setWeb3] = useState(null);
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);

  const setupProvider = async (ethereum, selectedAccount) => {
    const web3Instance = new Web3(ethereum);
    const contractInstance = new web3Instance.eth.Contract(
      BetChainABI,
      CONTRACT_ADDRESS
    );

    setWeb3(web3Instance);
    setAccount(selectedAccount);
    setContract(contractInstance);
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
      
      // ✅ Remove flag de desconexão manual ao conectar
      sessionStorage.removeItem("walletManuallyDisconnected");
    } catch (err) {
      console.error("Wallet connection error:", err);
    }
  };

  // ✅ DISCONNECT FUNCIONANDO
  const disconnectWallet = () => {
    setAccount(null);
    setContract(null);
    setWeb3(null);
    
    // ✅ Usa sessionStorage (só persiste na aba atual)
    // Expira quando fecha o browser
    sessionStorage.setItem("walletManuallyDisconnected", "true");
  };

  const checkWalletConnection = async () => {
    if (!window.ethereum) return;

    // ✅ Se desconectou manualmente, não reconecta automaticamente
    const manuallyDisconnected = sessionStorage.getItem("walletManuallyDisconnected");
    if (manuallyDisconnected === "true") {
      return;
    }

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
          // ✅ Remove flag se trocar de conta no MetaMask
          sessionStorage.removeItem("walletManuallyDisconnected");
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
        disconnectWallet, // ✅ Agora funciona
      }}
    >
      {children}
    </BetChainContext.Provider>
  );
};

export const useBetChain = () => useContext(BetChainContext);