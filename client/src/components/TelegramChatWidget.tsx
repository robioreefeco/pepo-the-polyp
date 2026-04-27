import { useState, useEffect } from "react";
import pepoPng from "@assets/MesoReefDAO_Pepo_The_Polyp_1776218616437.png";

const TELEGRAM_WEB_URL = "https://web.telegram.org/k/#@PepothePolyp_bot";
const TELEGRAM_APP_URL = "https://t.me/PepothePolyp_bot";

function TgIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.19 13.67l-2.948-.924c-.64-.203-.652-.64.136-.954l11.5-4.433c.536-.194 1.006.131.836.862z"
        fill="white"
      />
    </svg>
  );
}

export function TelegramChatWidget() {
  const [open, setOpen] = useState(false);
  const [showPulse, setShowPulse] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setShowPulse(false), 5000);
    return () => clearTimeout(t);
  }, []);

  const toggle = () => {
    setOpen((o) => !o);
    setShowPulse(false);
  };

  return (
    <div
      className="fixed right-4 md:right-6 z-[60] flex flex-col items-end gap-3"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 88px + 12px)" }}
    >
      {/* Chat panel — shown above the button */}
      {open && (
        <div
          className="w-[300px] md:w-[320px] rounded-[20px] overflow-hidden border border-[#229ED930]"
          style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.6), 0 2px 12px rgba(34,158,217,0.2)" }}
          data-testid="widget-telegram-panel"
        >
          {/* Header */}
          <div
            className="flex items-center gap-3 px-4 py-3.5"
            style={{ background: "linear-gradient(135deg, #229ED9 0%, #1a7fad 100%)" }}
          >
            <div className="relative flex-shrink-0">
              <img
                src={pepoPng}
                alt="Pepo"
                className="w-10 h-10 rounded-full border-2 border-white/30 object-cover object-center"
              />
              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#2ecc71] border-2 border-[#1a7fad]" />
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <span className="font-bold text-white text-sm [font-family:'Plus_Jakarta_Sans',Helvetica] leading-5">
                Pepo the Polyp
              </span>
              <span className="text-white/70 text-[10px] [font-family:'Inter',Helvetica] leading-4">
                @PepothePolyp_bot · typically replies fast
              </span>
            </div>
            <button
              onClick={toggle}
              aria-label="Close"
              data-testid="button-close-telegram-widget"
              className="w-7 h-7 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 active:bg-white/30 transition-colors flex-shrink-0"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div
            className="px-4 pt-4 pb-4 flex flex-col gap-3"
            style={{ background: "rgba(0,8,12,0.97)", backdropFilter: "blur(20px)" }}
          >
            {/* Bot message bubble */}
            <div className="flex items-end gap-2">
              <img
                src={pepoPng}
                alt="Pepo"
                className="w-7 h-7 rounded-full border border-[#229ED940] object-cover object-center flex-shrink-0 mb-0.5"
              />
              <div
                className="flex flex-col gap-1 px-3.5 py-2.5 rounded-[14px] rounded-bl-[4px] max-w-[215px]"
                style={{ background: "rgba(34,158,217,0.12)", border: "1px solid rgba(34,158,217,0.22)" }}
              >
                <p className="text-[#d4e9f3] text-[12px] [font-family:'Inter',Helvetica] leading-[1.6] m-0">
                  Hi! 👋 I'm Pepo — your MesoReef DAO guide. Ask me anything about coral conservation, governance, or reef science!
                </p>
                <span className="text-[#229ED966] text-[9px] [font-family:'Inter',Helvetica] text-right leading-none">
                  just now
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-2 mt-1">
              <a
                href={TELEGRAM_WEB_URL}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="button-open-telegram-web"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-[12px] no-underline font-semibold text-white text-sm [font-family:'Plus_Jakarta_Sans',Helvetica] transition-opacity hover:opacity-90 active:opacity-75 active:scale-[0.98]"
                style={{
                  background: "linear-gradient(135deg, #229ED9 0%, #1a7fad 100%)",
                  boxShadow: "0 4px 16px rgba(34,158,217,0.35)",
                }}
              >
                <TgIcon size={16} />
                Chat on Telegram Web
              </a>
              <a
                href={TELEGRAM_APP_URL}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="button-open-telegram-app"
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-[12px] no-underline text-[#229ED9] text-sm [font-family:'Inter',Helvetica] font-medium transition-colors hover:bg-[#229ED90f] active:bg-[#229ED91a]"
                style={{ border: "1px solid rgba(34,158,217,0.25)" }}
              >
                Open in Telegram App
              </a>
            </div>

            <p className="text-[#d4e9f328] text-[9px] [font-family:'Inter',Helvetica] text-center leading-3 mt-0.5">
              Powered by Telegram · @PepothePolyp_bot
            </p>
          </div>
        </div>
      )}

      {/* Floating trigger bubble */}
      <button
        onClick={toggle}
        aria-label="Chat with Pepo on Telegram"
        data-testid="button-telegram-chat-widget"
        className="relative flex items-center justify-center w-14 h-14 rounded-full transition-transform hover:scale-105 active:scale-95 flex-shrink-0"
        style={{
          background: "linear-gradient(135deg, #229ED9 0%, #1a7fad 100%)",
          boxShadow: "0 4px 24px rgba(34,158,217,0.5), 0 2px 8px rgba(0,0,0,0.4)",
        }}
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        ) : (
          <TgIcon size={26} />
        )}

        {/* Pulse ring (first 5s only) */}
        {!open && showPulse && (
          <span
            className="absolute inset-0 rounded-full animate-ping opacity-50"
            style={{ background: "#229ED9" }}
          />
        )}

        {/* Online dot */}
        {!open && (
          <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-[#2ecc71] border-2 border-[#00080c]" />
        )}
      </button>
    </div>
  );
}
