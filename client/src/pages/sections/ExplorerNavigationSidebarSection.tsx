import { useState } from "react";
import { Link, useLocation } from "wouter";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { PRIVY_ENABLED } from "@/lib/privy";
import pepoPng from "@assets/MesoReefDAO_Pepo_The_Polyp_1776218766670.png";

const TELEGRAM_BOT_URL = "https://t.me/PepothePolyp_bot";

// ─── Shared style tokens ───────────────────────────────────────────────────────
const PILL_BASE =
  "flex items-center gap-3 px-4 py-3 w-full rounded-[48px] border border-solid transition-colors no-underline text-left";
const PILL_ACTIVE =
  "bg-[#83eef01a] border-[#83eef033]";
const PILL_INACTIVE =
  "border-[#ffffff0d] hover:bg-[#83eef00d] hover:border-[#83eef01a]";
const TEXT_BASE =
  "[font-family:'Plus_Jakarta_Sans',Helvetica] text-base tracking-[0] leading-6 whitespace-pre-line";
const EMBOSS = { boxShadow: "inset 0 2px 6px rgba(0,0,0,0.55), inset 0 1px 2px rgba(0,0,0,0.35)" };

// ─── Icons ────────────────────────────────────────────────────────────────────
function UserIcon({ active }: { active?: boolean }) {
  const color = active ? "#83eef0" : "#d4e9f380";
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M20 21V19C20 17.9 19.1 17 18 17H6C4.9 17 4 17.9 4 19V21" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="12" cy="9" r="4" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function TelegramIcon({ muted }: { muted?: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.19 13.67l-2.948-.924c-.64-.203-.652-.64.136-.954l11.5-4.433c.536-.194 1.006.131.836.862z"
        fill={muted ? "#d4e9f380" : "#83eef0"}
      />
    </svg>
  );
}

function WalletIcon({ active }: { active?: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M21 18V19C21 20.1 20.1 21 19 21H5C3.89 21 3 20.1 3 19V5C3 3.9 3.89 3 5 3H19C20.1 3 21 3.9 21 5V6H12C10.89 6 10 6.9 10 8V16C10 17.1 10.89 18 12 18H21ZM12 16H22V8H12V16ZM16 13.5C15.17 13.5 14.5 12.83 14.5 12C14.5 11.17 15.17 10.5 16 10.5C16.83 10.5 17.5 11.17 17.5 12C17.5 12.83 16.83 13.5 16 13.5Z" fill={active ? "#83eef0" : "#d4e9f380"}/>
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

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

// ─── Wallet Panel ─────────────────────────────────────────────────────────────
function WalletPanel() {
  const { authenticated, linkWallet } = usePrivy();
  const { wallets } = useWallets();
  const [copied, setCopied] = useState<string | null>(null);

  if (!authenticated) return null;

  function copyAddr(addr: string) {
    navigator.clipboard.writeText(addr);
    setCopied(addr);
    setTimeout(() => setCopied(null), 2000);
  }

  const embeddedWallets = wallets.filter((w) => w.walletClientType === "privy");
  const externalWallets = wallets.filter((w) => w.walletClientType !== "privy");

  return (
    <div className="w-full px-2">
      <div className="p-4 bg-[#0a293366] rounded-[24px] border border-solid border-[#83eef01a] flex flex-col gap-3">

        {wallets.length === 0 ? (
          <p className="[font-family:'Inter',Helvetica] font-normal text-[#9aaeb8] text-xs leading-4">
            No wallet connected yet. Add one to participate in DAO governance.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {embeddedWallets.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="[font-family:'Inter',Helvetica] text-[#d4e9f350] text-[9px] uppercase tracking-widest">Embedded</span>
                {embeddedWallets.map((w) => (
                  <button
                    key={w.address}
                    onClick={() => copyAddr(w.address)}
                    data-testid={`wallet-copy-${w.address.slice(-4)}`}
                    className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-full bg-[#83eef008] border border-[#83eef020] hover:bg-[#83eef015] transition-colors text-left"
                  >
                    <span className="[font-family:'Inter',Helvetica] text-[#83eef0] text-[11px] font-mono">
                      {w.address.slice(0, 6)}…{w.address.slice(-4)}
                    </span>
                    <span className="text-[#83eef0b2]">
                      {copied === w.address ? (
                        <span className="text-[#83eef0] text-[9px]">Copied!</span>
                      ) : (
                        <CopyIcon />
                      )}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {externalWallets.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="[font-family:'Inter',Helvetica] text-[#d4e9f350] text-[9px] uppercase tracking-widest">External</span>
                {externalWallets.map((w) => (
                  <button
                    key={w.address}
                    onClick={() => copyAddr(w.address)}
                    data-testid={`wallet-external-${w.address.slice(-4)}`}
                    className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-full bg-[#ffffff08] border border-[#ffffff12] hover:bg-[#ffffff10] transition-colors text-left"
                  >
                    <span className="[font-family:'Inter',Helvetica] text-[#d4e9f3b2] text-[11px] font-mono">
                      {w.address.slice(0, 6)}…{w.address.slice(-4)}
                    </span>
                    <span className="text-[#d4e9f380]">
                      {copied === w.address ? (
                        <span className="text-[#83eef0] text-[9px]">Copied!</span>
                      ) : (
                        <CopyIcon />
                      )}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <button
          onClick={() => linkWallet()}
          data-testid="button-link-wallet"
          className="flex items-center justify-center gap-1.5 px-4 py-2 bg-[#83eef01a] rounded-full border border-solid border-[#83eef033] hover:bg-[#83eef033] transition-colors"
        >
          <span className="text-[#83eef0]"><PlusIcon /></span>
          <span className="[font-family:'Inter',Helvetica] font-medium text-[#83eef0] text-xs">Connect Wallet</span>
        </button>

        <a
          href={TELEGRAM_BOT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 px-4 py-2 bg-[#ffffff08] rounded-full border border-solid border-[#ffffff12] hover:bg-[#ffffff10] transition-colors no-underline"
        >
          <TelegramIcon />
          <span className="[font-family:'Inter',Helvetica] font-medium text-[#83eef0] text-xs">@PepothePolyp_bot</span>
        </a>
      </div>
    </div>
  );
}

// ─── Auth-aware wallet nav item ───────────────────────────────────────────────
function WalletNavItem() {
  const { authenticated, login } = usePrivy();
  const { wallets } = useWallets();
  const [open, setOpen] = useState(false);

  if (!authenticated) {
    return (
      <button
        onClick={login}
        data-testid="button-connect-wallet-login"
        className={`${PILL_BASE} ${PILL_INACTIVE}`}
      >
        <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
          <WalletIcon />
        </div>
        <span className={`${TEXT_BASE} font-medium text-[#d4e9f380]`}>Connect Wallet</span>
      </button>
    );
  }

  const primaryWallet = wallets[0];
  const label = primaryWallet
    ? `${primaryWallet.address.slice(0, 5)}…${primaryWallet.address.slice(-3)}`
    : "Wallets";

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        data-testid="button-wallet-nav"
        className={`${PILL_BASE} ${open ? PILL_ACTIVE : PILL_INACTIVE}`}
        style={open ? EMBOSS : {}}
      >
        <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
          <WalletIcon active={open} />
        </div>
        <span className={`${TEXT_BASE} ${open ? "font-bold text-[#83eef0]" : "font-medium text-[#d4e9f380]"}`}>
          {label}
        </span>
        {wallets.length > 0 && (
          <span className="ml-auto text-[9px] [font-family:'Inter',Helvetica] px-1.5 py-0.5 rounded-full bg-[#83eef020] text-[#83eef0]">
            {wallets.length}
          </span>
        )}
      </button>
      {open && <WalletPanel />}
    </>
  );
}

// ─── Main sidebar ─────────────────────────────────────────────────────────────
export const ExplorerNavigationSidebarSection = (): JSX.Element => {
  const [telegramOpen, setTelegramOpen] = useState(false);
  const [location] = useLocation();
  const isProfile = location === "/profile";
  const isCommunity = location === "/community";

  return (
    <nav className="flex flex-col w-64 min-h-screen items-start justify-between p-6 bg-[#00080c99] border-r border-[#ffffff0d] backdrop-blur-md [-webkit-backdrop-filter:blur(12px)_brightness(100%)] relative z-10">

      {/* Profile header */}
      <div className="pb-8 flex flex-col items-start w-full">
        <div className="flex items-center gap-3 w-full">
          <div className="flex flex-col w-12 h-12 items-start justify-center bg-[#06232c] rounded-[48px] overflow-hidden border border-solid border-[#83eef04c] flex-shrink-0">
            <img src={pepoPng} alt="Pepo the Polyp" className="w-full h-full object-cover object-center" />
          </div>
          <div className="inline-flex flex-col items-start">
            <span className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-bold text-[#83eef0] text-xl tracking-[0] leading-7 whitespace-nowrap">Pepo</span>
            <span className="[font-family:'Inter',Helvetica] font-normal text-[#d4e9f380] text-xs tracking-[0] leading-4 whitespace-nowrap">The Polyp</span>
          </div>
        </div>
      </div>

      {/* Navigation items */}
      <div className="flex flex-col items-start gap-2 flex-1 w-full">

        {/* Knowledge Graph */}
        <a
          href="https://pepo.app.bonfires.ai/graph"
          rel="noopener noreferrer"
          target="_blank"
          data-testid="link-knowledge-graph"
          className={`${PILL_BASE} ${PILL_ACTIVE}`}
          style={EMBOSS}
        >
          <img className="w-5 h-5 flex-shrink-0" alt="Knowledge Graph" src="/figmaAssets/container-1.svg" />
          <span className={`${TEXT_BASE} font-bold text-[#83eef0]`}>Knowledge{"\n"}Graph</span>
        </a>

        {/* Community */}
        <Link
          href="/community"
          data-testid="link-community"
          className={`${PILL_BASE} ${isCommunity ? PILL_ACTIVE : PILL_INACTIVE}`}
          style={isCommunity ? EMBOSS : {}}
        >
          <img className="w-5 h-5 flex-shrink-0" alt="Community" src="/figmaAssets/container-2.svg" />
          <span className={`${TEXT_BASE} ${isCommunity ? "font-bold text-[#83eef0]" : "font-medium text-[#d4e9f380]"}`}>
            Community
          </span>
        </Link>

        {/* My Profile */}
        <Link
          href="/profile"
          data-testid="link-my-profile"
          className={`${PILL_BASE} ${isProfile ? PILL_ACTIVE : PILL_INACTIVE}`}
          style={isProfile ? EMBOSS : {}}
        >
          <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
            <UserIcon active={isProfile} />
          </div>
          <span className={`${TEXT_BASE} ${isProfile ? "font-bold text-[#83eef0]" : "font-medium text-[#d4e9f380]"}`}>
            My Profile
          </span>
        </Link>

        {/* Telegram Bot */}
        <button
          onClick={() => setTelegramOpen(!telegramOpen)}
          data-testid="button-telegram-bot"
          className={`${PILL_BASE} ${telegramOpen ? PILL_ACTIVE : PILL_INACTIVE}`}
          style={telegramOpen ? EMBOSS : {}}
        >
          <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
            <TelegramIcon muted={!telegramOpen} />
          </div>
          <span className={`${TEXT_BASE} ${telegramOpen ? "font-bold text-[#83eef0]" : "font-medium text-[#d4e9f380]"}`}>
            Telegram Bot
          </span>
        </button>

        {telegramOpen && (
          <div className="w-full px-2">
            <div className="p-4 bg-[#0a293366] rounded-[24px] border border-solid border-[#83eef01a] flex flex-col gap-3">
              <p className="[font-family:'Inter',Helvetica] font-normal text-[#9aaeb8] text-xs leading-4">
                Chat with Pepo directly on Telegram for reef updates and insights.
              </p>
              <a
                href={TELEGRAM_BOT_URL}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="link-telegram-bot-open"
                className="flex items-center justify-center gap-2 px-4 py-2 bg-[#83eef01a] rounded-full border border-solid border-[#83eef033] hover:bg-[#83eef033] transition-colors no-underline"
              >
                <TelegramIcon />
                <span className="[font-family:'Inter',Helvetica] font-medium text-[#83eef0] text-sm">@PepothePolyp_bot</span>
              </a>
            </div>
          </div>
        )}

      </div>

      {/* Bottom: Bonfires AI attribution */}
      <a
        href="https://bonfires.ai"
        target="_blank"
        rel="noopener noreferrer"
        data-testid="link-bonfires-ai"
        className="flex items-center justify-center gap-2 px-4 py-3 w-full rounded-[48px] border border-solid border-[#83eef033] hover:bg-[#83eef00d] transition-colors no-underline"
      >
        <img src="/figmaAssets/bonfires-ai-logo-new.png" alt="Bonfires.ai" className="h-3.5 w-auto object-contain" />
        <span className="[font-family:'Inter',Helvetica] font-normal text-[#d4e9f366] text-[10px] tracking-[0] leading-3 whitespace-nowrap">
          Powered by Bonfires.ai
        </span>
      </a>
    </nav>
  );
};
