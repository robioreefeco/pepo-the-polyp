/**
 * IPFS integration via Pinata (https://github.com/PinataCloud/pinata-web3)
 *
 * Uploads are pinned to Pinata's IPFS nodes so they are permanently stored
 * and available through the dedicated gateway.  The `ipfs_blocks` table is
 * kept as a fast local cache so the API can serve files without a round-trip
 * to Pinata when the bytes are already known.
 */

import { PinataSDK } from "pinata";

const PINATA_JWT = process.env.PINATA_JWT || "";
const PINATA_GATEWAY = process.env.PINATA_GATEWAY || "gateway.pinata.cloud";

let _pinata: PinataSDK | null = null;

export function getPinata(): PinataSDK {
  if (_pinata) return _pinata;
  if (!PINATA_JWT) throw new Error("PINATA_JWT environment variable is not set");
  _pinata = new PinataSDK({ pinataJwt: PINATA_JWT, pinataGateway: PINATA_GATEWAY });
  console.log("[IPFS] Pinata client initialised, gateway:", PINATA_GATEWAY);
  return _pinata;
}

/**
 * Upload a Buffer to Pinata and return the CID string.
 */
export async function uploadToIPFS(buffer: Buffer, filename?: string): Promise<string> {
  const pinata = getPinata();
  const name = filename || `upload-${Date.now()}`;
  const file = new File([buffer as unknown as ArrayBuffer], name, { type: "application/octet-stream" });
  const result = await pinata.upload.public.file(file);
  console.log("[IPFS] pinned:", result.cid);
  return result.cid;
}

/**
 * Build a URL to serve a CID through our dedicated Pinata gateway.
 */
export function gatewayUrl(cid: string): string {
  return `https://${PINATA_GATEWAY}/ipfs/${cid}`;
}

/**
 * Multiple public gateway fallbacks (for the frontend to try in order).
 */
export function gatewayUrls(cid: string): string[] {
  return [
    gatewayUrl(cid),
    `https://ipfs.io/ipfs/${cid}`,
    `https://cloudflare-ipfs.com/ipfs/${cid}`,
  ];
}

/** The primary URL we expose on the frontend */
export function primaryGatewayUrl(cid: string): string {
  return gatewayUrl(cid);
}
