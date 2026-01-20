/**
 * metadataService (MOCK)
 *
 * Temporary off-chain metadata persistence layer.
 * This mock simulates a decentralized storage (IPFS / Fleek)
 * using localStorage as the backing store.
 *
 * This file MUST expose a stable interface so it can be
 * replaced later without refactoring UI components.
 */

const STORAGE_KEY = "betchain:metadata";

/**
 * Save metadata for a given betId
 */
export async function saveBetMetadata(betId, metadata) {
  if (betId === undefined || betId === null) {
    throw new Error("Invalid betId");
  }

  const stored = localStorage.getItem(STORAGE_KEY);
  const parsed = stored ? JSON.parse(stored) : {};

  parsed[betId.toString()] = {
    ...metadata,
    betId: betId.toString(),
    createdAt: Date.now(),
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));

  return parsed[betId.toString()];
}

/**
 * Retrieve metadata for a single betId
 */
export async function getBetMetadata(betId) {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;

  const parsed = JSON.parse(stored);
  return parsed[betId.toString()] || null;
}

/**
 * Retrieve ALL stored bet metadata
 */
export async function getAllBetMetadata() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];

  const parsed = JSON.parse(stored);
  return Object.values(parsed);
}
