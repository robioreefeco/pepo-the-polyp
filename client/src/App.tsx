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
import { Governance } from "@/pages/Governance";
import { PublicProfile } from "@/pages/PublicProfile";
import { MobileMapPage } from "@/pages/MobileMapPage";
import { WorkspacePage } from "@/pages/WorkspacePage";
import { PRIVY_ENABLED, PRIVY_APP_ID } from "@/lib/privy";
import { useProfileSync } from "@/hooks/use-profile-sync";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useOrcidAuth } from "@/hooks/use-orcid-auth";
import { usePrivy } from "@privy-io/react-auth";
import { SplashScreen } from "@/components/SplashScreen";
import coralBg from "@assets/coral_reefs_1777179421866.jpg";

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
      <Route path="/governance" component={Governance} />
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

function LoginGate() {
  const { login } = usePrivy();
  const doLogin = () => { try { login(); } catch { /* ignore */ } };
  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center px-6">
      {/* Background image */}
      <img
        src={coralBg}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover"
      />
      {/* Dark overlay */}
      <div className="absolute inset-0" style={{ background: "linear-gradient(160deg,rgba(0,8,12,0.82) 0%,rgba(0,26,34,0.75) 60%,rgba(0,8,12,0.88) 100%)" }} />
      {/* Teal glow */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 60% 40% at 50% 40%, rgba(131,238,240,0.08) 0%, transparent 70%)" }} />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center">
        <img
          src="/figmaAssets/mesoreef-dao-logo-new.png"
          alt="MesoReef DAO"
          className="h-16 w-auto object-contain mb-8 opacity-90"
        />
        <h1 className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-bold text-[#d4e9f3] text-2xl md:text-3xl text-center mb-3 leading-tight">
          Pepo the Polyp
        </h1>
        <p className="[font-family:'Inter',Helvetica] text-[#d4e9f380] text-sm md:text-base text-center max-w-xs mb-8 leading-relaxed">
          Sign in to access the MesoReef DAO Coral Knowledge Network
        </p>

        {/* Primary: Privy (wallets + socials) */}
        <button
          onClick={doLogin}
          data-testid="button-gate-login"
          className="inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-full bg-[linear-gradient(170deg,#83eef0_0%,#3fb0b3_100%)] shadow-[0_4px_24px_rgba(131,238,240,0.3)] hover:shadow-[0_6px_32px_rgba(131,238,240,0.45)] hover:opacity-95 transition-all w-64"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3" stroke="#00585a" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="[font-family:'Inter',Helvetica] font-bold text-[#00585a] text-base leading-none">
            Sign in
          </span>
        </button>

      </div>
    </div>
  );
}

function AppInner() {
  useProfileSync();
  const { visible, dismiss } = useSplash();
  const { ready, authenticated } = usePrivy();
  const { orcidAuthenticated, isLoading: orcidLoading } = useOrcidAuth();
  const isAuthed = authenticated || orcidAuthenticated;
  const stillLoading = !ready || orcidLoading;

  return (
    <>
      {visible && <SplashScreen onDone={dismiss} />}
      <Toaster />
      {PRIVY_ENABLED ? <GeoSyncPrivy /> : <GeoSyncOrcidOnly />}
      {stillLoading
        ? <div className="fixed inset-0 z-30 flex items-center justify-center" style={{ background: "#00080c" }}>
            <div className="w-8 h-8 rounded-full border-2 border-[#83eef0] border-t-transparent animate-spin" />
          </div>
        : isAuthed
        ? <Router />
        : <LoginGate />
      }
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
  // Always wrap with PrivyProvider so Privy hooks can be called unconditionally
  // anywhere in the tree — the PRIVY_ENABLED flag only gates the login methods.
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID || "placeholder-disabled"}
      config={{
        loginMethods: PRIVY_ENABLED
          ? ["wallet", "google", "twitter", "github", "linkedin", "email"]
          : [],
        defaultChain: base,
        supportedChains: EVM_CHAINS,
        appearance: {
          theme: "dark",
          accentColor: "#83eef0",
          logo: `${window.location.origin}/transparent.png`,
          landingHeader: "Sign in to MesoReef DAO",
          loginMessage: "Access the Coral Reef Knowledge Network",
          walletChainType: "ethereum-only",
          showWalletLoginFirst: true,
          walletList: [
            "metamask",
            "coinbase_wallet",
            "rainbow",
            "rabby_wallet",
            "wallet_connect",
            "detected_wallets",
          ],
        },
        walletConnectCloudProjectId: "f5524663247ff0def1a83d46985aba41",
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

export default App;
