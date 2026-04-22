import { useState, Suspense, lazy } from "react";
import { Link, useLocation } from "wouter";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { PRIVY_ENABLED } from "@/lib/privy";
import pepoPng from "@assets/MesoReefDAO_Pepo_The_Polyp_1776218766670.png";
import { FileverseWorkspacePanel } from "@/components/FileverseWorkspacePanel";

const ReefMap = lazy(() => import("@/components/ReefMap").then((m) => ({ default: m.ReefMap })));

const TELEGRAM_BOT_URL = "https://t.me/PepothePolyp_bot";

function MetaMaskIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 35 33" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M32.958 1L19.48 10.858l2.45-5.813L32.958 1z" fill="#E17726" stroke="#E17726" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2.042 1l13.365 9.957-2.33-5.912L2.042 1z" fill="#E27625" stroke="#E27625" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M28.178 23.533l-3.588 5.487 7.677 2.114 2.202-7.48-6.291-.121zM1.55 23.654l2.19 7.48 7.666-2.114-3.577-5.487-6.279.121z" fill="#E27625" stroke="#E27625" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M11.406 29.02l4.58-2.224-3.95-3.083-.63 5.307zM19.014 26.796l4.591 2.224-.642-5.307-3.95 3.083z" fill="#E27625" stroke="#E27625" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M19.256 22.01l-.88 4.544.627.44 3.95-3.083.12-3.118-3.817 1.217zM15.744 22.01l-3.808-1.218.099 3.118 3.95 3.083.638-.44-.88-4.543z" fill="#F5841F" stroke="#F5841F" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M32.012 16.44l-7.59-2.222 2.15 3.233-3.193 6.236 4.215-.055h6.29l-1.872-7.192zM10.978 14.218l-7.59 2.222-1.86 7.192h6.28l4.204.055-3.193-6.236 2.16-3.233z" fill="#F5841F" stroke="#F5841F" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

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
          <div className="flex flex-col gap-2">
            <p className="[font-family:'Inter',Helvetica] font-normal text-[#9aaeb8] text-xs leading-4">
              No wallet connected yet. Add one to participate in DAO governance.
            </p>
            <button
              onClick={() => linkWallet()}
              data-testid="button-connect-metamask-sidebar"
              className="flex items-center gap-2 px-3 py-2 rounded-full bg-[#E2761B0d] border border-[#E2761B30] text-[#E2761Bcc] hover:bg-[#E2761B18] hover:text-[#E2761B] transition-colors text-xs [font-family:'Inter',Helvetica] font-medium justify-center"
            >
              <MetaMaskIcon size={13} />
              Connect MetaMask
            </button>
          </div>
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
                {externalWallets.map((w) => {
                  const isMM = w.walletClientType === "metamask";
                  return (
                    <button
                      key={w.address}
                      onClick={() => copyAddr(w.address)}
                      data-testid={`wallet-external-${w.address.slice(-4)}`}
                      className={`flex items-center justify-between gap-2 px-3 py-1.5 rounded-full border transition-colors text-left ${
                        isMM
                          ? "bg-[#E2761B0a] border-[#E2761B25] hover:bg-[#E2761B18]"
                          : "bg-[#ffffff08] border-[#ffffff12] hover:bg-[#ffffff10]"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        {isMM ? (
                          <MetaMaskIcon size={12} />
                        ) : null}
                        <span className="[font-family:'Inter',Helvetica] text-[#d4e9f3b2] text-[11px] font-mono">
                          {w.address.slice(0, 6)}…{w.address.slice(-4)}
                        </span>
                      </div>
                      <span className="text-[#d4e9f380]">
                        {copied === w.address ? (
                          <span className="text-[#83eef0] text-[9px]">Copied!</span>
                        ) : (
                          <CopyIcon />
                        )}
                      </span>
                    </button>
                  );
                })}
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
  const [mapOpen, setMapOpen] = useState(false);
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

      {/* Reef Workspace */}
      <div className="w-full px-2 pb-2">
        <div className="flex items-center gap-2 mb-2 px-1">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="7" height="9" rx="1.5" stroke="#48dbfb" strokeWidth="1.7"/>
            <rect x="14" y="3" width="7" height="5" rx="1.5" stroke="#1dd1a1" strokeWidth="1.7"/>
            <rect x="14" y="12" width="7" height="9" rx="1.5" stroke="#1dd1a1" strokeWidth="1.7"/>
            <rect x="3" y="16" width="7" height="5" rx="1.5" stroke="#48dbfb" strokeWidth="1.7"/>
          </svg>
          <Link
            href="/workspace"
            data-testid="link-reef-workspace-title"
            className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-semibold text-[#83eef0cc] text-[10px] uppercase tracking-widest hover:text-[#83eef0] transition-colors no-underline flex-1"
          >
            Reef Workspace
          </Link>
        </div>
        <FileverseWorkspacePanel variant="sidebar" />
      </div>

      {/* Reef Map */}
      <div className="w-full px-2 pb-2">
        <button
          data-testid="open-reef-map-popup"
          onClick={() => setMapOpen(true)}
          className="flex items-center gap-2 mb-2 px-1 w-full text-left group"
          style={{ background: "none", border: "none", padding: "0 4px 0 4px", cursor: "pointer" }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="#83eef0" strokeWidth="1.8"/>
            <path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" stroke="#83eef0" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          <span className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-semibold text-[#83eef0cc] text-[10px] uppercase tracking-widest group-hover:text-[#83eef0] transition-colors flex-1">
            Regen Reef Network Map
          </span>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" className="opacity-40 group-hover:opacity-80 transition-opacity">
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" stroke="#83eef0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <Suspense
          fallback={
            <div
              style={{ height: 180, borderRadius: 16, background: "#00131c", border: "1px solid rgba(131,238,240,0.1)" }}
              className="w-full flex items-center justify-center"
            >
              <div className="w-5 h-5 rounded-full border-2 border-[#83eef0] border-t-transparent animate-spin" />
            </div>
          }
        >
          <ReefMap compact expanded={mapOpen} onExpandChange={setMapOpen} />
        </Suspense>
        <p className="[font-family:'Inter',Helvetica] text-[#d4e9f344] text-[9px] leading-3 mt-1.5 px-1 text-center">
          Allen Coral Atlas · members with location sharing · click to expand
        </p>
      </div>

      {/* Reef Heat Stress Monitor */}
      <div className="w-full px-2 pb-1">
        <div className="flex items-center gap-2 mb-2 px-1">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" stroke="#e05555" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-semibold text-[#e05555cc] text-[10px] uppercase tracking-widest">
            Reef Heat Stress
          </span>
        </div>

        <a
          href="https://coralreefwatch.noaa.gov/product/5km/index_5km_dhw.php"
          target="_blank"
          rel="noopener noreferrer"
          data-testid="link-noaa-dhw"
          style={{
            display: "block",
            background: "rgba(220,50,50,0.06)",
            border: "1px solid rgba(220,85,85,0.22)",
            borderRadius: 12,
            padding: "10px 12px",
            textDecoration: "none",
            transition: "border-color 0.2s",
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(220,85,85,0.5)")}
          onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(220,85,85,0.22)")}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: "#e08888", fontFamily: "Inter,sans-serif" }}>
              NOAA Coral Reef Watch
            </span>
            <span style={{ fontSize: 8.5, color: "#e05555aa", fontFamily: "Inter,sans-serif" }}>5 km · Weekly ↗</span>
          </div>
          <p style={{ fontSize: 9.5, color: "#d4e9f388", fontFamily: "Inter,sans-serif", lineHeight: 1.5, margin: 0, marginBottom: 8 }}>
            Degree Heating Weeks (DHW) track accumulated thermal stress on coral reefs.
            DHW &gt; 4°C-weeks risks bleaching; DHW &gt; 8°C-weeks risks severe bleaching and mortality.
          </p>
          {/* Alert level scale */}
          <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
            {[
              { label: "Watch", color: "#feca57" },
              { label: "Warning", color: "#ff9f43" },
              { label: "Alert 1", color: "#ff6348" },
              { label: "Alert 2", color: "#c0392b" },
            ].map(({ label, color }) => (
              <div key={label} style={{
                flex: 1,
                background: `${color}22`,
                border: `1px solid ${color}66`,
                borderRadius: 4,
                padding: "2px 0",
                textAlign: "center",
                fontSize: 7.5,
                color,
                fontFamily: "Inter,sans-serif",
                fontWeight: 600,
              }}>
                {label}
              </div>
            ))}
          </div>
        </a>
      </div>

      {/* Conservation Network */}
      <div className="w-full px-2 pb-2">
        <div className="flex items-center gap-2 mb-2 px-1">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" fill="#83eef066"/>
          </svg>
          <span className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-semibold text-[#83eef0cc] text-[10px] uppercase tracking-widest">
            Conservation Network
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {[
            { label: "GCRMN", desc: "Global Coral Reef Monitoring Network", href: "https://gcrmn.net/", color: "#1dd1a1" },
            { label: "Coral Reef Alliance", desc: "Science-based reef conservation", href: "https://coralreefs.org/", color: "#48dbfb" },
            { label: "KAUST KCRI", desc: "Red Sea coral research", href: "https://www.kaust.edu.sa/en/innovate/kcri", color: "#c56cf0" },
            { label: "GBRMPA", desc: "Great Barrier Reef Marine Park Authority", href: "https://www2.gbrmpa.gov.au/", color: "#feca57" },
            { label: "Healthy Reefs Initiative", desc: "Mesoamerican Reef report card", href: "https://www.healthyreefs.org/en", color: "#54a0ff" },
            { label: "Corals of the World", desc: "Species database & reef imagery", href: "https://www.coralsoftheworld.org/page/home/", color: "#ff9f43" },
          ].map(({ label, desc, href, color }) => (
            <a
              key={href}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              data-testid={`link-conservation-${label.toLowerCase().replace(/\s+/g, "-")}`}
              style={{
                display: "flex", alignItems: "center", gap: 9,
                background: `${color}0d`,
                border: `1px solid ${color}22`,
                borderRadius: 8,
                padding: "6px 10px",
                textDecoration: "none",
                transition: "border-color 0.2s, background 0.2s",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = `${color}55`;
                e.currentTarget.style.background = `${color}18`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = `${color}22`;
                e.currentTarget.style.background = `${color}0d`;
              }}
            >
              <span style={{
                width: 7, height: 7, borderRadius: "50%",
                background: color, flexShrink: 0,
              }}/>
              <div style={{ overflow: "hidden" }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: "#d4e9f3cc", fontFamily: "Inter,sans-serif", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {label}
                </div>
                <div style={{ fontSize: 8.5, color: "#d4e9f355", fontFamily: "Inter,sans-serif", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {desc}
                </div>
              </div>
              <span style={{ marginLeft: "auto", fontSize: 9, color: `${color}88`, flexShrink: 0 }}>↗</span>
            </a>
          ))}
        </div>
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
