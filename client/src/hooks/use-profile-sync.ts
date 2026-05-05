import { useEffect, useRef } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { PRIVY_ENABLED } from "@/lib/privy";
import { queryClient } from "@/lib/queryClient";

/**
 * Fires once when Privy authenticates a user.
 * Syncs the user's profile to the backend and awards first-login bonus.
 */
export function useProfileSync() {
  const { ready, authenticated, user, getAccessToken } = usePrivy();
  const synced = useRef(false);

  useEffect(() => {
    if (!PRIVY_ENABLED) return;
    if (!ready || !authenticated || !user || synced.current) return;
    synced.current = true;

    async function sync() {
      try {
        const token = await getAccessToken();
        if (!token) return;

        const linked = user!.linkedAccounts ?? [];
        const twitterAcct = linked.find((a: any) => a.type === "twitter_oauth") as any;
        const emailAcct = linked.find((a: any) => a.type === "email") as any;
        const googleAcct = linked.find((a: any) => a.type === "google_oauth") as any;

        const displayName =
          twitterAcct?.name ||
          twitterAcct?.username?.replace(/^/, "@") ||
          googleAcct?.name ||
          emailAcct?.address?.split("@")[0] ||
          "Explorer";

        await fetch("/api/profiles/sync", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-privy-token": token,
          },
          body: JSON.stringify({ displayName }),
        });

        queryClient.invalidateQueries({ queryKey: ["/api/leaderboard"] });
        queryClient.invalidateQueries({ queryKey: ["/api/profiles"] });
      } catch (err) {
        console.warn("[useProfileSync] sync failed:", err);
      }
    }

    sync();
  }, [ready, authenticated, user?.id]);
}
