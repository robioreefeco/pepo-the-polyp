import { Link, useLocation } from "wouter";
import { usePrivy } from "@privy-io/react-auth";
import { PRIVY_ENABLED } from "@/lib/privy";
import { useOrcidAuth } from "@/hooks/use-orcid-auth";
import { useProfileStatus } from "@/hooks/use-profile-status";
import { useTranslation } from "react-i18next";
import { TelegramPlaneIcon } from "@/components/icons";

function NavItem({
  href,
  testId,
  active,
  icon,
  label,
  badge,
}: {
  href: string;
  testId: string;
  active: boolean;
  icon: React.ReactNode;
  label: string;
  badge?: React.ReactNode;
}) {
  const external = href.startsWith("http");
  const cls = `flex flex-col items-center justify-center gap-1 flex-1 py-3 min-h-[56px] no-underline transition-opacity relative ${active ? "opacity-100" : "opacity-50 hover:opacity-75"}`;

  const content = (
    <>
      <div className="relative">
        {icon}
        {badge}
      </div>
      <span className={`text-[9px] font-medium ${active ? "text-[#83eef0]" : "text-[#d4e9f380]"}`}>
        {label}
      </span>
    </>
  );

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" data-testid={testId} className={cls}>
        {content}
      </a>
    );
  }
  return (
    <Link href={href} data-testid={testId} className={cls}>
      {content}
    </Link>
  );
}

function Dot({ color }: { color: string }) {
  return (
    <span
      className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full border border-[#00080c]"
      style={{ background: color }}
    />
  );
}

export function MobileBottomNav() {
  const [location] = useLocation();
  const at = (path: string) => location === path || (path === "/" && location === "/graph");

  const { authenticated: privyAuthenticated, login } = usePrivy();
  const { orcidAuthenticated } = useOrcidAuth();
  const { isComplete: profileComplete } = useProfileStatus();
  const { t } = useTranslation();

  const isAuthed = privyAuthenticated || orcidAuthenticated;
  const isWorkspaceConnected = isAuthed;

  const c = (path: string) => at(path) ? "#83eef0" : "#d4e9f380";

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-stretch justify-around bg-[#00080cf8] border-t border-[#ffffff0d] backdrop-blur-xl"
      style={{ paddingBottom: "max(10px, env(safe-area-inset-bottom))" }}
    >
      {/* Knowledge Graph */}
      <NavItem
        href="/"
        testId="nav-mobile-graph"
        active={at("/")}
        label={t("mobile.graph")}
        icon={
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <circle cx="5" cy="12" r="2.5" fill={c("/")} />
            <circle cx="19" cy="6" r="2.5" fill={at("/") ? "#83eef066" : "#d4e9f340"} />
            <circle cx="19" cy="18" r="2.5" fill={at("/") ? "#83eef066" : "#d4e9f340"} />
            <line x1="7" y1="11" x2="17" y2="7" stroke={c("/")} strokeWidth="1.5"/>
            <line x1="7" y1="13" x2="17" y2="17" stroke={c("/")} strokeWidth="1.5"/>
          </svg>
        }
      />

      {/* Governance */}
      <NavItem
        href="/governance"
        testId="nav-mobile-governance"
        active={at("/governance")}
        label={t("mobile.govern")}
        icon={
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L3 7v4c0 5.25 3.75 10.15 9 11.35C17.25 21.15 21 16.25 21 11V7L12 2z"
              stroke={c("/governance")} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M9 12l2 2 4-4" stroke={c("/governance")} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        }
      />

      {/* Profile */}
      <NavItem
        href="/profile"
        testId="nav-mobile-profile"
        active={at("/profile")}
        label={t("mobile.profile")}
        icon={
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M20 21V19C20 17.9 19.1 17 18 17H6C4.9 17 4 17.9 4 19V21"
              stroke={c("/profile")} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="12" cy="9" r="4" stroke={c("/profile")} strokeWidth="2"/>
          </svg>
        }
        badge={!profileComplete
          ? <Dot color="#83eef0" />
          : undefined
        }
      />

      {/* Community */}
      <NavItem
        href="/community"
        testId="nav-mobile-community"
        active={at("/community")}
        label={t("mobile.community")}
        icon={
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"
              stroke={c("/community")} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="9" cy="7" r="4" stroke={c("/community")} strokeWidth="2"/>
            <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"
              stroke={c("/community")} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        }
      />

      {/* Workspace */}
      <NavItem
        href="/workspace"
        testId="nav-mobile-workspace"
        active={at("/workspace")}
        label={t("mobile.workspace")}
        icon={
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="7" height="9" rx="1.5" stroke={at("/workspace") ? "#48dbfb" : "#d4e9f380"} strokeWidth="1.8"/>
            <rect x="14" y="3" width="7" height="5" rx="1.5" stroke={at("/workspace") ? "#1dd1a1" : "#d4e9f380"} strokeWidth="1.8"/>
            <rect x="14" y="12" width="7" height="9" rx="1.5" stroke={at("/workspace") ? "#1dd1a1" : "#d4e9f380"} strokeWidth="1.8"/>
            <rect x="3" y="16" width="7" height="5" rx="1.5" stroke={at("/workspace") ? "#48dbfb" : "#d4e9f380"} strokeWidth="1.8"/>
          </svg>
        }
        badge={isWorkspaceConnected
          ? <Dot color="#1dd1a1" />
          : undefined
        }
      />

      {/* Reef Map */}
      <NavItem
        href="/reef-map"
        testId="nav-mobile-map"
        active={at("/reef-map")}
        label={t("mobile.reefMap")}
        icon={
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke={c("/reef-map")} strokeWidth="2"/>
            <path d="M2 12h20M12 3a15 15 0 010 18M12 3a15 15 0 000 18"
              stroke={c("/reef-map")} strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        }
      />

      {/* Videos Monitoring */}
      <NavItem
        href="/videos"
        testId="nav-mobile-videos"
        active={at("/videos")}
        label="Video"
        icon={
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <rect x="2" y="5" width="15" height="12" rx="2" stroke={c("/videos")} strokeWidth="1.8"/>
            <path d="M17 9l5-2v8l-5-2V9z" stroke={c("/videos")} strokeWidth="1.8" strokeLinejoin="round"/>
          </svg>
        }
      />

      {/* Login (unauthenticated) or Telegram (authenticated) */}
      {isAuthed ? (
        <NavItem
          href="https://t.me/PepothePolyp_bot"
          testId="nav-mobile-telegram"
          active={false}
          label={t("mobile.telegram")}
          icon={<TelegramPlaneIcon size={22} muted />}
        />
      ) : PRIVY_ENABLED ? (
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
          <span className="text-[9px] font-semibold text-[#83eef0]">{t("mobile.logIn")}</span>
        </button>
      ) : (
        <a
          href="/api/auth/orcid/login"
          data-testid="nav-mobile-login-orcid"
          className="flex flex-col items-center justify-center gap-1 flex-1 py-3 min-h-[56px] opacity-95 active:opacity-75 transition-opacity no-underline"
        >
          <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "rgba(166,206,57,0.2)", border: "1px solid rgba(166,206,57,0.4)" }}>
            <span className="text-[#a6ce39] font-black text-[9px]">iD</span>
          </div>
          <span className="text-[9px] font-semibold text-[#a6ce39]">ORCID</span>
        </a>
      )}
    </nav>
  );
}
