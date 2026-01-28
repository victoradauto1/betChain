/**
 * metadataService
 *
 * Off-chain metadata persistence layer.
 * Currently uses localStorage as mock for development.
 * Ready to be replaced with Fleek/IPFS without refactoring UI.
 *
 * IMPORTANT: This interface must remain stable for easy migration.
 */

const STORAGE_KEY = "betchain:metadata";

/**
 * Save bet metadata off-chain
 *
 * @param {Object} metadata
 * @param {string|number} metadata.betId - Bet ID
 * @param {string} metadata.title - Bet title
 * @param {string} metadata.description - Bet description (optional)
 * @param {string} metadata.imageUrl - Image URL (optional)
 *
 * @returns {Promise<string>} metadataURI - Simulated IPFS/Fleek URI
 */
export async function saveBetMetadata(metadata) {
  if (!metadata?.betId) {
    throw new Error("metadata.betId is required");
  }

  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};

    stored[metadata.betId.toString()] = {
      betId: metadata.betId.toString(),
      title: metadata.title || "",
      description: metadata.description || "",
      imageUrl: metadata.imageUrl || "",
      createdAt: Date.now(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));

    console.log(`[MetadataService] Saved metadata for bet #${metadata.betId}`);

    return `local://betchain/metadata/${metadata.betId}`;
  } catch (err) {
    console.error("[MetadataService] Save failed:", err);
    throw new Error(`Failed to save metadata: ${err.message}`);
  }
}

/**
 * Retrieve metadata for a specific bet
 *
 * @param {string|number} betId - Bet ID to fetch
 * @returns {Promise<Object|null>} Metadata object or null if not found
 */
export async function getBetMetadata(betId) {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    const metadata = stored[betId?.toString()] || null;

    if (metadata) {
      console.log(`[MetadataService] Retrieved metadata for bet #${betId}`);
    }

    return metadata;
  } catch (err) {
    console.error("[MetadataService] Retrieval failed:", err);
    return null;
  }
}

/**
 * Retrieve all stored bet metadata
 *
 * @returns {Promise<Array<Object>>} Array of all metadata objects
 */
export async function getAllBetMetadata() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    return Object.values(stored);
  } catch (err) {
    console.error("[MetadataService] Get all failed:", err);
    return [];
  }
}

/**
 * Delete metadata for a specific bet (admin/testing use)
 *
 * @param {string|number} betId - Bet ID to delete
 * @returns {Promise<boolean>} Success status
 */
export async function deleteBetMetadata(betId) {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    
    if (stored[betId?.toString()]) {
      delete stored[betId.toString()];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
      console.log(`[MetadataService] Deleted metadata for bet #${betId}`);
      return true;
    }

    return false;
  } catch (err) {
    console.error("[MetadataService] Delete failed:", err);
    return false;
  }
}

/**
 * Clear all metadata (testing/reset use)
 *
 * @returns {Promise<boolean>} Success status
 */
export async function clearAllMetadata() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log("[MetadataService] Cleared all metadata");
    return true;
  } catch (err) {
    console.error("[MetadataService] Clear failed:", err);
    return false;
  }
}