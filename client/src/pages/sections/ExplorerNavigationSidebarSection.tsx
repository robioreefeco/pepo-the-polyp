import { useState } from "react";
import { Link, useLocation } from "wouter";
import { PRIVY_ENABLED } from "@/lib/privy";

const TELEGRAM_BOT_URL = "https://t.me/PepothePolyp_bot";
const TELEGRAM_WEB_URL = "https://web.telegram.org/k/#@PepothePolyp_bot";

const navItems = [
  {
    label: "Knowledge\nGraph",
    href: "https://pepo.app.bonfires.ai/graph",
    icon: "/figmaAssets/container-1.svg",
    active: true,
  },
  {
    label: "Community",
    href: "https://linktr.ee/mesoreefdao",
    icon: "/figmaAssets/container-2.svg",
    active: false,
  },
];

function TelegramIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.19 13.67l-2.948-.924c-.64-.203-.652-.64.136-.954l11.5-4.433c.536-.194 1.006.131.836.862z"
        fill="#83eef0"
      />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M21 18V19C21 20.1 20.1 21 19 21H5C3.89 21 3 20.1 3 19V5C3 3.9 3.89 3 5 3H19C20.1 3 21 3.9 21 5V6H12C10.89 6 10 6.9 10 8V16C10 17.1 10.89 18 12 18H21ZM12 16H22V8H12V16ZM16 13.5C15.17 13.5 14.5 12.83 14.5 12C14.5 11.17 15.17 10.5 16 10.5C16.83 10.5 17.5 11.17 17.5 12C17.5 12.83 16.83 13.5 16 13.5Z"
        fill="#d4e9f380"
      />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 21V19C20 17.9 19.1 17 18 17H6C4.9 17 4 17.9 4 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="12" cy="9" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export const ExplorerNavigationSidebarSection = (): JSX.Element => {
  const [telegramOpen, setTelegramOpen] = useState(false);
  const [location] = useLocation();

  return (
    <nav className="flex flex-col w-64 min-h-screen items-start justify-between p-6 bg-[#00080c99] border-r border-[#ffffff0d] backdrop-blur-md [-webkit-backdrop-filter:blur(12px)_brightness(100%)] relative z-10">
      {/* Profile header */}
      <div className="pb-10 flex flex-col items-start w-full">
        <div className="flex items-center gap-3 w-full">
          {/* Avatar */}
          <div className="flex flex-col w-12 h-12 items-start justify-center bg-[#06232c] rounded-[48px] overflow-hidden border border-solid border-[#83eef04c] flex-shrink-0">
            <div className="flex-1 self-stretch w-full bg-[url(/figmaAssets/pepo-the-polyp-mascot.png)] bg-cover bg-[50%_50%]" />
          </div>
          {/* Name and subtitle */}
          <div className="inline-flex flex-col items-start">
            <span className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-bold text-[#83eef0] text-xl tracking-[0] leading-7 whitespace-nowrap">
              Pepo
            </span>
            <span className="[font-family:'Inter',Helvetica] font-normal text-[#d4e9f380] text-xs tracking-[0] leading-4 whitespace-nowrap">
              The Polyp
            </span>
          </div>
        </div>
      </div>

      {/* Navigation items */}
      <div className="flex flex-col items-start gap-2 flex-1 w-full">
        {navItems.map((item) => (
          <a
            key={item.label}
            href={item.href}
            rel="noopener noreferrer"
            target="_blank"
            className={`flex items-center gap-3 px-4 py-3 w-full rounded-[48px] no-underline transition-colors ${
              item.active
                ? "bg-[#83eef01a] border border-solid border-[#83eef033]"
                : "hover:bg-[#83eef00d]"
            }`}
            style={item.active ? { boxShadow: "inset 0 2px 6px rgba(0,0,0,0.55), inset 0 1px 2px rgba(0,0,0,0.35)" } : {}}
          >
            <img className="flex-shrink-0" alt="Container" src={item.icon} />
            <span
              className={`[font-family:'Plus_Jakarta_Sans',Helvetica] text-base tracking-[0] leading-6 whitespace-pre-line ${
                item.active
                  ? "font-bold text-[#83eef0]"
                  : "font-medium text-[#d4e9f380]"
              }`}
            >
              {item.label}
            </span>
          </a>
        ))}

        {/* My Profile internal link */}
        <Link
          href="/profile"
          className={`flex items-center gap-3 px-4 py-3 w-full rounded-[48px] no-underline transition-colors ${
            location === "/profile"
              ? "bg-[#83eef01a] border border-solid border-[#83eef033]"
              : "hover:bg-[#83eef00d]"
          }`}
          style={location === "/profile" ? { boxShadow: "inset 0 2px 6px rgba(0,0,0,0.55), inset 0 1px 2px rgba(0,0,0,0.35)" } : {}}
        >
          <div className={`flex-shrink-0 w-5 h-5 flex items-center justify-center ${location === "/profile" ? "text-[#83eef0]" : "text-[#d4e9f380]"}`}>
            <UserIcon />
          </div>
          <span
            className={`[font-family:'Plus_Jakarta_Sans',Helvetica] text-base tracking-[0] leading-6 whitespace-pre-line ${
              location === "/profile"
                ? "font-bold text-[#83eef0]"
                : "font-medium text-[#d4e9f380]"
            }`}
          >
            My Profile
          </span>
        </Link>

        {/* Telegram Bot link */}
        <div className="w-full mt-2">
          <button
            onClick={() => setTelegramOpen(!telegramOpen)}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-[48px] hover:bg-[#83eef00d] transition-colors text-left"
          >
            <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
              <TelegramIcon />
            </div>
            <span className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-medium text-[#83eef0b2] text-base tracking-[0] leading-6 whitespace-pre-line">
              Telegram Bot
            </span>
          </button>

          {telegramOpen && (
            <div className="mt-2 mx-2 p-4 bg-[#0a293366] rounded-[24px] border border-solid border-[#83eef01a] flex flex-col gap-3">
              <p className="[font-family:'Inter',Helvetica] font-normal text-[#9aaeb8] text-xs leading-4">
                Chat with Pepo directly on Telegram for reef updates and insights.
              </p>
              <a
                href={TELEGRAM_BOT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-4 py-2 bg-[#83eef01a] rounded-full border border-solid border-[#83eef033] hover:bg-[#83eef033] transition-colors no-underline"
              >
                <TelegramIcon />
                <span className="[font-family:'Inter',Helvetica] font-medium text-[#83eef0] text-sm">
                  @PepothePolyp_bot
                </span>
              </a>
              <a
                href={TELEGRAM_WEB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="[font-family:'Inter',Helvetica] font-normal text-[#d4e9f366] text-[10px] text-center tracking-[0] hover:text-[#d4e9f3] transition-colors"
              >
                Open in Telegram Web
              </a>
            </div>
          )}
        </div>

        {/* Wallet connect shortcut (when Privy not configured) */}
        {!PRIVY_ENABLED && (
          <div className="w-full mt-2">
            <a
              href="https://dashboard.privy.io"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3 w-full rounded-[48px] hover:bg-[#83eef00d] transition-colors no-underline"
            >
              <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                <WalletIcon />
              </div>
              <span className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-medium text-[#d4e9f380] text-sm tracking-[0] leading-6">
                Connect Wallet
              </span>
            </a>
          </div>
        )}
      </div>

      {/* Bottom: Bonfires AI attribution pill */}
      <div className="flex items-center justify-center gap-2 pl-4 pr-4 py-3 w-full rounded-[48px] border border-solid border-[#83eef033] hover:bg-[#83eef00d] transition-colors">
        <a
          href="https://bonfires.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 no-underline w-full justify-center"
        >
          <img src="/figmaAssets/bonfires-ai-logo-new.png" alt="Bonfires.ai" className="h-3.5 w-auto object-contain" />
          <span className="[font-family:'Inter',Helvetica] font-normal text-[#d4e9f366] text-[10px] tracking-[0] leading-3 whitespace-nowrap">
            Powered by Bonfires.ai
          </span>
        </a>
      </div>
    </nav>
  );
};
