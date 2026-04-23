import { Switch, Route } from "wouter";
import { useState } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PrivyProvider } from "@privy-io/react-auth";
import { mainnet, polygon, base, arbitrum, optimism, avalanche } from "viem/chains";
import NotFound from "@/pages/not-found";
import { Body } from "@/pages/Body";
import { UserProfileDashboard } from "@/pages/UserProfileDashboard";
import { CommunityLeaderboard } from "@/pages/CommunityLeaderboard";
import { PublicProfile } from "@/pages/PublicProfile";
import { MobileMapPage } from "@/pages/MobileMapPage";
import { WorkspacePage } from "@/pages/WorkspacePage";
import { PRIVY_ENABLED, PRIVY_APP_ID } from "@/lib/privy";
import { useProfileSync } from "@/hooks/use-profile-sync";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useOrcidAuth } from "@/hooks/use-orcid-auth";
import { usePrivy } from "@privy-io/react-auth";
import { SplashScreen } from "@/components/SplashScreen";

function useSplash() {
  const seen = sessionStorage.getItem("pepo_splash_seen");
  const [visible, setVisible] = useState(!seen);
  const dismiss = () => {
    sessionStorage.setItem("pepo_splash_seen", "1");
    setVisible(false);
  };
  return { visible, dismiss };
}

const EVM_CHAINS = [mainnet, polygon, base, arbitrum, optimism, avalanche];

function Router() {
  return (
    <Switch>
      <Route path="/" component={Body} />
      <Route path="/profile" component={UserProfileDashboard} />
      <Route path="/community" component={CommunityLeaderboard} />
      <Route path="/members/:id" component={PublicProfile} />
      <Route path="/map" component={MobileMapPage} />
      <Route path="/workspace" component={WorkspacePage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function GeoSyncPrivy() {
  const { authenticated, getAccessToken } = usePrivy();
  const { orcidAuthenticated } = useOrcidAuth();
  const isAuthed = authenticated || orcidAuthenticated;
  useGeolocation(isAuthed, getAccessToken, orcidAuthenticated && !authenticated);
  return null;
}

function GeoSyncOrcidOnly() {
  const { orcidAuthenticated } = useOrcidAuth();
  useGeolocation(orcidAuthenticated, null, true);
  return null;
}

function AppInner() {
  useProfileSync();
  const { visible, dismiss } = useSplash();
  return (
    <>
      {visible && <SplashScreen onDone={dismiss} />}
      <Toaster />
      {PRIVY_ENABLED ? <GeoSyncPrivy /> : <GeoSyncOrcidOnly />}
      <Router />
    </>
  );
}

function AppContent() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppInner />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

function App() {
  if (PRIVY_ENABLED) {
    return (
      <PrivyProvider
        appId={PRIVY_APP_ID}
        config={{
          loginMethods: ["wallet", "email", "google", "twitter", "linkedin"],
          defaultChain: mainnet,
          supportedChains: EVM_CHAINS,
          appearance: {
            theme: "dark",
            accentColor: "#83eef0",
            logo: `${window.location.origin}/transparent.png`,
            landingHeader: "Sign in to MesoReef DAO",
            loginMessage: "Access the Coral Reef Knowledge Network",
            walletChainType: "ethereum-only",
            walletList: [
              "coinbase_wallet",
              "rainbow",
              "zerion",
              "uniswap",
              "okx_wallet",
              "metamask",
            ],
          },
          embeddedWallets: {
            ethereum: { createOnLogin: "users-without-wallets" },
            showWalletUIs: true,
          },
        }}
      >
        <AppContent />
      </PrivyProvider>
    );
  }

  return <AppContent />;
}

export default App;
