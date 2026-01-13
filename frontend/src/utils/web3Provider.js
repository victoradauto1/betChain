import { ethers } from "ethers";

const SEPOLIA_RPC = 
  process.env.NEXT_PUBLIC_RPC_URL || 
  "https://ethereum-sepolia-rpc.publicnode.com";

/**
 * Read-only provider for public data
 * 
 * ALWAYS uses public RPC (never wallet)
 * Works on desktop, mobile, with/without wallet
 * 
 * Used for: viewing bets, lists, details
 */
export function getReadOnlyProvider() {
  return new ethers.JsonRpcProvider(SEPOLIA_RPC);
}

/**
 * Wallet-connected provider for transactions
 * 
 * ONLY for write operations (placeBet, createBet, etc)
 * Requires MetaMask/wallet installed
 * 
 * Used for: placing bets, creating bets, signing transactions
 */
export async function getWalletProvider() {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("No wallet found. Please install MetaMask.");
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  
  // Request account access
  await provider.send("eth_requestAccounts", []);

  return provider;
}
