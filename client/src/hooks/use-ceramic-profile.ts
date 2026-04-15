import { useState, useCallback, useRef } from "react";
import { useWallets } from "@privy-io/react-auth";
import { DIDSession } from "did-session";
import { EthereumWebAuth, getAccountId } from "@didtools/pkh-ethereum";
import {
  setCeramicDID,
  createCeramicProfile,
  updateCeramicProfile,
  loadCeramicProfile,
  type CeramicProfileData,
} from "@/lib/ceramic";

const SESSION_KEY = "pepo_ceramic_session";

/**
 * React hook that manages a Ceramic DID session and provides profile
 * read/write helpers backed by the user's Privy embedded Ethereum wallet.
 *
 * DID method: did:pkh:eip155:1:{walletAddress}
 * Session: SIWE EIP-4361, cached in localStorage, 7-day expiry.
 */
export function useCeramicProfile() {
  const { wallets } = useWallets();

  const [did, setDid] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionRef = useRef<DIDSession | null>(null);

  // ── DID session ────────────────────────────────────────────────────────────
  const authenticate = useCallback(async (): Promise<DIDSession | null> => {
    // Reuse a valid in-memory session
    if (sessionRef.current && !sessionRef.current.isExpired) {
      return sessionRef.current;
    }

    // Try restoring a previously serialised session from localStorage
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      if (stored) {
        const restored = await DIDSession.fromSession(stored);
        if (!restored.isExpired) {
          sessionRef.current = restored;
          setCeramicDID(restored.did);
          setDid(restored.did.id);
          return restored;
        }
      }
    } catch {
      /* expired or corrupt — fall through to create a new one */
    }

    // Pick the Privy embedded wallet, or any available wallet
    const wallet =
      wallets.find((w) => w.walletClientType === "privy") || wallets[0];
    if (!wallet) {
      setError("No wallet available. Connect a wallet to use Ceramic storage.");
      return null;
    }

    setAuthLoading(true);
    setError(null);
    try {
      const provider = await wallet.getEthereumProvider();
      const accountId = await getAccountId(provider as any, wallet.address);
      const authMethod = await EthereumWebAuth.getAuthMethod(
        provider as any,
        accountId
      );

      const session = await DIDSession.authorize(authMethod, {
        resources: ["ceramic://*"],
        expiresInSecs: 7 * 24 * 60 * 60, // 7 days
      });

      // Persist session so the user only signs once per week
      localStorage.setItem(SESSION_KEY, await session.serialize());
      sessionRef.current = session;
      setCeramicDID(session.did);
      setDid(session.did.id);
      return session;
    } catch (err: any) {
      setError(err?.message || "Ceramic authentication failed");
      return null;
    } finally {
      setAuthLoading(false);
    }
  }, [wallets]);

  // ── Save ───────────────────────────────────────────────────────────────────
  const saveProfile = useCallback(
    async (
      profileData: CeramicProfileData,
      existingStreamId?: string | null
    ): Promise<string | null> => {
      setSyncLoading(true);
      setError(null);
      try {
        const session = await authenticate();
        if (!session) return null;

        if (existingStreamId) {
          await updateCeramicProfile(existingStreamId, profileData);
          return existingStreamId;
        }
        return await createCeramicProfile(profileData);
      } catch (err: any) {
        setError(err?.message || "Failed to save profile to Ceramic");
        return null;
      } finally {
        setSyncLoading(false);
      }
    },
    [authenticate]
  );

  // ── Load ───────────────────────────────────────────────────────────────────
  const loadProfile = useCallback(
    async (streamId: string): Promise<CeramicProfileData | null> => {
      return loadCeramicProfile(streamId);
    },
    []
  );

  return {
    /** did:pkh:eip155:1:{walletAddress} — null until authenticated */
    did,
    isAuthenticated: !!did,
    /** Trigger DID authentication (prompts wallet signature if needed) */
    authenticate,
    /** Save profile to Ceramic. Creates a new stream or updates an existing one. */
    saveProfile,
    /** Load profile data from a stream ID (no auth required). */
    loadProfile,
    authLoading,
    syncLoading,
    error,
  };
}
