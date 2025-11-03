import React, { createContext, useState, useEffect } from "react";
import Web3 from "web3";
import ABI from "../ABI.json"; // Adjust the path according to your project structure

// Create React Context
const BetChainContext = createContext();

// Contract address
const CONTRACT_ADDRESS = "0x8858B329210b716C1bF1fd745995EA2be9df925A";

export const BetChainProvider = ({ children }) => {
  // State variables
  const [account, setAccount] = useState(null); // Connected wallet address
  const [contract, setContract] = useState(null); // Contract instance
  const [web3, setWeb3] = useState(null); // Web3 instance
  const [dispute, setDispute] = useState(null); // Current dispute data
  const [isLoading, setIsLoading] = useState(false); // Loading state

  /**
   * Connects to MetaMask wallet
   */
  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("MetaMask is not installed.");
      return;
    }

    try {
      const web3Instance = new Web3(window.ethereum);
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const connectedAccount = accounts[0];

      setAccount(connectedAccount);
      setWeb3(web3Instance);

      // Create contract instance
      const contractInstance = new web3Instance.eth.Contract(ABI, CONTRACT_ADDRESS);
      setContract(contractInstance);

      localStorage.setItem("wallet", connectedAccount); // Save wallet for persistence
    } catch (error) {
      console.error("Error connecting to MetaMask:", error);
    }
  };

  /**
   * Fetches the current dispute from the contract
   */
  const fetchDispute = async () => {
    if (!contract) return;
    try {
      const result = await contract.methods.dispute().call();
      setDispute(result);
    } catch (error) {
      console.error("Error fetching dispute:", error);
    }
  };

  /**
   * Places a bet on a given candidate
   * @param candidate Candidate ID to bet on
   * @param amountInEth Amount in ETH to bet
   */
  const placeBet = async (candidate, amountInEth) => {
    if (!contract || !account) return;
    setIsLoading(true);
    try {
      await contract.methods.bet(candidate).send({
        from: account,
        value: Web3.utils.toWei(amountInEth, "ether"),
      });
      await fetchDispute(); // Refresh dispute data after betting
    } catch (error) {
      console.error("Error placing bet:", error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Finalizes the dispute and declares the winner
   * @param winner Winner candidate ID
   */
  const finishDispute = async (winner) => {
    if (!contract || !account) return;
    setIsLoading(true);
    try {
      await contract.methods.finish(winner).send({ from: account });
      await fetchDispute(); // Refresh dispute data after finalizing
    } catch (error) {
      console.error("Error finalizing dispute:", error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Claims the prize for the connected account
   */
  const claimPrize = async () => {
    if (!contract || !account) return;
    setIsLoading(true);
    try {
      await contract.methods.claim().send({ from: account });
    } catch (error) {
      console.error("Error claiming prize:", error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Automatically reconnects wallet if already connected
   */
  useEffect(() => {
    const saved = localStorage.getItem("wallet");
    if (saved && window.ethereum) {
      connectWallet();
    }
  }, []);

  return (
    <BetChainContext.Provider
      value={{
        account,       // Wallet address
        dispute,       // Current dispute data
        isLoading,     // Loading state
        connectWallet, // Function to connect wallet
        fetchDispute,  // Function to fetch dispute
        placeBet,      // Function to place bet
        finishDispute, // Function to finish dispute
        claimPrize,    // Function to claim prize
      }}
    >
      {children}
    </BetChainContext.Provider>
  );
};

export default BetChainContext;
