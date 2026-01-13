import { ethers } from "ethers";

const SEPOLIA_RPC = process.env.NEXT_PUBLIC_RPC_URL;

/**
 * Read-only provider
 * - NEVER depends on wallet
 * - Safe for SSR, desktop and mobile
 * - Used for public data (lists, details, previews)
 */
export function getReadOnlyProvider() {
  if (!SEPOLIA_RPC) {
    throw new Error("Missing NEXT_PUBLIC_RPC_URL");
  }

  return new ethers.JsonRpcProvider(SEPOLIA_RPC);
}

/**
 * Wallet-connected provider
 * - ONLY for write operations (transactions, votes, bets)
 * - Requires user interaction
 */
export async function getWalletProvider() {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("No wallet found");
  }

  const provider = new ethers.BrowserProvider(window.ethereum);

  // Explicit permission request
  await provider.send("eth_requestAccounts", []);

  return provider;
}
