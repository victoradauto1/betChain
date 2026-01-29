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
 */
export async function saveBetMetadata(metadata) {
  if (!metadata?.betId) {
    throw new Error("metadata.betId is required");
  }

  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};

    const betId = metadata.betId.toString();

    stored[betId] = {
      betId,
      title: metadata.title || "",
      description: metadata.description || "",
      imageUrl: metadata.imageUrl || "",
      createdAt: Date.now(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));

    console.log(`[MetadataService] Saved metadata for bet #${betId}`);

    // Simulated IPFS / Fleek URI
    return `local://betchain/metadata/${betId}`;
  } catch (err) {
    console.error("[MetadataService] Save failed:", err);
    throw new Error(`Failed to save metadata: ${err.message}`);
  }
}

/**
 * Retrieve metadata for a specific bet
 */
export async function getBetMetadata(betId) {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    return stored[betId?.toString()] || null;
  } catch (err) {
    console.error("[MetadataService] Retrieval failed:", err);
    return null;
  }
}

/**
 * Retrieve all stored bet metadata
 *
 * ALWAYS returns an array (UI-safe)
 */
export async function getAllBetMetadata() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};

    return Object.values(stored)
      .sort((a, b) => b.createdAt - a.createdAt); // newest first
  } catch (err) {
    console.error("[MetadataService] Get all failed:", err);
    return [];
  }
}

/**
 * Delete metadata for a specific bet (admin/testing use)
 */
export async function deleteBetMetadata(betId) {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    const key = betId?.toString();

    if (!stored[key]) return false;

    delete stored[key];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));

    console.log(`[MetadataService] Deleted metadata for bet #${key}`);
    return true;
  } catch (err) {
    console.error("[MetadataService] Delete failed:", err);
    return false;
  }
}

/**
 * Clear all metadata (testing/reset use)
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