import { Card, CardContent } from "@/components/ui/card";
import { useState } from "react";
import { Network, ExternalLink } from "lucide-react";

const TELEGRAM_BOT_URL = "https://web.telegram.org/k/#@PepothePolyp_bot";
const TELEGRAM_BOT_NAME = "@PepothePolyp_bot";

const footerLinks = [
  { label: "PRIVACY", href: "https://mesoreefdao.gitbook.io/privacy-policy" },
  { label: "TERMS", href: "https://mesoreefdao.gitbook.io/terms-and-conditions" },
  { label: "CONSERVATION", href: "https://mesoreefdao.org/science-ai" },
];

export const ReefInsightDashboardSection = (): JSX.Element => {
  const [mobileTab, setMobileTab] = useState<"chat" | "graph">("chat");

  return (
    <div className="flex flex-col flex-1 self-stretch overflow-hidden pb-16 md:pb-0">
      {/* Mobile tab switcher */}
      <div className="flex md:hidden items-center gap-2 px-4 pt-3 pb-0 shrink-0">
        <button
          onClick={() => setMobileTab("chat")}
          className={`flex items-center gap-2 flex-1 justify-center py-2 rounded-full text-sm [font-family:'Inter',Helvetica] font-medium transition-all ${
            mobileTab === "chat"
              ? "bg-[#83eef01a] border border-[#83eef033] text-[#83eef0]"
              : "text-[#d4e9f380] border border-transparent"
          }`}
          style={mobileTab === "chat" ? { boxShadow: "inset 0 2px 6px rgba(0,0,0,0.55), inset 0 1px 2px rgba(0,0,0,0.35)" } : {}}
        >
          <Network size={14} />
          Graph
        </button>
        <button
          onClick={() => setMobileTab("graph")}
          className={`flex items-center gap-2 flex-1 justify-center py-2 rounded-full text-sm [font-family:'Inter',Helvetica] font-medium transition-all ${
            mobileTab === "graph"
              ? "bg-[#229ED91a] border border-[#229ED933] text-[#229ED9]"
              : "text-[#d4e9f380] border border-transparent"
          }`}
          style={mobileTab === "graph" ? { boxShadow: "inset 0 2px 6px rgba(0,0,0,0.55), inset 0 1px 2px rgba(0,0,0,0.35)" } : {}}
        >
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" xmlns="http://www.w3.org/2000/svg">
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
          </svg>
          Telegram
        </button>
      </div>

      {/* Panels row */}
      <div className="flex flex-col md:flex-row items-start gap-4 md:gap-6 p-3 md:p-6 flex-1 overflow-hidden">

        {/* Left Panel: Bonfires Knowledge Graph */}
        <div className={`relative flex-1 self-stretch grow rounded-[28px] md:rounded-[48px] overflow-hidden border border-solid border-[#83eef01a] bg-[#00080c] flex flex-col ${mobileTab === "graph" ? "hidden md:flex" : "flex"}`} style={{ boxShadow: "inset 0 2px 6px rgba(0,0,0,0.55), inset 0 1px 2px rgba(0,0,0,0.35)" }}>
          {/* Graph header bar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#83eef01a] bg-[#001017bf] shrink-0">
            <div className="flex items-center gap-2.5">
              <img className="w-6 h-6 flex-shrink-0" alt="Container" src="/figmaAssets/container.svg" />
              <div className="flex flex-col">
                <span className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-bold text-[#83eef0] text-sm leading-5">
                  Reef Knowledge Graph
                </span>
                <span className="[font-family:'Inter',Helvetica] font-normal text-[#d4e9f366] text-[10px] leading-4">
                  Powered by Bonfires.ai
                </span>
              </div>
            </div>
            <a
              href="https://pepo.app.bonfires.ai/graph"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#83eef01a] rounded-full border border-solid border-[#83eef033] hover:bg-[#83eef026] transition-colors no-underline"
            >
              <ExternalLink size={10} className="text-[#83eef0]" />
              <span className="[font-family:'Inter',Helvetica] text-[#83eef0] text-[10px] font-medium whitespace-nowrap">Full Graph</span>
            </a>
          </div>

          {/* Graph iframe */}
          <iframe
            src="https://pepo.app.bonfires.ai/graph"
            title="Reef Knowledge Graph"
            className="flex-1 w-full border-none"
            allow="fullscreen"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>

        {/* Right Panel: Graph + Footer */}
        <div className={`flex flex-col gap-4 md:gap-6 relative self-stretch w-full md:w-[400px] md:flex-none ${mobileTab === "chat" ? "hidden md:flex" : "flex flex-1"}`}>
          {/* Telegram Bot Panel */}
          <div className="relative flex-1 self-stretch w-full grow rounded-[24px] md:rounded-[32px] overflow-hidden border border-solid border-[#83eef01a] bg-[#00080c] flex flex-col" style={{ minHeight: mobileTab === "graph" ? "calc(100vh - 16rem)" : undefined, boxShadow: "inset 0 2px 6px rgba(0,0,0,0.55), inset 0 1px 2px rgba(0,0,0,0.35)" }}>
            {/* Header bar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#83eef01a] bg-[#001017bf] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full overflow-hidden border border-[#83eef066] shrink-0">
                  <div className="bg-[url(/figmaAssets/pepo.png)] w-full h-full bg-cover bg-center" />
                </div>
                <div className="flex flex-col">
                  <span className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-bold text-[#83eef0] text-sm leading-5">
                    {TELEGRAM_BOT_NAME}
                  </span>
                  <span className="[font-family:'Inter',Helvetica] font-normal text-[#d4e9f366] text-[10px] leading-4">
                    Pepo the Polyp · Telegram Bot
                  </span>
                </div>
              </div>
              <a
                href={TELEGRAM_BOT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#229ED91a] rounded-full border border-solid border-[#229ED933] hover:bg-[#229ED926] transition-colors no-underline"
              >
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-[#229ED9]" xmlns="http://www.w3.org/2000/svg">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
                <span className="[font-family:'Inter',Helvetica] text-[#229ED9] text-[10px] font-medium whitespace-nowrap">Open Chat</span>
                <ExternalLink size={10} className="text-[#229ED9]" />
              </a>
            </div>

            {/* Bot card body */}
            <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6">
              {/* Avatar */}
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-[#83eef066] shadow-[0_0_24px_rgba(131,238,240,0.15)]">
                <div className="bg-[url(/figmaAssets/pepo.png)] w-full h-full bg-cover bg-center" />
              </div>

              {/* Info */}
              <div className="flex flex-col items-center gap-2 text-center">
                <span className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-bold text-[#d4e9f3] text-xl">
                  Pepo the Polyp
                </span>
                <span className="[font-family:'Inter',Helvetica] font-medium text-[#83eef0] text-sm">
                  {TELEGRAM_BOT_NAME}
                </span>
                <p className="[font-family:'Inter',Helvetica] font-normal text-[#9aaeb8] text-sm max-w-[260px] leading-5 mt-1">
                  Your AI guide to the Coral Reef knowledge network. Ask about coral ecology, DeSci, bleaching events, and more.
                </p>
              </div>

              {/* Stats row */}
              <div className="flex items-center gap-4">
                {[
                  { label: "Episodes", value: "165+" },
                  { label: "Topics", value: "10" },
                  { label: "Sources", value: "6" },
                ].map((stat) => (
                  <div key={stat.label} className="flex flex-col items-center gap-0.5 px-3 py-2 bg-[#83eef00d] rounded-2xl border border-[#83eef01a]">
                    <span className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-bold text-[#83eef0] text-base leading-5">{stat.value}</span>
                    <span className="[font-family:'Inter',Helvetica] font-normal text-[#d4e9f366] text-[10px] leading-4">{stat.label}</span>
                  </div>
                ))}
              </div>

              {/* CTA button */}
              <a
                href={TELEGRAM_BOT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 px-6 py-3 bg-[#229ED9] rounded-full hover:bg-[#1a8dc4] active:scale-95 transition-all no-underline shadow-[0_4px_20px_rgba(34,158,217,0.3)]"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white" xmlns="http://www.w3.org/2000/svg">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
                <span className="[font-family:'Inter',Helvetica] font-bold text-white text-sm">Chat on Telegram</span>
              </a>

              {/* Secondary hint */}
              <span className="[font-family:'Inter',Helvetica] font-normal text-[#d4e9f344] text-[10px] text-center">
                Search <span className="text-[#83eef066]">@PepothePolyp_bot</span> in Telegram
              </span>
            </div>
          </div>

          {/* Footer Card */}
          <Card className="flex flex-col items-center gap-4 px-0 py-4 md:py-6 relative self-stretch w-full flex-[0_0_auto] bg-[#00000066] rounded-[28px] md:rounded-[48px] border border-solid border-[#ffffff1a] backdrop-blur-md [-webkit-backdrop-filter:blur(12px)_brightness(100%)] shadow-none">
            <CardContent className="flex flex-col items-center gap-3 md:gap-4 p-0 w-full">
              <nav className="inline-flex items-start gap-4 md:gap-6 relative flex-[0_0_auto]">
                {footerLinks.map((link) => (
                  <a
                    key={link.label}
                    className="relative flex items-center w-fit [font-family:'Inter',Helvetica] font-normal text-[#d4e9f366] text-[9px] md:text-[10px] tracking-[1.00px] leading-[15px] whitespace-nowrap hover:text-[#d4e9f3] transition-colors"
                    href={link.href}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {link.label}
                  </a>
                ))}
              </nav>
              <div className="inline-flex flex-col items-center gap-1 relative flex-[0_0_auto] opacity-60">
                <span className="[font-family:'Inter',Helvetica] font-normal text-[#d4e9f3] text-[8px] text-center leading-3">
                  Copyright © 2026 MesoReef DAO.
                </span>
                <div className="inline-flex items-center gap-1.5 relative flex-[0_0_auto]">
                  <span className="[font-family:'Inter',Helvetica] font-normal text-[#d4e9f3] text-[8px] text-center leading-3">
                    Powered by{" "}
                    <a href="https://bonfires.ai/" rel="noopener noreferrer" target="_blank" className="hover:text-[#d4e9f3] transition-colors">
                      Bonfires.ai
                    </a>
                  </span>
                  <img src="/figmaAssets/bonfires-ai-logo-new.png" alt="Bonfires.ai" className="h-3.5 w-auto object-contain" />
                </div>
                <span className="[font-family:'Inter',Helvetica] font-normal text-[#d4e9f3] text-[8px] text-center leading-3">
                  All Rights Reserved.
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
