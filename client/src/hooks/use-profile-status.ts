import { useQuery } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";
import { useOrcidAuth } from "@/hooks/use-orcid-auth";

interface Profile {
  displayName: string;
  bio: string;
  orcidId: string;
  avatarCid: string;
  avatarUrl: string;
  points: number;
}

export function useProfileStatus() {
  const { authenticated } = usePrivy();
  const { orcidAuthenticated } = useOrcidAuth();
  const isAuthed = authenticated || orcidAuthenticated;

  const { data: profile } = useQuery<Profile>({
    queryKey: ["/api/profiles/me"],
    enabled: isAuthed,
    staleTime: 60_000,
  });

  const hasName = !!(profile?.displayName && !["Explorer", "Researcher"].includes(profile.displayName));
  const hasBio = !!(profile?.bio && profile.bio.length > 10);
  const hasOrcid = !!profile?.orcidId;
  const hasAvatar = !!(profile?.avatarCid || profile?.avatarUrl);

  const completedCount = [hasName, hasBio, hasOrcid, hasAvatar].filter(Boolean).length;
  const totalCount = 4;
  const isComplete = completedCount === totalCount;

  return { isComplete, completedCount, totalCount, isAuthed };
}
