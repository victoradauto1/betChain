import { ethers } from "ethers";

const SEPOLIA_RPC = process.env.NEXT_PUBLIC_RPC_URL;

/**
 * Returns a provider for read-only blockchain access.
 * - Does NOT require a wallet connection
 * - Safe for mobile, desktop, with or without MetaMask
 *
 * Write operations must use the wallet-connected provider.
 */
export function getReadOnlyProvider() {
  return new ethers.JsonRpcProvider(SEPOLIA_RPC);
}
