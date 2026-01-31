const FALLBACK_IMAGE = "/icon.png";

export function resolveImageUrl(raw) {
  if (!raw || typeof raw !== "string") return FALLBACK_IMAGE;

  const url = raw.trim();

  // IPFS URI
  if (url.startsWith("ipfs://")) {
    return `https://ipfs.io/ipfs/${url.slice(7)}`;
  }

  // External URL
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  // Invalid or unsupported format
  return FALLBACK_IMAGE;
}