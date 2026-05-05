import { useQuery } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";
import { useOrcidAuth } from "@/hooks/use-orcid-auth";

export function useProfileStatus() {
  const { authenticated, user } = usePrivy();
  const { orcidAuthenticated, profileId: orcidProfileId } = useOrcidAuth();
  const isAuthed = authenticated || orcidAuthenticated;

  const activeProfileId = orcidAuthenticated && !authenticated
    ? orcidProfileId
    : user?.id;

  const { data } = useQuery<any>({
    queryKey: ["/api/profiles", activeProfileId],
    enabled: isAuthed && !!activeProfileId,
    staleTime: 60_000,
  });

  const profile = data?.profile;

  const hasName = !!(profile?.displayName && !["Explorer", "Researcher"].includes(profile.displayName));
  const hasBio = !!(profile?.bio && profile.bio.length > 10);
  const hasOrcid = !!profile?.orcidId;
  const hasAvatar = !!(profile?.avatarCid || profile?.avatarUrl);

  const completedCount = [hasName, hasBio, hasOrcid, hasAvatar].filter(Boolean).length;
  const totalCount = 4;
  const isComplete = completedCount === totalCount;

  return { isComplete, completedCount, totalCount, isAuthed };
}
