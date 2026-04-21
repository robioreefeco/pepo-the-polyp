/**
 * IPFS integration via Helia (https://github.com/ipfs/helia)
 *
 * Runs a local Helia node with filesystem-backed blockstore/datastore.
 * No libp2p networking — we only need content-addressed local storage +
 * CID generation.  Files are also accessible via public IPFS HTTP gateways
 * using the returned CID.
 */

import path from "path";
import { createHelia, type Helia } from "helia";
import { unixfs, type UnixFS } from "@helia/unixfs";
import { FsBlockstore } from "blockstore-fs";
import { FsDatastore } from "datastore-fs";
import { CID } from "multiformats/cid";

const DATA_DIR = path.resolve(process.cwd(), "ipfs-data");
const BLOCK_DIR = path.join(DATA_DIR, "blocks");
const STORE_DIR = path.join(DATA_DIR, "datastore");

let _helia: Helia | null = null;
let _fs: UnixFS | null = null;

export async function getHelia(): Promise<{ helia: Helia; fs: UnixFS }> {
  if (_helia && _fs) return { helia: _helia, fs: _fs };

  const blockstore = new FsBlockstore(BLOCK_DIR);
  const datastore = new FsDatastore(STORE_DIR);

  _helia = await createHelia({
    blockstore,
    datastore,
    blockBrokers: [],   // offline mode — no peer-to-peer networking
    routers: [],        // no DHT routing needed
  });

  _fs = unixfs(_helia);
  console.log("[IPFS] Helia node started (offline mode)");
  return { helia: _helia, fs: _fs };
}

/**
 * Add a Buffer to the local IPFS node.
 * Returns the CID string (base36 multibase).
 */
export async function uploadToIPFS(buffer: Buffer, _filename?: string): Promise<string> {
  const { fs } = await getHelia();
  const cid = await fs.addBytes(buffer);
  return cid.toString();
}

/**
 * Read all bytes for a given CID from the local Helia node.
 * Returns null if not found locally.
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
