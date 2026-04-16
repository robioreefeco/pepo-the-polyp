import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface OrcidSession {
  authenticated: boolean;
  orcidId?: string;
  orcidName?: string;
  profileId?: string;
}

export function useOrcidAuth() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<OrcidSession>({
    queryKey: ["/api/auth/orcid/session"],
    staleTime: 30_000,
    retry: false,
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await fetch("/api/auth/orcid/logout", { method: "POST" });
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/orcid/session"], { authenticated: false });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/orcid/session"] });
    },
  });

  const session = data ?? { authenticated: false };

  return {
    orcidAuthenticated: session.authenticated,
    orcidId: session.orcidId,
    orcidName: session.orcidName,
    profileId: session.profileId,
    isLoading,
    error,
    logout: () => logoutMutation.mutate(),
    isLoggingOut: logoutMutation.isPending,
  };
}
