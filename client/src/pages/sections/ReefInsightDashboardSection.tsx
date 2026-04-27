import { Card, CardContent } from "@/components/ui/card";
import { useState, useEffect, useCallback } from "react";
import { ExternalLink, Network } from "lucide-react";
import pepoPng from "@assets/MesoReefDAO_Pepo_The_Polyp_1776218616437.png";
import coralBg from "@assets/coral_textures_1776303814463.jpg";
import { usePrivy } from "@privy-io/react-auth";
import { useOrcidAuth } from "@/hooks/use-orcid-auth";
import { useQueryClient } from "@tanstack/react-query";

const TELEGRAM_BOT_URL = "https://t.me/PepothePolyp_bot";
const TELEGRAM_WEB_URL = "https://web.telegram.org/k/#@PepothePolyp_bot";
const BONFIRES_GRAPH_URL = "https://pepo.app.bonfires.ai/graph";

const footerLinks = [
  { label: "PRIVACY", href: "https://mesoreefdao.gitbook.io/privacy-policy" },
  { label: "TERMS", href: "https://mesoreefdao.gitbook.io/terms-and-conditions" },
  { label: "CONSERVATION", href: "https://mesoreefdao.org/science-ai" },
];


// ── Telegram icon SVG ────────────────────────────────────────────────────────
function TgIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.19 13.67l-2.948-.924c-.64-.203-.652-.64.136-.954l11.5-4.433c.536-.194 1.006.131.836.862z" fill="#229ED9" />
    </svg>
  );
}

// ── Bonfires Knowledge Graph panel ──────────────────────────────────────────
function KnowledgeGraphPanel() {
  return (
    <div
      className="relative flex-1 self-stretch w-full flex flex-col rounded-[24px] md:rounded-[32px] overflow-hidden border border-solid border-[#83eef01a] bg-[#00080c]"
      style={{ minHeight: "320px", boxShadow: "inset 0 2px 6px rgba(0,0,0,0.55), inset 0 1px 2px rgba(0,0,0,0.35)" }}
    >
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
          href={BONFIRES_GRAPH_URL}
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
        src={BONFIRES_GRAPH_URL}
        title="Reef Knowledge Graph"
        className="flex-1 w-full border-none"
        allow="fullscreen"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}

// ── Coral sparkle ────────────────────────────────────────────────────────────
function CoralSparkle({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
      {["✨", "🐠", "🌿", "💧", "🪸"].map((emoji, i) => (
        <span
          key={i}
          className="absolute text-lg animate-bounce"
          style={{
            animationDelay: `${i * 0.12}s`,
            animationDuration: "0.6s",
            top: `${20 + Math.sin(i * 72 * Math.PI / 180) * 38}%`,
            left: `${50 + Math.cos(i * 72 * Math.PI / 180) * 36}%`,
            opacity: 0.9,
          }}
        >
          {emoji}
        </span>
      ))}
    </div>
  );
}

// ── Clean a Coral panel ──────────────────────────────────────────────────────
function CleanCoralPanel() {
  const [claimed, setClaimed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [sparkle, setSparkle] = useState(false);
  const [ptsFlash, setPtsFlash] = useState(false);

  const { getAccessToken, login, authenticated: privyAuthenticated } = usePrivy();
  const { orcidAuthenticated } = useOrcidAuth();
  const isAuthenticated = privyAuthenticated || orcidAuthenticated;
  const queryClient = useQueryClient();

  const authHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (privyAuthenticated) {
      const token = await getAccessToken();
      if (token) h["x-privy-token"] = token;
    }
    return h;
  }, [privyAuthenticated, getAccessToken]);

  useEffect(() => {
    if (!isAuthenticated) { setChecking(false); return; }
    setChecking(true);
    (async () => {
      try {
        const h = await authHeaders();
        const res = await fetch("/api/daily-clean/status", { headers: h, credentials: "include" });
        const data = await res.json();
        setClaimed(data.alreadyClaimed ?? false);
      } catch { setClaimed(false); }
      finally { setChecking(false); }
    })();
  }, [isAuthenticated, authHeaders]);

  const handleClean = async () => {
    if (claimed || loading || !isAuthenticated) return;
    setLoading(true);
    try {
      const h = await authHeaders();
      const res = await fetch("/api/daily-clean", { method: "POST", headers: h, credentials: "include" });
      const data = await res.json();
      if (data.pointsAwarded > 0 || !data.alreadyClaimed) {
        setClaimed(true);
        setSparkle(true);
        setPtsFlash(true);
        setTimeout(() => setSparkle(false), 1800);
        setTimeout(() => setPtsFlash(false), 3200);
        queryClient.invalidateQueries({ queryKey: ["/api/leaderboard"] });
        queryClient.invalidateQueries({ queryKey: ["/api/auth/orcid/session"] });
      } else {
        setClaimed(true);
      }
    } catch { /* non-blocking */ }
    finally { setLoading(false); }
  };

  return (
    <div
      className="relative flex-1 self-stretch w-full flex flex-col rounded-[24px] md:rounded-[32px] overflow-hidden border border-solid border-[#83eef01a] bg-[#00080c]"
      style={{ minHeight: "320px", boxShadow: "inset 0 2px 6px rgba(0,0,0,0.55), inset 0 1px 2px rgba(0,0,0,0.35)" }}
    >
      <img src={coralBg} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none select-none" />
      <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(180deg, rgba(0,8,12,0.72) 0%, rgba(0,8,12,0.58) 40%, rgba(0,8,12,0.80) 100%)" }} />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-4 py-3 border-b border-[#83eef01a] bg-[#001017bf] shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full overflow-hidden border border-[#83eef066] shrink-0">
            <img src={pepoPng} alt="Pepo the Polyp" className="w-full h-full object-cover object-center" />
          </div>
          <div className="flex flex-col">
            <span className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-bold text-[#83eef0] text-sm leading-5">
              Daily Reef Action
            </span>
            <span className="[font-family:'Inter',Helvetica] font-normal text-[#d4e9f366] text-[10px] leading-4">
              Help Pepo restore the coral
            </span>
          </div>
        </div>
        <a
          href={TELEGRAM_BOT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#229ED91a] rounded-full border border-solid border-[#229ED933] hover:bg-[#229ED926] transition-colors no-underline"
          data-testid="link-telegram-bot"
        >
          <TgIcon size={11} />
          <span className="[font-family:'Inter',Helvetica] text-[#229ED9] text-[10px] font-medium whitespace-nowrap">Telegram</span>
        </a>
      </div>

      {/* Body */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-6 px-6 py-8">
        <CoralSparkle show={sparkle} />
        <div className="relative flex items-center justify-center">
          <div
            className={`w-28 h-28 rounded-full flex items-center justify-center transition-all duration-500 ${
              claimed
                ? "bg-[#83eef015] border-2 border-[#83eef040]"
                : "bg-[#83eef010] border-2 border-[#83eef030] hover:border-[#83eef060] hover:bg-[#83eef020]"
            }`}
            style={{ boxShadow: claimed ? "0 0 32px rgba(131,238,240,0.18)" : "0 0 18px rgba(131,238,240,0.08)" }}
          >
            <span className="text-6xl select-none" role="img" aria-label="coral">🪸</span>
          </div>
          {ptsFlash && (
            <div className="absolute -top-3 -right-3 flex items-center gap-0.5 px-2.5 py-1 bg-[#83eef0] rounded-full shadow-lg animate-bounce" data-testid="badge-clean-points">
              <span className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-bold text-[#003c3e] text-sm">+10 pts</span>
            </div>
          )}
        </div>

        <div className="flex flex-col items-center gap-1.5 text-center px-2">
          {checking ? (
            <div className="w-5 h-5 rounded-full border-2 border-[#83eef0] border-t-transparent animate-spin" />
          ) : claimed ? (
            <>
              <p className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-semibold text-[#83eef0] text-base">Coral cleaned! 🎉</p>
              <p className="[font-family:'Inter',Helvetica] text-[#d4e9f366] text-xs leading-relaxed">
                You've done your part today. Come back tomorrow to clean another coral and earn more reef points.
              </p>
            </>
          ) : isAuthenticated ? (
            <>
              <p className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-semibold text-[#d4e9f3] text-base">A coral needs your help!</p>
              <p className="[font-family:'Inter',Helvetica] text-[#d4e9f366] text-xs leading-relaxed">
                Clean a coral every day to earn reef points and protect the MesoAmerican Reef ecosystem.
              </p>
            </>
          ) : (
            <>
              <p className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-semibold text-[#d4e9f3] text-base">Help regenerate a reef</p>
              <p className="[font-family:'Inter',Helvetica] text-[#d4e9f366] text-xs leading-relaxed">
                Sign in to clean a coral every day and earn <span className="text-[#83eef0] font-semibold">+10 reef points</span>.
              </p>
            </>
          )}
        </div>

        {checking ? null : isAuthenticated ? (
          <button
            onClick={handleClean}
            disabled={claimed || loading}
            data-testid="button-clean-coral"
            className={`relative px-8 py-3.5 rounded-2xl [font-family:'Plus_Jakarta_Sans',Helvetica] font-bold text-sm transition-all duration-300 ${
              claimed
                ? "bg-[#83eef015] border border-[#83eef030] text-[#83eef066] cursor-default"
                : loading
                ? "bg-[#83eef030] border border-[#83eef050] text-[#83eef0] opacity-60 cursor-wait"
                : "bg-[linear-gradient(160deg,rgba(131,238,240,1)_0%,rgba(63,176,179,1)_100%)] text-[#003c3e] hover:opacity-90 active:scale-95 shadow-[0_4px_20px_rgba(131,238,240,0.3)] hover:shadow-[0_6px_28px_rgba(131,238,240,0.45)]"
            }`}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Cleaning…
              </span>
            ) : claimed ? "✓ Cleaned today" : "🪸 Clean a Coral  +10 pts"}
          </button>
        ) : (
          <button
            onClick={() => { try { login(); } catch { /* ignore */ } }}
            data-testid="button-sign-in-to-clean"
            className="px-8 py-3.5 rounded-2xl [font-family:'Plus_Jakarta_Sans',Helvetica] font-bold text-sm bg-[linear-gradient(160deg,rgba(131,238,240,1)_0%,rgba(63,176,179,1)_100%)] text-[#003c3e] hover:opacity-90 active:scale-95 shadow-[0_4px_20px_rgba(131,238,240,0.3)] transition-all duration-300"
          >
            Sign in to clean
          </button>
        )}

        {claimed && (
          <p className="[font-family:'Inter',Helvetica] text-[#d4e9f330] text-[10px]">Resets at midnight UTC</p>
        )}
      </div>

      {isAuthenticated && !claimed && !checking && (
        <div className="relative z-10 shrink-0 px-4 py-2 bg-[#83eef008] border-t border-[#83eef01a] flex items-center justify-center gap-1.5">
          <span className="text-[9px] [font-family:'Inter',Helvetica] text-[#d4e9f344]">Daily action</span>
          <span className="text-[9px] [font-family:'Inter',Helvetica] font-semibold text-[#83eef066]">·</span>
          <span className="text-[9px] [font-family:'Inter',Helvetica] font-semibold text-[#83eef0]">+10 reef pts</span>
          <span className="text-[9px] [font-family:'Inter',Helvetica] text-[#d4e9f344]">once per day</span>
        </div>
      )}
    </div>
  );
}

// ── Main dashboard ───────────────────────────────────────────────────────────
export const ReefInsightDashboardSection = (): JSX.Element => {
  const [mobileTab, setMobileTab] = useState<"graph" | "action">("graph");

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
          <Network size={13} className={mobileTab === "graph" ? "text-[#83eef0]" : "text-[#d4e9f380]"} />
          Graph
        </button>
        <button
          onClick={() => setMobileTab("action")}
          className={`flex items-center gap-2 flex-1 justify-center py-2 rounded-full text-sm [font-family:'Inter',Helvetica] font-medium transition-all ${
            mobileTab === "action"
              ? "bg-[#83eef01a] border border-[#83eef033] text-[#83eef0]"
              : "text-[#d4e9f380] border border-transparent"
          }`}
          style={mobileTab === "action" ? { boxShadow: "inset 0 2px 6px rgba(0,0,0,0.55), inset 0 1px 2px rgba(0,0,0,0.35)" } : {}}
          data-testid="tab-action"
        >
          🪸 Daily Action
        </button>
      </div>

      {/* Panels row */}
      <div className="flex flex-col md:flex-row items-start gap-4 md:gap-6 p-3 md:p-6 flex-1 overflow-hidden">

        {/* Left Panel: Reef Knowledge Graph */}
        <div className={`relative flex-1 self-stretch grow flex flex-col ${mobileTab === "action" ? "hidden md:flex" : "flex"}`}>
          <KnowledgeGraphPanel />
        </div>

        {/* Right Panel: Clean a Coral + Footer */}
        <div className={`flex flex-col gap-4 md:gap-6 relative self-stretch w-full md:w-[360px] md:flex-none ${mobileTab === "graph" ? "hidden md:flex" : "flex flex-1"}`}>
          <CleanCoralPanel />

          {/* Telegram Chat with us */}
          <a
            href={TELEGRAM_WEB_URL}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="link-telegram-chat-us"
            className="flex items-center gap-4 px-5 py-4 rounded-[24px] md:rounded-[28px] border border-[#229ED933] bg-[#229ED90d] hover:bg-[#229ED91a] active:bg-[#229ED922] transition-colors no-underline group"
            style={{ boxShadow: "0 2px 16px rgba(34,158,217,0.08)" }}
          >
            <div className="w-11 h-11 rounded-full bg-[#229ED91a] border border-[#229ED940] flex items-center justify-center flex-shrink-0 group-hover:bg-[#229ED926] transition-colors">
              <TgIcon size={22} />
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <span className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-bold text-[#d4e9f3] text-sm leading-5">
                Chat with us
              </span>
              <span className="[font-family:'Inter',Helvetica] text-[#229ED9] text-[11px] leading-4 truncate">
                @PepothePolyp_bot on Telegram
              </span>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-[#229ED966] flex-shrink-0 group-hover:text-[#229ED9] transition-colors">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>

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
