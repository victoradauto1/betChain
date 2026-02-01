const FALLBACK_IMAGE = "/icon.png";

const IPFS_GATEWAY = "https://gateway.pinata.cloud/ipfs/";

export default function resolveImageUrl(raw) {
  if (!raw || typeof raw !== "string") return FALLBACK_IMAGE;

  const url = raw.trim();

  if (url.startsWith("ipfs://")) {
    const hash = url.replace("ipfs://", "");
    return `${IPFS_GATEWAY}${hash}`;
  }

  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  return FALLBACK_IMAGE;
}
