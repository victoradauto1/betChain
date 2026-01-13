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
  console.log("[Provider] getReadOnlyProvider called");

  console.log("[Provider] window exists:", typeof window !== "undefined");

  if (typeof window !== "undefined") {
    console.log("[Provider] window.ethereum:", window.ethereum);
  }

  if (typeof window !== "undefined" && window.ethereum) {
    console.log("[Provider] Using BrowserProvider (window.ethereum)");
    return new ethers.BrowserProvider(window.ethereum);
  }

  console.log("[Provider] Using JsonRpcProvider (RPC fallback)");
  console.log("[Provider] RPC URL:", SEPOLIA_RPC);

  return new ethers.JsonRpcProvider(SEPOLIA_RPC);
}
