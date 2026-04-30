/**
 * IPFS integration via Helia (https://github.com/ipfs/helia)
 *
 * Uses in-memory blockstore/datastore (no filesystem dependency) so this
 * works on any deployment environment including autoscale instances.
 *
 * Image bytes are persisted in the `ipfs_blocks` PostgreSQL table so they
 * survive server restarts.  The local Helia node is used only for CID
 * computation (content-addressed hashing) — actual storage is the DB.
 */

import { createHelia, type Helia } from "helia";
import { unixfs, type UnixFS } from "@helia/unixfs";
import { MemoryBlockstore } from "blockstore-core";
import { MemoryDatastore } from "datastore-core";
import { CID } from "multiformats/cid";

let _helia: Helia | null = null;
let _fs: UnixFS | null = null;

export async function getHelia(): Promise<{ helia: Helia; fs: UnixFS }> {
  if (_helia && _fs) return { helia: _helia, fs: _fs };

  const blockstore = new MemoryBlockstore();
  const datastore = new MemoryDatastore();

  _helia = await createHelia({
    blockstore,
    datastore,
    blockBrokers: [],
    routers: [],
  });

  _fs = unixfs(_helia);
  console.log("[IPFS] Helia node started (memory mode)");
  return { helia: _helia, fs: _fs };
}

/**
 * Add a Buffer to the local in-memory IPFS node.
 * Returns the CID string.  The caller is responsible for persisting bytes to DB.
 */
export async function uploadToIPFS(buffer: Buffer, _filename?: string): Promise<string> {
  const { fs } = await getHelia();
  const cid = await fs.addBytes(buffer);
  return cid.toString();
}

/**
 * Read all bytes for a given CID from the in-memory Helia node.
 * Returns null if not found in memory (e.g. after a restart).
 */
export async function getIPFSBytes(cidStr: string): Promise<Buffer | null> {
  try {
    const { fs } = await getHelia();
    const cid = CID.parse(cidStr);
    const chunks: Uint8Array[] = [];
    for await (const chunk of fs.cat(cid)) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  } catch {
    return null;
  }
}

/**
 * Re-hydrate the in-memory Helia node from raw bytes.
 * Call this after loading bytes from DB so the CID is addressable in memory.
 */
export async function hydrateIPFS(buffer: Buffer): Promise<string> {
  const { fs } = await getHelia();
  const cid = await fs.addBytes(buffer);
  return cid.toString();
}

/** Public gateway URLs for a given CID */
export function gatewayUrls(cid: string): string[] {
  return [
    `https://ipfs.io/ipfs/${cid}`,
    `https://cloudflare-ipfs.com/ipfs/${cid}`,
    `https://dweb.link/ipfs/${cid}`,
  ];
}

/** The primary public gateway URL we expose on the frontend */
export function primaryGatewayUrl(cid: string): string {
  return `https://ipfs.io/ipfs/${cid}`;
}
