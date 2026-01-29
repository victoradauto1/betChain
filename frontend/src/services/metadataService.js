/**
 * metadataService
 *
 * Off-chain metadata persistence layer.
 * Uses backend API to pin metadata to IPFS (Pinata).
 *
 * IMPORTANT: This interface MUST remain stable.
 */

/**
 * Save bet metadata off-chain (IPFS via backend)
 */
export async function saveBetMetadata(metadata) {
  if (!metadata?.betId) {
    throw new Error("metadata.betId is required");
  }

  try {
    const response = await fetch("/api/metadata", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        betId: metadata.betId.toString(),
        title: metadata.title || "",
        description: metadata.description || "",
        imageUrl: metadata.imageUrl || "",
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err?.message || "Metadata upload failed");
    }

    const { uri } = await response.json();

    console.log(`[MetadataService] Metadata pinned: ${uri}`);

    // ipfs://CID
    return uri;
  } catch (err) {
    console.error("[MetadataService] Save failed:", err);
    throw err;
  }
}

/**
 * Retrieve metadata for a specific bet
 */
export async function getBetMetadata(betId) {
  try {
    const res = await fetch(`/api/metadata?betId=${betId}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error("[MetadataService] Retrieval failed:", err);
    return null;
  }
}

/**
 * Retrieve all stored bet metadata
 */
export async function getAllBetMetadata() {
  try {
    const res = await fetch("/api/metadata/all");
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.error("[MetadataService] Get all failed:", err);
    return [];
  }
}

/**
 * Delete metadata (admin/testing only)
 */
export async function deleteBetMetadata(betId) {
  try {
    const res = await fetch(`/api/metadata?betId=${betId}`, {
      method: "DELETE",
    });
    return res.ok;
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
    const res = await fetch("/api/metadata/clear", {
      method: "POST",
    });
    return res.ok;
  } catch (err) {
    console.error("[MetadataService] Clear failed:", err);
    return false;
  }
}