import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PrivyLoginButton } from "@/components/PrivyLoginButton";
import { PRIVY_ENABLED } from "@/lib/privy";
import { usePrivy } from "@privy-io/react-auth";

const navLinks = [
  { label: "MesoReef DAO", href: "https://mesoreefdao.org/" },
  { label: "ReefRegen", href: "https://reefregen.org/" },
  { label: "Join", href: "https://linktr.ee/mesoreefdao" },
];

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

function MobileOverlayAuthSection({ onClose }: { onClose: () => void }) {
  const { authenticated, user, login, logout } = usePrivy();

  const linked = user?.linkedAccounts ?? [];
  const emailAcct   = linked.find((a: any) => a.type === "email") as any;
  const googleAcct  = linked.find((a: any) => a.type === "google_oauth") as any;
  const twitterAcct = linked.find((a: any) => a.type === "twitter_oauth") as any;
  const walletAddr  = user?.wallet?.address;

  const displayName = twitterAcct?.username
    ? `@${twitterAcct.username}`
    : emailAcct?.address
    ?? googleAcct?.email?.split("@")[0]
    ?? (walletAddr ? walletAddr.slice(0, 6) + "…" + walletAddr.slice(-4) : "Explorer");

  if (authenticated) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#83eef008] border border-[#83eef018]">
          <div className="w-8 h-8 rounded-full bg-[#83eef020] border border-[#83eef040] flex items-center justify-center flex-shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M20 21V19C20 17.9 19.1 17 18 17H6C4.9 17 4 17.9 4 19V21" stroke="#83eef0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="12" cy="9" r="4" stroke="#83eef0" strokeWidth="2"/>
            </svg>
          </div>
          <span className="[font-family:'Inter',Helvetica] text-[#d4e9f3b2] text-sm flex-1 truncate">{displayName}</span>
        </div>
        <button
          onClick={() => { onClose(); logout().catch(() => {}); }}
          className="flex items-center justify-center gap-2 px-5 py-3 min-h-[44px] rounded-2xl bg-[#ff4a4a0d] border border-[#ff4a4a20] text-[#ff8a8a] [font-family:'Inter',Helvetica] text-sm font-medium active:bg-[#ff4a4a18] transition-colors"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => { onClose(); setTimeout(() => { try { login(); } catch { /* suppress */ } }, 150); }}
      className="flex items-center justify-center gap-2 w-full px-5 py-3.5 min-h-[48px] rounded-2xl bg-[linear-gradient(170deg,rgba(131,238,240,1)_0%,rgba(63,176,179,1)_100%)] text-[#00585a] [font-family:'Inter',Helvetica] text-base font-semibold active:opacity-80 transition-opacity shadow-[0_4px_20px_rgba(131,238,240,0.2)]"
    >
      Log in to MesoReef DAO
    </button>
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
          {navLinks.map((link) => (
            <a
              key={link.label}
              className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-normal text-[#d4e9f3b2] text-base tracking-[-0.40px] leading-6 whitespace-nowrap hover:text-[#d4e9f3] transition-colors"
              href={link.href}
              rel="noopener noreferrer"
              target="_blank"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Right side: auth (desktop) + hamburger (mobile) */}
        <div className="flex items-center gap-2">
          {/* Auth button — desktop only to avoid duplication on mobile */}
          <div className="hidden md:block">
            {PRIVY_ENABLED ? <PrivyLoginButton /> : <PlainLoginButton />}
          </div>

          {/* Mobile: compact auth button (shown/hidden based on auth state) + hamburger */}
          <div className="flex md:hidden items-center gap-2">
            {PRIVY_ENABLED ? <PrivyLoginButton /> : <PlainLoginButton />}
            <button
              onClick={() => setMobileMenuOpen(true)}
              data-testid="button-mobile-menu"
              aria-label="Open menu"
              className="flex items-center justify-center w-11 h-11 rounded-full bg-[#ffffff08] border border-[#ffffff12] text-[#d4e9f3b2] active:bg-[#ffffff18] transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile full-screen menu overlay */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 flex flex-col"
          style={{ background: "rgba(0,8,12,0.97)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" }}
        >
          {/* Overlay header */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-[#ffffff0d]">
            <img
              src="/figmaAssets/mesoreef-dao-logo-new.png"
              alt="MesoReef DAO"
              className="h-8 w-auto object-contain"
            />
            <button
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close menu"
              className="flex items-center justify-center w-11 h-11 rounded-full bg-[#ffffff08] border border-[#ffffff12] text-[#d4e9f3b2] active:bg-[#ffffff18] transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {/* Overlay body */}
          <div className="flex flex-col gap-3 px-4 py-6 flex-1 overflow-y-auto">
            {/* External nav links */}
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                rel="noopener noreferrer"
                target="_blank"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between px-5 py-4 min-h-[56px] rounded-2xl bg-[#ffffff06] border border-[#ffffff0d] text-[#d4e9f3b2] hover:bg-[#83eef00a] hover:border-[#83eef01a] hover:text-[#d4e9f3] active:bg-[#83eef00f] transition-colors no-underline"
              >
                <span className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-semibold text-base">
                  {link.label}
                </span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </a>
            ))}

            {/* Divider */}
            <div className="border-t border-[#ffffff08] my-2" />

            {/* Account section */}
            <div className="px-1">
              <p className="[font-family:'Inter',Helvetica] text-[#d4e9f350] text-xs mb-3 px-1 uppercase tracking-wider">
                Account
              </p>
              {PRIVY_ENABLED ? (
                <MobileOverlayAuthSection onClose={() => setMobileMenuOpen(false)} />
              ) : (
                <PlainLoginButton onClick={() => setMobileMenuOpen(false)} />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
