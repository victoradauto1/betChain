import { ethers } from "ethers";

const SEPOLIA_RPC =
  process.env.NEXT_PUBLIC_RPC_URL ||
  "https://ethereum-sepolia-rpc.publicnode.com";

/**
 * Read-only provider (RPC público)
 * Usado para leitura de dados (sem wallet)
 */
export async function getReadOnlyProvider() {
  console.log("[ReadOnlyProvider] RPC URL:", SEPOLIA_RPC);

  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);

  try {
    const network = await provider.getNetwork();
    console.log(
      "[ReadOnlyProvider] Connected | chainId:",
      Number(network.chainId),
      "| name:",
      network.name
    );
  } catch (err) {
    console.error("[ReadOnlyProvider] RPC connection failed:", err);
    throw err;
  }

  return provider;
}

/**
 * Wallet provider (MetaMask)
 * Usado APENAS para escrita
 */
export async function getWalletProvider() {
  if (typeof window === "undefined") {
    throw new Error("Window not available (SSR)");
  }

  if (!window.ethereum) {
    throw new Error("No wallet found. Please install MetaMask.");
  }

  console.log("[WalletProvider] Wallet detected");

  const provider = new ethers.BrowserProvider(window.ethereum);

  try {
    await provider.send("eth_requestAccounts", []);

    const network = await provider.getNetwork();
    console.log(
      "[WalletProvider] Connected | chainId:",
      Number(network.chainId),
      "| name:",
      network.name
    );
  } catch (err) {
    console.error("[WalletProvider] Wallet connection failed:", err);
    throw err;
  }

  return provider;
}
