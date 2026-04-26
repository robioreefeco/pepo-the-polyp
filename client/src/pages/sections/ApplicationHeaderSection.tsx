import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { OrcidLoginButton } from "@/components/OrcidLoginButton";
import { FileverseWorkspacePanel } from "@/components/FileverseWorkspacePanel";
import { PRIVY_ENABLED } from "@/lib/privy";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useOrcidAuth } from "@/hooks/use-orcid-auth";

const navLinks = [
  { label: "MesoReef DAO", href: "https://mesoreefdao.org/" },
  { label: "ReefRegen", href: "https://reefregen.org/" },
  { label: "Workspace", href: "/workspace", internal: true },
  { label: "bio", href: "https://app.bio.xyz/launchpad", badge: "soon" },
  { label: "Join", href: "https://linktr.ee/mesoreefdao" },
];

function MetaMaskIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 35 33" fill="none">
      <path d="M32.958 1L19.48 10.858l2.45-5.813L32.958 1z" fill="#E17726" stroke="#E17726" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2.042 1l13.365 9.957-2.33-5.912L2.042 1z" fill="#E27625" stroke="#E27625" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M28.178 23.533l-3.588 5.487 7.677 2.114 2.202-7.48-6.291-.121zM1.55 23.654l2.19 7.48 7.666-2.114-3.577-5.487-6.279.121z" fill="#E27625" stroke="#E27625" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M11.406 29.02l4.58-2.224-3.95-3.083-.63 5.307zM19.014 26.796l4.591 2.224-.642-5.307-3.95 3.083z" fill="#E27625" stroke="#E27625" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M19.256 22.01l-.88 4.544.627.44 3.95-3.083.12-3.118-3.817 1.217zM15.744 22.01l-3.808-1.218.099 3.118 3.95 3.083.638-.44-.88-4.543z" fill="#F5841F" stroke="#F5841F" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M32.012 16.44l-7.59-2.222 2.15 3.233-3.193 6.236 4.215-.055h6.29l-1.872-7.192zM10.978 14.218l-7.59 2.222-1.86 7.192h6.28l4.204.055-3.193-6.236 2.16-3.233z" fill="#F5841F" stroke="#F5841F" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
      <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/>
      <path d="M5 15H4C2.9 15 2 14.1 2 13V4C2 2.9 2.9 2 4 2H13C14.1 2 15 2.9 15 4V5" stroke="currentColor" strokeWidth="2"/>
    </svg>
  );
}

function PlainLoginButton({ onClick }: { onClick?: () => void }) {
  return (
    <Button
      className="relative inline-flex items-center justify-center px-5 py-2 h-auto min-h-[44px] rounded-full bg-[linear-gradient(170deg,rgba(131,238,240,1)_0%,rgba(63,176,179,1)_100%)] border-none shadow-none hover:opacity-90 transition-opacity w-full"
      asChild={false}
      onClick={onClick ?? (() => window.open("https://dashboard.privy.io", "_blank"))}
    >
      <span className="relative [font-family:'Inter',Helvetica] font-semibold text-[#00585a] text-sm text-center tracking-[0] leading-6 whitespace-nowrap">
        Log in
      </span>
    </Button>
  );
}

/** Wallet section shown inside the mobile overlay when the user is Privy-authenticated */
function MobileWalletSection() {
  const { linkWallet } = usePrivy();
  const { wallets } = useWallets();
  const [copied, setCopied] = useState<string | null>(null);

  function copyAddr(addr: string) {
    navigator.clipboard.writeText(addr).catch(() => {});
    setCopied(addr);
    setTimeout(() => setCopied(null), 2000);
  }

  const embeddedWallets = wallets.filter((w) => w.walletClientType === "privy");
  const externalWallets = wallets.filter((w) => w.walletClientType !== "privy");
  const hasWallets = wallets.length > 0;

  return (
    <div className="flex flex-col gap-2">
      <p className="[font-family:'Inter',Helvetica] text-[#d4e9f350] text-xs px-1 uppercase tracking-wider">
        Wallet
      </p>

      <div className="flex flex-col gap-2 px-1 py-3 rounded-2xl bg-[#0a293366] border border-[#83eef01a]">
        {!hasWallets && (
          <p className="[font-family:'Inter',Helvetica] text-[#9aaeb8] text-xs px-2 leading-5">
            No wallet connected. Add one to participate in DAO governance.
          </p>
        )}

        {embeddedWallets.length > 0 && (
          <div className="flex flex-col gap-1.5 px-1">
            <span className="[font-family:'Inter',Helvetica] text-[#d4e9f340] text-[9px] uppercase tracking-widest px-1">
              Embedded
            </span>
            {embeddedWallets.map((w) => (
              <button
                key={w.address}
                onClick={() => copyAddr(w.address)}
                data-testid={`wallet-copy-mobile-${w.address.slice(-4)}`}
                className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-[#83eef008] border border-[#83eef020] active:bg-[#83eef015] transition-colors text-left w-full"
              >
                <span className="[font-family:'Inter',Helvetica] text-[#83eef0] text-sm font-mono tracking-tight">
                  {w.address.slice(0, 8)}…{w.address.slice(-6)}
                </span>
                <span className="text-[#83eef0b2] flex-shrink-0">
                  {copied === w.address ? (
                    <span className="text-[#83eef0] text-xs [font-family:'Inter',Helvetica]">Copied!</span>
                  ) : (
                    <CopyIcon />
                  )}
                </span>
              </button>
            ))}
          </div>
        )}

        {externalWallets.length > 0 && (
          <div className="flex flex-col gap-1.5 px-1">
            <span className="[font-family:'Inter',Helvetica] text-[#d4e9f340] text-[9px] uppercase tracking-widest px-1">
              External
            </span>
            {externalWallets.map((w) => {
              const wct = w.walletClientType;
              const isMM       = wct === "metamask";
              const isCoinbase = wct === "coinbase_wallet";
              const isBinance  = wct === "binance";
              const isWC       = (w as any).connectorType === "wallet_connect";

              const bgClass = isMM       ? "bg-[#E2761B0a] border-[#E2761B25] active:bg-[#E2761B18]"
                            : isCoinbase ? "bg-[#0052FF0a] border-[#0052FF25] active:bg-[#0052FF18]"
                            : isBinance  ? "bg-[#F3BA2F0a] border-[#F3BA2F25] active:bg-[#F3BA2F18]"
                            : isWC       ? "bg-[#3B99FC0a] border-[#3B99FC25] active:bg-[#3B99FC18]"
                            :              "bg-[#ffffff08] border-[#ffffff12] active:bg-[#ffffff10]";

              const WalletIcon = () => {
                if (isMM)       return <MetaMaskIcon size={14} />;
                if (isCoinbase) return (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect width="24" height="24" rx="6" fill="#0052FF"/><path d="M12 4.5A7.5 7.5 0 104.5 12 7.51 7.51 0 0012 4.5zm0 13.5A6 6 0 1118 12a6 6 0 01-6 6zm-2.25-6a2.25 2.25 0 104.5 0 2.25 2.25 0 00-4.5 0z" fill="white"/></svg>
                );
                if (isBinance)  return (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><rect width="24" height="24" rx="12" fill="#F3BA2F"/><path d="M12 7.5l1.2 1.2-3.45 3.3 3.45 3.3L12 16.5l-4.5-4.5 4.5-4.5zm0 0l-1.2 1.2 3.45 3.3-3.45 3.3L12 16.5l4.5-4.5-4.5-4.5z" fill="#1A1A1A"/></svg>
                );
                if (isWC)       return (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M4.91 7.52C9.86 2.67 17.58 2.67 22.52 7.52L23.1 8.09a.5.5 0 010 .71l-2.06 2.02a.27.27 0 01-.37 0l-.82-.8c-3.47-3.39-9.09-3.39-12.56 0l-.88.86a.27.27 0 01-.37 0L4.01 8.87a.5.5 0 010-.71l.9-.64z" fill="#3B99FC"/></svg>
                );
                return null;
              };

              const label = isMM ? "MetaMask" : isCoinbase ? "Coinbase" : isBinance ? "Binance" : isWC ? "WalletConnect" : "Wallet";

              return (
                <button
                  key={w.address}
                  onClick={() => copyAddr(w.address)}
                  data-testid={`wallet-external-mobile-${w.address.slice(-4)}`}
                  className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border transition-colors text-left w-full ${bgClass}`}
                >
                  <div className="flex items-center gap-2">
                    <WalletIcon />
                    <div className="flex flex-col">
                      <span className="[font-family:'Inter',Helvetica] text-[#d4e9f380] text-[9px] uppercase tracking-wider leading-none mb-0.5">{label}</span>
                      <span className="[font-family:'Inter',Helvetica] text-[#d4e9f3b2] text-sm font-mono tracking-tight">
                        {w.address.slice(0, 6)}…{w.address.slice(-4)}
                      </span>
                    </div>
                  </div>
                  <span className="text-[#d4e9f380] flex-shrink-0">
                    {copied === w.address ? (
                      <span className="text-[#83eef0] text-xs [font-family:'Inter',Helvetica]">Copied!</span>
                    ) : (
                      <CopyIcon />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <div className="px-1">
          <button
            onClick={() => linkWallet()}
            data-testid="button-connect-wallet-mobile"
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-[#83eef01a] border border-[#83eef033] text-[#83eef0] [font-family:'Inter',Helvetica] text-sm font-medium active:bg-[#83eef033] transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
            Connect Wallet
          </button>
        </div>
      </div>
    </div>
  );
}

function MobileOverlayAuthSection({ onClose }: { onClose: () => void }) {
  const { authenticated: privyAuthenticated, user, login, logout: privyLogout } = usePrivy();
  const { orcidAuthenticated, orcidName, orcidId, logout: orcidLogout } = useOrcidAuth();

  const linked = user?.linkedAccounts ?? [];
  const emailAcct   = linked.find((a: any) => a.type === "email") as any;
  const googleAcct  = linked.find((a: any) => a.type === "google_oauth") as any;
  const twitterAcct = linked.find((a: any) => a.type === "twitter_oauth") as any;
  const walletAddr  = user?.wallet?.address;

  const privyDisplayName = twitterAcct?.username
    ? `@${twitterAcct.username}`
    : emailAcct?.address
    ?? googleAcct?.email?.split("@")[0]
    ?? (walletAddr ? walletAddr.slice(0, 6) + "…" + walletAddr.slice(-4) : "Explorer");

  if (privyAuthenticated) {
    return (
      <div className="flex flex-col gap-4">
        {/* User identity row */}
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#83eef008] border border-[#83eef018]">
          <div className="w-9 h-9 rounded-full bg-[linear-gradient(135deg,rgba(131,238,240,0.25)_0%,rgba(63,176,179,0.15)_100%)] border border-[#83eef040] flex items-center justify-center flex-shrink-0">
            <span className="[font-family:'Inter',Helvetica] font-semibold text-[#83eef0] text-sm leading-none">
              {privyDisplayName.replace("@", "").charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="[font-family:'Inter',Helvetica] text-[#d4e9f3] text-sm font-medium truncate">
              {privyDisplayName}
            </span>
            <span className="[font-family:'Inter',Helvetica] text-[#83eef080] text-xs">
              MesoReef DAO member
            </span>
          </div>
        </div>

        {/* Wallet section */}
        <MobileWalletSection />

        {/* Fileverse Workspace */}
        <FileverseWorkspacePanel variant="overlay" />

        {/* Sign out */}
        <button
          onClick={() => { onClose(); privyLogout().catch(() => {}); }}
          data-testid="button-sign-out-mobile"
          className="flex items-center justify-center gap-2 px-5 py-3 min-h-[44px] rounded-2xl bg-[#ff4a4a0d] border border-[#ff4a4a20] text-[#ff8a8a] [font-family:'Inter',Helvetica] text-sm font-medium active:bg-[#ff4a4a18] transition-colors"
        >
          Sign Out
        </button>
      </div>
    );
  }

  if (orcidAuthenticated) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#a6ce3908] border border-[#a6ce3920]">
          <div className="w-9 h-9 rounded-full bg-[#a6ce3920] border border-[#a6ce3940] flex items-center justify-center flex-shrink-0">
            <span className="text-[#a6ce39] font-bold text-[11px] [font-family:'Inter',Helvetica]">iD</span>
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="[font-family:'Inter',Helvetica] text-[#d4e9f3] text-sm font-medium truncate">
              {orcidName || "Researcher"}
            </span>
            <span className="[font-family:'Inter',Helvetica] text-[#a6ce39] text-[10px] font-mono truncate">
              {orcidId}
            </span>
          </div>
        </div>
        <button
          onClick={() => { onClose(); orcidLogout(); }}
          data-testid="button-sign-out-orcid-mobile"
          className="flex items-center justify-center gap-2 px-5 py-3 min-h-[44px] rounded-2xl bg-[#ff4a4a0d] border border-[#ff4a4a20] text-[#ff8a8a] [font-family:'Inter',Helvetica] text-sm font-medium active:bg-[#ff4a4a18] transition-colors"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={() => { onClose(); setTimeout(() => { try { login(); } catch { } }, 150); }}
        data-testid="button-login-mobile-overlay"
        className="flex items-center justify-center gap-2 w-full px-5 py-3.5 min-h-[52px] rounded-2xl bg-[linear-gradient(170deg,rgba(131,238,240,1)_0%,rgba(63,176,179,1)_100%)] text-[#00585a] [font-family:'Inter',Helvetica] text-base font-semibold active:opacity-80 transition-opacity shadow-[0_4px_20px_rgba(131,238,240,0.2)]"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3" stroke="#00585a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Log in to MesoReef DAO
      </button>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-[#ffffff10]" />
        <span className="[font-family:'Inter',Helvetica] text-[#d4e9f330] text-xs">or</span>
        <div className="flex-1 h-px bg-[#ffffff10]" />
      </div>
      <OrcidLoginButton className="w-full" label="Sign in with ORCID iD" size="md" />
    </div>
  );
}

export const ApplicationHeaderSection = (): JSX.Element => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <header className="flex w-full items-center justify-between px-4 md:px-8 py-3 md:py-4 border-b border-[#ffffff0d] backdrop-blur-[20px] backdrop-brightness-[100%] [-webkit-backdrop-filter:blur(20px)_brightness(100%)] bg-[linear-gradient(180deg,rgba(0,22,30,1)_0%,rgba(0,16,23,0.4)_100%),linear-gradient(0deg,rgba(0,8,12,0.8)_0%,rgba(0,8,12,0.8)_100%)] relative z-20">
        {/* Logo */}
        <img
          src="/figmaAssets/mesoreef-dao-logo-new.png"
          alt="MesoReef DAO"
          className="h-8 md:h-10 w-auto flex-shrink-0 object-contain"
        />

        {/* Desktop navigation links */}
        <nav className="hidden md:inline-flex items-center gap-8">
          {navLinks.map((link) =>
            link.internal ? (
              <Link
                key={link.label}
                href={link.href}
                data-testid={`nav-header-${link.label.toLowerCase()}`}
                className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-normal text-[#d4e9f3b2] text-base tracking-[-0.40px] leading-6 whitespace-nowrap hover:text-[#d4e9f3] transition-colors no-underline"
              >
                {link.label}
              </Link>
            ) : (
              <a
                key={link.label}
                data-testid={`nav-header-${link.label.toLowerCase()}`}
                className="relative flex items-center gap-1.5 [font-family:'Plus_Jakarta_Sans',Helvetica] font-normal text-[#d4e9f3b2] text-base tracking-[-0.40px] leading-6 whitespace-nowrap hover:text-[#d4e9f3] transition-colors no-underline"
                href={link.href}
                rel="noopener noreferrer"
                target="_blank"
              >
                {link.label}
                {link.badge && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-[#83eef020] border border-[#83eef040] text-[#83eef0] text-[9px] font-semibold [font-family:'Inter',Helvetica] leading-none uppercase tracking-wide">
                    {link.badge}
                  </span>
                )}
              </a>
            )
          )}
        </nav>

        {/* Right side: hamburger (mobile) */}
        <div className="flex items-center gap-2">
          {/* Mobile: hamburger only */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            data-testid="button-mobile-menu"
            aria-label="Open menu"
            className="flex items-center justify-center w-10 h-10 rounded-full bg-[#ffffff08] border border-[#ffffff12] text-[#d4e9f3b2] active:bg-[#ffffff18] transition-colors md:hidden"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </header>

      {/* Mobile full-screen menu overlay */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 flex flex-col"
          style={{ background: "rgba(0,8,12,0.97)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" }}
        >
          {/* Overlay header */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-[#ffffff0d] flex-shrink-0">
            <img
              src="/figmaAssets/mesoreef-dao-logo-new.png"
              alt="MesoReef DAO"
              className="h-8 w-auto object-contain"
            />
            <button
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close menu"
              className="flex items-center justify-center w-10 h-10 rounded-full bg-[#ffffff08] border border-[#ffffff12] text-[#d4e9f3b2] active:bg-[#ffffff18] transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {/* Overlay body — scrollable */}
          <div className="flex flex-col gap-3 px-4 py-6 flex-1 overflow-y-auto">
            {/* Nav links */}
            {navLinks.map((link) =>
              link.internal ? (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between px-5 py-4 min-h-[56px] rounded-2xl bg-[#ffffff06] border border-[#ffffff0d] text-[#d4e9f3b2] hover:bg-[#83eef00a] hover:border-[#83eef01a] hover:text-[#d4e9f3] active:bg-[#83eef00f] transition-colors no-underline"
                >
                  <span className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-semibold text-base">
                    {link.label}
                  </span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Link>
              ) : (
                <a
                  key={link.label}
                  href={link.href}
                  rel="noopener noreferrer"
                  target="_blank"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between px-5 py-4 min-h-[56px] rounded-2xl bg-[#ffffff06] border border-[#ffffff0d] text-[#d4e9f3b2] hover:bg-[#83eef00a] hover:border-[#83eef01a] hover:text-[#d4e9f3] active:bg-[#83eef00f] transition-colors no-underline"
                >
                  <span className="flex items-center gap-2 [font-family:'Plus_Jakarta_Sans',Helvetica] font-semibold text-base">
                    {link.label}
                    {link.badge && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-[#83eef020] border border-[#83eef040] text-[#83eef0] text-[9px] font-semibold [font-family:'Inter',Helvetica] leading-none uppercase tracking-wide">
                        {link.badge}
                      </span>
                    )}
                  </span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </a>
              )
            )}

            {/* Divider */}
            <div className="border-t border-[#ffffff08] my-1" />

            {/* Account section */}
            <div className="flex flex-col gap-3">
              <p className="[font-family:'Inter',Helvetica] text-[#d4e9f350] text-xs px-1 uppercase tracking-wider">
                Account
              </p>
              {PRIVY_ENABLED ? (
                <MobileOverlayAuthSection onClose={() => setMobileMenuOpen(false)} />
              ) : (
                <div className="flex flex-col gap-3">
                  <PlainLoginButton onClick={() => setMobileMenuOpen(false)} />
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-[#ffffff10]" />
                    <span className="[font-family:'Inter',Helvetica] text-[#d4e9f330] text-xs">or</span>
                    <div className="flex-1 h-px bg-[#ffffff10]" />
                  </div>
                  <OrcidLoginButton className="w-full" label="Sign in with ORCID iD" size="md" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
