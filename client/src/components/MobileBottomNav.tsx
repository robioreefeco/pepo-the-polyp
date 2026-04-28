import { Link, useLocation } from "wouter";
import { usePrivy } from "@privy-io/react-auth";
import { PRIVY_ENABLED } from "@/lib/privy";
import { useOrcidAuth } from "@/hooks/use-orcid-auth";
import { useWallets } from "@privy-io/react-auth";
import { useProfileStatus } from "@/hooks/use-profile-status";

function TelegramNavItem() {
  return (
    <a
      href="https://t.me/PepothePolyp_bot"
      target="_blank"
      rel="noopener noreferrer"
      data-testid="nav-mobile-telegram"
      className="flex flex-col items-center justify-center gap-1 flex-1 py-3 min-h-[56px] no-underline opacity-50 hover:opacity-75 transition-opacity"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.19 13.67l-2.948-.924c-.64-.203-.652-.64.136-.954l11.5-4.433c.536-.194 1.006.131.836.862z" fill="#d4e9f380"/>
      </svg>
      <span className="text-[9px] text-[#d4e9f380]">Telegram</span>
    </a>
  );
}

function PrivyAwareLoginNavItem() {
  const { authenticated: privyAuthenticated, login } = usePrivy();
  const { orcidAuthenticated } = useOrcidAuth();

  if (privyAuthenticated || orcidAuthenticated) {
    return <TelegramNavItem />;
  }

  return (
    <button
      onClick={() => { try { login(); } catch { /* suppress */ } }}
      data-testid="nav-mobile-login"
      className="flex flex-col items-center justify-center gap-1 flex-1 py-3 min-h-[56px] opacity-95 active:opacity-75 transition-opacity bg-transparent border-0"
    >
      <div className="w-7 h-7 rounded-full bg-[linear-gradient(135deg,rgba(131,238,240,0.9)_0%,rgba(63,176,179,0.9)_100%)] flex items-center justify-center">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3" stroke="#00585a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <span className="text-[9px] font-semibold text-[#83eef0]">Log in</span>
    </button>
  );
}

function WorkspaceNavItem({ active }: { active: boolean }) {
  const { authenticated } = usePrivy();
  const { wallets } = useWallets();
  const isConnected = PRIVY_ENABLED && authenticated && wallets.length > 0;
  const color = active ? "#83eef0" : "#d4e9f380";

  return (
    <Link
      href="/workspace"
      data-testid="nav-mobile-workspace"
      className={`flex flex-col items-center justify-center gap-1 flex-1 py-3 min-h-[56px] no-underline transition-opacity relative ${active ? "opacity-100" : "opacity-50"}`}
    >
      <div className="relative">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="3" width="7" height="9" rx="1.5" stroke={active ? "#48dbfb" : color} strokeWidth="1.8"/>
          <rect x="14" y="3" width="7" height="5" rx="1.5" stroke={active ? "#1dd1a1" : color} strokeWidth="1.8"/>
          <rect x="14" y="12" width="7" height="9" rx="1.5" stroke={active ? "#1dd1a1" : color} strokeWidth="1.8"/>
          <rect x="3" y="16" width="7" height="5" rx="1.5" stroke={active ? "#48dbfb" : color} strokeWidth="1.8"/>
        </svg>
        {isConnected && (
          <span
            className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full border border-[#00080c]"
            style={{ background: "#1dd1a1" }}
          />
        )}
      </div>
      <span className={`text-[9px] ${active ? "text-[#83eef0] font-medium" : "text-[#d4e9f380]"}`}>Workspace</span>
    </Link>
  );
}

export function MobileBottomNav() {
  const [location] = useLocation();
  const active = (path: string) => location === path;
  const { isComplete: profileComplete } = useProfileStatus();

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-stretch justify-around bg-[#00080cf8] border-t border-[#ffffff0d] backdrop-blur-xl"
      style={{ paddingBottom: "max(10px, env(safe-area-inset-bottom))" }}
    >
      {/* Chat */}
      <Link
        href="/"
        data-testid="nav-mobile-chat"
        className={`flex flex-col items-center justify-center gap-1 flex-1 py-3 min-h-[56px] no-underline transition-opacity ${active("/") ? "opacity-100" : "opacity-50"}`}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z"
            stroke={active("/") ? "#83eef0" : "#d4e9f380"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span className={`text-[9px] font-medium ${active("/") ? "text-[#83eef0]" : "text-[#d4e9f380]"}`}>Chat</span>
      </Link>

      {/* Governance */}
      <Link
        href="/governance"
        data-testid="nav-mobile-governance"
        className={`flex flex-col items-center justify-center gap-1 flex-1 py-3 min-h-[56px] no-underline transition-opacity ${active("/governance") ? "opacity-100" : "opacity-50"}`}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L3 7v4c0 5.25 3.75 10.15 9 11.35C17.25 21.15 21 16.25 21 11V7L12 2z"
            stroke={active("/governance") ? "#83eef0" : "#d4e9f380"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M9 12l2 2 4-4"
            stroke={active("/governance") ? "#83eef0" : "#d4e9f380"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span className={`text-[9px] ${active("/governance") ? "text-[#83eef0] font-medium" : "text-[#d4e9f380]"}`}>Govern</span>
      </Link>

      {/* Profile */}
      <Link
        href="/profile"
        data-testid="nav-mobile-profile"
        className={`flex flex-col items-center justify-center gap-1 flex-1 py-3 min-h-[56px] no-underline transition-opacity relative ${active("/profile") ? "opacity-100" : "opacity-50"}`}
      >
        <div className="relative">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M20 21V19C20 17.9 19.1 17 18 17H6C4.9 17 4 17.9 4 19V21"
              stroke={active("/profile") ? "#83eef0" : "#d4e9f380"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="12" cy="9" r="4" stroke={active("/profile") ? "#83eef0" : "#d4e9f380"} strokeWidth="2"/>
          </svg>
          {!profileComplete && (
            <span
              data-testid="badge-profile-incomplete-mobile"
              className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full border border-[#00080c]"
              style={{ background: "#83eef0" }}
            />
          )}
        </div>
        <span className={`text-[9px] ${active("/profile") ? "text-[#83eef0] font-medium" : "text-[#d4e9f380]"}`}>Profile</span>
      </Link>

      {/* Community */}
      <Link
        href="/community"
        data-testid="nav-mobile-community"
        className={`flex flex-col items-center justify-center gap-1 flex-1 py-3 min-h-[56px] no-underline transition-opacity ${active("/community") ? "opacity-100" : "opacity-50"}`}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"
            stroke={active("/community") ? "#83eef0" : "#d4e9f380"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="9" cy="7" r="4" stroke={active("/community") ? "#83eef0" : "#d4e9f380"} strokeWidth="2"/>
          <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
            stroke={active("/community") ? "#83eef0" : "#d4e9f380"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span className={`text-[9px] ${active("/community") ? "text-[#83eef0] font-medium" : "text-[#d4e9f380]"}`}>Community</span>
      </Link>

      {/* Workspace */}
      <WorkspaceNavItem active={active("/workspace")} />

      {/* Reef Map */}
      <Link
        href="/map"
        data-testid="nav-mobile-map"
        className={`flex flex-col items-center justify-center gap-1 flex-1 py-3 min-h-[56px] no-underline transition-opacity ${active("/map") ? "opacity-100" : "opacity-50"}`}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke={active("/map") ? "#83eef0" : "#d4e9f380"} strokeWidth="2"/>
          <path d="M2 12h20M12 3a15 15 0 010 18M12 3a15 15 0 000 18"
            stroke={active("/map") ? "#83eef0" : "#d4e9f380"} strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <span className={`text-[9px] ${active("/map") ? "text-[#83eef0] font-medium" : "text-[#d4e9f380]"}`}>Reef Map</span>
      </Link>

      {/* Login (unauthenticated) or Telegram (authenticated) */}
      {PRIVY_ENABLED ? <PrivyAwareLoginNavItem /> : <TelegramNavItem />}
    </nav>
  );
}
