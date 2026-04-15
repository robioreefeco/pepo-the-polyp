import { CeramicClient } from "@ceramicnetwork/http-client";
import { TileDocument } from "@ceramicnetwork/stream-tile";
import type { DID } from "dids";

// Ceramic node URL — set VITE_CERAMIC_API_URL to a writable node for full functionality.
// Defaults to the Ceramic mainnet gateway (read-only) so public profiles always load.
const CERAMIC_URL =
  (import.meta.env.VITE_CERAMIC_API_URL as string) ||
  "https://gateway.ceramic.network";

// IDX-compatible family tag — keeps streams discoverable in the broader Ceramic ecosystem
const STREAM_FAMILY = "MesoReefDAOProfile";

// ─── Profile data model ────────────────────────────────────────────────────────
export interface CeramicProfileData {
  displayName?: string;
  bio?: string;
  location?: string;
  website?: string;
  tags?: string[];
  orcidId?: string;
  orcidName?: string;
  avatarUrl?: string;
  updatedAt?: number;
}

// ─── Singleton client ──────────────────────────────────────────────────────────
let _client: CeramicClient | null = null;

export function getCeramicClient(): CeramicClient {
  if (!_client) _client = new CeramicClient(CERAMIC_URL);
  return _client;
}

/** Attach an authenticated DID to the Ceramic client (required before writes). */
export function setCeramicDID(did: DID): void {
  getCeramicClient().did = did;
}

// ─── Profile operations ────────────────────────────────────────────────────────

/**
 * Create a new IDX-compatible TileDocument for the user's profile.
 * Returns the Ceramic stream ID (store this in PostgreSQL).
 */
export async function createCeramicProfile(
  profileData: CeramicProfileData
): Promise<string> {
  const ceramic = getCeramicClient();
  if (!ceramic.did?.authenticated) {
    throw new Error(
      "Ceramic DID not authenticated. Call setCeramicDID() first."
    );
  }
  const doc = await TileDocument.create(
    ceramic,
    { ...profileData, updatedAt: Date.now() },
    { family: STREAM_FAMILY, tags: ["mesoreef", "profile"] },
    { anchor: false, publish: true }
  );
  return doc.id.toString();
}

/**
 * Update an existing profile stream.
 * The authenticated DID must be the controller of the stream.
 */
export async function updateCeramicProfile(
  streamId: string,
  profileData: CeramicProfileData
): Promise<void> {
  const ceramic = getCeramicClient();
  if (!ceramic.did?.authenticated) {
    throw new Error("Ceramic DID not authenticated.");
  }
  const doc = await TileDocument.load<CeramicProfileData>(ceramic, streamId);
  await doc.update(
    { ...profileData, updatedAt: Date.now() },
    undefined,
    { anchor: false, publish: true }
  );
}

/**
 * Load a profile stream — read-only, no authentication required.
 * Works with both the mainnet gateway and writable nodes.
 */
export async function loadCeramicProfile(
  streamId: string
): Promise<CeramicProfileData | null> {
  try {
    const ceramic = getCeramicClient();
    const doc = await TileDocument.load<CeramicProfileData>(ceramic, streamId);
    return doc.content ?? null;
  } catch (err) {
    console.warn("[Ceramic] Failed to load profile stream:", err);
    return null;
  }
}

/** Returns the explorer URL for a given stream on the Ceramic mainnet. */
export function ceramicStreamUrl(streamId: string): string {
  return `https://cerscan.com/mainnet/stream/${streamId}`;
}
