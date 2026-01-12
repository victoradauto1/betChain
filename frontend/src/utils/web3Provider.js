import { ethers } from "ethers";

const SEPOLIA_RPC = process.env.NEXT_PUBLIC_RPC_URL;

/**
 * Returns a provider for read-only blockchain access.
 * - Does NOT require a wallet connection
 * - Used for public pages (lists, details, previews)
 *
 * Write operations must use the wallet-connected provider.
 */
export function getReadOnlyProvider() {
  if (typeof window !== "undefined" && window.ethereum) {
    return new ethers.BrowserProvider(window.ethereum);
  }
  
  return new ethers.JsonRpcProvider(SEPOLIA_RPC);
}