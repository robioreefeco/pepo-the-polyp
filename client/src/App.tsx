import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PrivyProvider } from "@privy-io/react-auth";
import NotFound from "@/pages/not-found";
import { Body } from "@/pages/Body";
import { UserProfileDashboard } from "@/pages/UserProfileDashboard";
import { PRIVY_ENABLED, PRIVY_APP_ID } from "@/lib/privy";
import pepoPng from "@assets/MesoReefDAO_Pepo_The_Polyp_1776218766670.png";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Body} />
      <Route path="/profile" component={UserProfileDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
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
          loginMethods: ["email", "google", "twitter", "linkedin", "wallet"],
          appearance: {
            theme: "dark",
            accentColor: "#83eef0",
            logo: pepoPng,
          },
          embeddedWallets: {
            createOnLogin: "users-without-wallets",
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
