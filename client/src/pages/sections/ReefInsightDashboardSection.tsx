import { Card, CardContent } from "@/components/ui/card";
import { useState, useRef, useEffect, useCallback } from "react";
import { Network, ExternalLink, Send, Loader2 } from "lucide-react";
import pepoPng from "@assets/MesoReefDAO_Pepo_The_Polyp_1776218616437.png";
import { usePrivy } from "@privy-io/react-auth";
import { useOrcidAuth } from "@/hooks/use-orcid-auth";
import { useQueryClient } from "@tanstack/react-query";

const TELEGRAM_BOT_URL = "https://web.telegram.org/k/#@PepothePolyp_bot";
const TELEGRAM_BOT_NAME = "@PepothePolyp_bot";

const footerLinks = [
  { label: "PRIVACY", href: "https://mesoreefdao.gitbook.io/privacy-policy" },
  { label: "TERMS", href: "https://mesoreefdao.gitbook.io/terms-and-conditions" },
  { label: "CONSERVATION", href: "https://mesoreefdao.org/science-ai" },
];

interface ChatMessage {
  role: "user" | "pepo";
  text: string;
  pointsAwarded?: number;
}

function renderPepoText(text: string): JSX.Element {
  const lines = text.split("\n");
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1" />;
        const bold = line.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
        const italic = bold.replace(/_(.+?)_/g, "<em>$1</em>");
        const withEmoji = italic;
        if (line.startsWith("•") || line.startsWith("-")) {
          return (
            <div key={i} className="flex gap-1.5 items-start">
              <span className="text-[#83eef066] mt-0.5 shrink-0">•</span>
              <span
                className="text-[#d4e9f3cc] text-xs leading-relaxed"
                dangerouslySetInnerHTML={{ __html: withEmoji.replace(/^[•\-]\s*/, "") }}
              />
            </div>
          );
        }
        return (
          <p
            key={i}
            className="text-[#d4e9f3cc] text-xs leading-relaxed"
            dangerouslySetInnerHTML={{ __html: withEmoji }}
          />
        );
      })}
    </div>
  );
}

function PepoChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "pepo",
      text: "Hello! I'm Pepo the Polyp, your AI guide to the Coral Reef knowledge network. Ask me about coral ecology, bleaching events, DeSci, the MesoAmerican Reef, and more.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pointsFlash, setPointsFlash] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { getAccessToken, authenticated: privyAuthenticated } = usePrivy();
  const { orcidAuthenticated } = useOrcidAuth();
  const isAuthenticated = privyAuthenticated || orcidAuthenticated;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setMessages(prev => [...prev, { role: "user", text }]);
    setLoading(true);

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (privyAuthenticated) {
        const token = await getAccessToken();
        if (token) headers["x-privy-token"] = token;
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({ message: text }),
      });

      const data = await res.json();
      const pts: number = data.pointsAwarded ?? 0;

      setMessages(prev => [
        ...prev,
        { role: "pepo", text: data.response || "Sorry, I could not get a response right now.", pointsAwarded: pts },
      ]);

      if (pts > 0) {
        setPointsFlash(pts);
        setTimeout(() => setPointsFlash(null), 3000);
        queryClient.invalidateQueries({ queryKey: ["/api/leaderboard"] });
        queryClient.invalidateQueries({ queryKey: ["/api/auth/orcid/session"] });
      }
    } catch {
      setMessages(prev => [
        ...prev,
        { role: "pepo", text: "Connection error. Please try again in a moment." },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [input, loading, privyAuthenticated, getAccessToken, queryClient]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="relative flex-1 self-stretch w-full flex flex-col rounded-[24px] md:rounded-[32px] overflow-hidden border border-solid border-[#83eef01a] bg-[#00080c]"
      style={{ minHeight: "320px", boxShadow: "inset 0 2px 6px rgba(0,0,0,0.55), inset 0 1px 2px rgba(0,0,0,0.35)" }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#83eef01a] bg-[#001017bf] shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full overflow-hidden border border-[#83eef066] shrink-0">
            <img src={pepoPng} alt="Pepo the Polyp" className="w-full h-full object-cover object-center" />
          </div>
          <div className="flex flex-col">
            <span className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-bold text-[#83eef0] text-sm leading-5">
              @PepothePolyp_bot
            </span>
            <span className="[font-family:'Inter',Helvetica] font-normal text-[#d4e9f366] text-[10px] leading-4">
              Pepo the Polyp · AI Guide
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Points flash badge */}
          {pointsFlash !== null && (
            <div className="flex items-center gap-1 px-2 py-1 bg-[#83eef020] border border-[#83eef050] rounded-full animate-pulse"
              data-testid="badge-points-earned">
              <span className="text-[#83eef0] text-[10px] font-bold">+{pointsFlash} pts</span>
            </div>
          )}
          <a
            href={TELEGRAM_BOT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#229ED91a] rounded-full border border-solid border-[#229ED933] hover:bg-[#229ED926] transition-colors no-underline"
            data-testid="link-telegram-bot"
          >
            <svg viewBox="0 0 24 24" className="w-3 h-3 fill-[#229ED9]" xmlns="http://www.w3.org/2000/svg">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
            </svg>
            <span className="[font-family:'Inter',Helvetica] text-[#229ED9] text-[10px] font-medium whitespace-nowrap">Telegram</span>
          </a>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 scrollbar-thin scrollbar-thumb-[#83eef020]">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 items-start ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            {msg.role === "pepo" && (
              <div className="w-6 h-6 rounded-full overflow-hidden border border-[#83eef033] shrink-0 mt-0.5">
                <img src={pepoPng} alt="Pepo" className="w-full h-full object-cover" />
              </div>
            )}
            <div className={`max-w-[85%] rounded-2xl px-3 py-2 ${
              msg.role === "user"
                ? "bg-[#83eef01a] border border-[#83eef033] rounded-tr-sm"
                : "bg-[#ffffff08] border border-[#ffffff0d] rounded-tl-sm"
            }`}>
              {msg.role === "user" ? (
                <p className="text-[#d4e9f3] text-xs leading-relaxed">{msg.text}</p>
              ) : (
                renderPepoText(msg.text)
              )}
              {msg.role === "pepo" && msg.pointsAwarded && msg.pointsAwarded > 0 && (
                <div className="mt-2 flex items-center gap-1" data-testid="text-points-message">
                  <span className="text-[#83eef0] text-[10px] font-semibold">+{msg.pointsAwarded} pts earned</span>
                  <span className="text-[#d4e9f344] text-[10px]">for today's question</span>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2 items-start">
            <div className="w-6 h-6 rounded-full overflow-hidden border border-[#83eef033] shrink-0 mt-0.5">
              <img src={pepoPng} alt="Pepo" className="w-full h-full object-cover" />
            </div>
            <div className="bg-[#ffffff08] border border-[#ffffff0d] rounded-2xl rounded-tl-sm px-3 py-2 flex items-center gap-2">
              <Loader2 size={12} className="text-[#83eef066] animate-spin" />
              <span className="text-[#d4e9f366] text-xs">Pepo is thinking...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Points hint for unauthenticated */}
      {!isAuthenticated && (
        <div className="shrink-0 px-4 py-1.5 bg-[#83eef008] border-t border-[#83eef01a] flex items-center justify-center gap-1">
          <span className="text-[#d4e9f344] text-[10px]">Sign in to earn</span>
          <span className="text-[#83eef066] text-[10px] font-semibold">+10 pts</span>
          <span className="text-[#d4e9f344] text-[10px]">per daily question</span>
        </div>
      )}

      {/* Input bar */}
      <div className="shrink-0 px-3 py-3 border-t border-[#83eef01a] bg-[#001017bf]">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Pepo about coral reefs..."
            disabled={loading}
            data-testid="input-pepo-chat"
            className="flex-1 bg-[#ffffff08] border border-[#83eef01a] rounded-full px-4 py-2 text-[#d4e9f3] text-xs placeholder-[#d4e9f344] outline-none focus:border-[#83eef033] transition-colors disabled:opacity-50"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            data-testid="button-pepo-send"
            className="w-8 h-8 rounded-full bg-[#83eef0] hover:bg-[#6de0e2] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center shrink-0"
          >
            <Send size={13} className="text-[#00080c]" />
          </button>
        </div>
      </div>
    </div>
  );
}

export const ReefInsightDashboardSection = (): JSX.Element => {
  const [mobileTab, setMobileTab] = useState<"graph" | "chat">("graph");

  return (
    <div className="flex flex-col flex-1 self-stretch overflow-hidden pb-24 md:pb-0">
      {/* Mobile tab switcher */}
      <div className="flex md:hidden items-center gap-2 px-4 pt-3 pb-0 shrink-0">
        <button
          onClick={() => setMobileTab("graph")}
          className={`flex items-center gap-2 flex-1 justify-center py-2 rounded-full text-sm [font-family:'Inter',Helvetica] font-medium transition-all ${
            mobileTab === "graph"
              ? "bg-[#83eef01a] border border-[#83eef033] text-[#83eef0]"
              : "text-[#d4e9f380] border border-transparent"
          }`}
          style={mobileTab === "graph" ? { boxShadow: "inset 0 2px 6px rgba(0,0,0,0.55), inset 0 1px 2px rgba(0,0,0,0.35)" } : {}}
          data-testid="tab-graph"
        >
          <Network size={14} />
          Graph
        </button>
        <button
          onClick={() => setMobileTab("chat")}
          className={`flex items-center gap-2 flex-1 justify-center py-2 rounded-full text-sm [font-family:'Inter',Helvetica] font-medium transition-all ${
            mobileTab === "chat"
              ? "bg-[#229ED91a] border border-[#229ED933] text-[#229ED9]"
              : "text-[#d4e9f380] border border-transparent"
          }`}
          style={mobileTab === "chat" ? { boxShadow: "inset 0 2px 6px rgba(0,0,0,0.55), inset 0 1px 2px rgba(0,0,0,0.35)" } : {}}
          data-testid="tab-chat"
        >
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" xmlns="http://www.w3.org/2000/svg">
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
          </svg>
          Ask Pepo
        </button>
      </div>

      {/* Panels row */}
      <div className="flex flex-col md:flex-row items-start gap-4 md:gap-6 p-3 md:p-6 flex-1 overflow-hidden">

        {/* Left Panel: Bonfires Knowledge Graph */}
        <div className={`relative flex-1 self-stretch grow rounded-[28px] md:rounded-[48px] overflow-hidden border border-solid border-[#83eef01a] bg-[#00080c] flex flex-col ${mobileTab === "chat" ? "hidden md:flex" : "flex"}`}
          style={{ boxShadow: "inset 0 2px 6px rgba(0,0,0,0.55), inset 0 1px 2px rgba(0,0,0,0.35)" }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#83eef01a] bg-[#001017bf] shrink-0">
            <div className="flex items-center gap-2.5">
              <img className="w-6 h-6 flex-shrink-0" alt="Bonfires" src="/figmaAssets/container.svg" />
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
              data-testid="link-full-graph"
            >
              <ExternalLink size={10} className="text-[#83eef0]" />
              <span className="[font-family:'Inter',Helvetica] text-[#83eef0] text-[10px] font-medium whitespace-nowrap">Full Graph</span>
            </a>
          </div>
          <iframe
            src="https://pepo.app.bonfires.ai/graph"
            title="Reef Knowledge Graph"
            className="flex-1 w-full border-none"
            allow="fullscreen"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>

        {/* Right Panel: Pepo Chat + Footer */}
        <div className={`flex flex-col gap-4 md:gap-6 relative self-stretch w-full md:w-[400px] md:flex-none ${mobileTab === "graph" ? "hidden md:flex" : "flex flex-1"}`}>
          <PepoChat />

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
