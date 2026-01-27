import { ethers } from "ethers";
import BetChainABI from "../abi/BetChain.json";

const SEPOLIA_RPC =
  process.env.NEXT_PUBLIC_RPC_URL ||
  "https://ethereum-sepolia-rpc.publicnode.com";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

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
 * Read-only contract instance
 * Conveniência para não ter que instanciar Contract manualmente
 */
export async function getReadOnlyContract() {
  if (!CONTRACT_ADDRESS) {
    throw new Error("NEXT_PUBLIC_CONTRACT_ADDRESS is not configured in environment variables");
  }

  console.log("[ReadOnlyContract] Using contract:", CONTRACT_ADDRESS);

  const provider = await getReadOnlyProvider();
  const contract = new ethers.Contract(CONTRACT_ADDRESS, BetChainABI, provider);

  return contract;
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