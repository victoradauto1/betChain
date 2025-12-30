import { ethers } from "ethers";

/**
 * mapBetFromContract - Transforms contract data into a standardized format
 * 
 * Used when fetching data manually and you want to normalize it
 * Converts BigInt values to Number/String to avoid serialization issues
 * 
 * @param {Object} raw - Raw data returned from the contract
 * @returns {Object} Normalized bet data
 */
export function mapBetFromContract(raw) {
  return {
    id: Number(raw.id),
    creator: raw.creator,
    title: raw.title,
    description: raw.description,
    imageUrl: raw.imageUrl,
    totalPool: ethers.formatEther(raw.totalPool), // BigInt → String "1.5"
    active: raw.active,
    finalized: raw.finalized,
    deadline: Number(raw.deadline),
    options: raw.options.map((opt) => ({
      name: opt.name,
      amount: ethers.formatEther(opt.amount),
    })),
  };
}
