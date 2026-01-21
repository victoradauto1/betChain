// frontend/src/services/metadataService.js

/**
 * metadataService (MOCK)
 *
 * Temporary off-chain metadata persistence layer.
 * This mock simulates a decentralized storage (IPFS / Fleek)
 * using localStorage as the backing store.
 *
 * This interface MUST remain stable so it can be replaced
 * later without refactoring UI components.
 */

const STORAGE_KEY = "betchain:metadata";

/**
 * Save bet metadata off-chain
 *
 * @param {Object} metadata
 * @param {string|number} metadata.betId
 * @param {string} metadata.title
 * @param {string} metadata.description
 * @param {string} metadata.imageUrl
 *
 * @returns {string} metadataURI
 */
export function saveBetMetadata(metadata) {
  if (!metadata?.betId) {
    throw new Error("metadata.betId is required");
  }

  const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};

  stored[metadata.betId.toString()] = {
    ...metadata,
    betId: metadata.betId.toString(),
    createdAt: Date.now(),
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));

  // Simulated decentralized URI (IPFS/Fleek in the future)
  return `local://betchain/metadata/${metadata.betId}`;
}

/**
 * Retrieve metadata for a specific bet
 *
 * @param {string|number} betId
 * @returns {Object|null}
 */
export function getBetMetadata(betId) {
  const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  return stored[betId?.toString()] || null;
}

/**
 * Retrieve all stored bet metadata
 *
 * @returns {Array<Object>}
 */
export function getAllBetMetadata() {
  const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  return Object.values(stored);
}
