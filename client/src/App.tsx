import { Switch, Route } from "wouter";
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
import { PRIVY_ENABLED, PRIVY_APP_ID } from "@/lib/privy";
import { useProfileSync } from "@/hooks/use-profile-sync";
import pepoPng from "@assets/MesoReefDAO_Pepo_The_Polyp_1776218766670.png";

const EVM_CHAINS = [mainnet, polygon, base, arbitrum, optimism, avalanche];

function Router() {
  return (
    <Switch>
      <Route path="/" component={Body} />
      <Route path="/profile" component={UserProfileDashboard} />
      <Route path="/community" component={CommunityLeaderboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppInner() {
  useProfileSync();
  return (
    <>
      <Toaster />
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
            logo: pepoPng,
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
