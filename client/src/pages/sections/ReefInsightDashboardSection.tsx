import { useState, useEffect, useCallback, useRef } from "react";
import pepoPng from "@assets/MesoReefDAO_Pepo_The_Polyp_1776218616437.png";
import coralBg from "@assets/coral_textures_1776303814463.jpg";
import { usePrivy } from "@privy-io/react-auth";
import { useOrcidAuth } from "@/hooks/use-orcid-auth";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

const TELEGRAM_BOT_URL = "https://t.me/PepothePolyp_bot";
const BONFIRES_GRAPH_URL = "https://pepo.app.bonfires.ai/graph";
const HINT_KEY = "pepo_graph_hint_v1";
const HINT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Internal y-coordinate where the Bonfires.ai EXPLORER panel header begins
// (nav bar ≈48 px + dark gap ≈80 px below nav = 128 px from page top).
// Setting this as the top-crop means the EXPLORER header sits right at the
// top of our container — matches the reference screenshot.
const NAV_CROP_PX = 128;

// Internal x-coordinate of the EXPLORER panel's right edge (measured from
// live screenshot at 1456 px: panel starts ≈267, width ≈286 → right ≈553).
// When the EXPLORER is toggled off we shift the iframe left by this amount
// so the EXPLORER slides out of the overflow-hidden boundary.
const LEFT_CROP_PX = 560;

// Dynamic scale targets: the ResizeObserver below keeps the iframe's
// internal viewport at TARGET_INTERNAL_PX regardless of container size,
// capped between MIN_SCALE and MAX_SCALE (0.65 = "65% of fit to the screen"
// as requested — all three panels visible at a comfortably smaller size).
// At TARGET_INTERNAL_PX = 1250, Bonfires.ai shows a clean flush 3-panel
// layout: EXPLORER (left) · graph canvas (center) · PepoThePolypBot (right).
const TARGET_INTERNAL_PX = 1250;
const MAX_SCALE = 0.65;
const MIN_SCALE = 0.48;

const EXAMPLE_PROMPTS = [
  "Any interesting things happened recently?",
  "Who are the most active participants lately?",
  "What can you do?",
];


function TgIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.19 13.67l-2.948-.924c-.64-.203-.652-.64.136-.954l11.5-4.433c.536-.194 1.006.131.836.862z" fill="#229ED9" />
    </svg>
  );
}

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

function CleanCoralPanel({ onClose }: { onClose?: () => void }) {
  const [claimed, setClaimed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [sparkle, setSparkle] = useState(false);
  const [ptsFlash, setPtsFlash] = useState(false);
  const { t } = useTranslation();

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
      className="relative w-full flex flex-col overflow-hidden"
      style={{ background: "linear-gradient(160deg,#001a22 0%,#00080c 100%)", border: "1px solid rgba(131,238,240,0.15)", borderRadius: 20, boxShadow: "0 16px 48px rgba(0,0,0,0.7)" }}
    >
      <img src={coralBg} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none select-none opacity-30" />
      <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(180deg,rgba(0,8,12,0.6) 0%,rgba(0,8,12,0.45) 40%,rgba(0,8,12,0.72) 100%)" }} />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-4 py-3 border-b border-[#83eef01a]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full overflow-hidden border border-[#83eef066] shrink-0">
            <img src={pepoPng} alt="Pepo" className="w-full h-full object-cover object-center" />
          </div>
          <div className="flex flex-col">
            <span className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-bold text-[#83eef0] text-sm leading-5">
              {t("dashboard.dailyReefAction")}
            </span>
            <span className="[font-family:'Inter',Helvetica] text-[#d4e9f366] text-[10px]">
              {t("dashboard.helpPepoRestore")}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={TELEGRAM_BOT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-[#229ED933] hover:bg-[#229ED926] transition-colors no-underline"
            style={{ background: "rgba(34,158,217,0.1)" }}
            data-testid="link-telegram-bot"
          >
            <TgIcon size={11} />
            <span className="[font-family:'Inter',Helvetica] text-[#229ED9] text-[10px] font-medium">{t("dashboard.telegram")}</span>
          </a>
          {onClose && (
            <button
              onClick={onClose}
              className="w-6 h-6 flex items-center justify-center rounded-full text-[#d4e9f340] hover:text-[#d4e9f380] hover:bg-[#ffffff08] transition-colors"
              data-testid="button-coral-close"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="relative z-10 flex flex-col items-center justify-center gap-5 px-6 py-6">
        <CoralSparkle show={sparkle} />
        <div className="relative flex items-center justify-center">
          <div
            className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500 ${
              claimed
                ? "bg-[#83eef015] border-2 border-[#83eef040]"
                : "bg-[#83eef010] border-2 border-[#83eef030] hover:border-[#83eef060] hover:bg-[#83eef020]"
            }`}
            style={{ boxShadow: claimed ? "0 0 32px rgba(131,238,240,0.18)" : "0 0 18px rgba(131,238,240,0.08)" }}
          >
            <span className="text-5xl select-none" role="img" aria-label="coral">🪸</span>
          </div>
          {ptsFlash && (
            <div className="absolute -top-2 -right-2 flex items-center px-2.5 py-1 bg-[#83eef0] rounded-full shadow-lg animate-bounce" data-testid="badge-clean-points">
              <span className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-bold text-[#003c3e] text-sm">+10 pts</span>
            </div>
          )}
        </div>

        <div className="flex flex-col items-center gap-1 text-center">
          {checking ? (
            <div className="w-5 h-5 rounded-full border-2 border-[#83eef0] border-t-transparent animate-spin" />
          ) : claimed ? (
            <>
              <p className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-semibold text-[#83eef0] text-sm">{t("dashboard.coralCleaned")}</p>
              <p className="[font-family:'Inter',Helvetica] text-[#d4e9f366] text-xs">{t("dashboard.doneForToday")}</p>
            </>
          ) : isAuthenticated ? (
            <>
              <p className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-semibold text-[#d4e9f3] text-sm">{t("dashboard.coralNeedsHelp")}</p>
              <p className="[font-family:'Inter',Helvetica] text-[#d4e9f366] text-xs">{t("dashboard.cleanCorals")}</p>
            </>
          ) : (
            <>
              <p className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-semibold text-[#d4e9f3] text-sm">{t("dashboard.helpRegenerate")}</p>
              <p className="[font-family:'Inter',Helvetica] text-[#d4e9f366] text-xs">
                {t("dashboard.signInToCleanDesc")} <span className="text-[#83eef0] font-semibold">{t("dashboard.reefPoints")}</span>.
              </p>
            </>
          )}
        </div>

        {checking ? null : isAuthenticated ? (
          <button
            onClick={handleClean}
            disabled={claimed || loading}
            data-testid="button-clean-coral"
            className={`px-7 py-3 rounded-2xl [font-family:'Plus_Jakarta_Sans',Helvetica] font-bold text-sm transition-all duration-300 ${
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
                {t("dashboard.cleaning")}
              </span>
            ) : claimed ? t("dashboard.cleanedToday") : t("dashboard.cleanCoral")}
          </button>
        ) : (
          <button
            onClick={() => { try { login(); } catch { /* ignore */ } }}
            data-testid="button-sign-in-to-clean"
            className="px-7 py-3 rounded-2xl [font-family:'Plus_Jakarta_Sans',Helvetica] font-bold text-sm bg-[linear-gradient(160deg,rgba(131,238,240,1)_0%,rgba(63,176,179,1)_100%)] text-[#003c3e] hover:opacity-90 active:scale-95 shadow-[0_4px_20px_rgba(131,238,240,0.3)] transition-all duration-300"
          >
            {t("dashboard.signInToClean")}
          </button>
        )}

        {claimed && (
          <p className="[font-family:'Inter',Helvetica] text-[#d4e9f330] text-[10px]">{t("dashboard.resetsAtMidnight")}</p>
        )}
      </div>

      {isAuthenticated && !claimed && !checking && (
        <div className="relative z-10 shrink-0 px-4 py-2 border-t border-[#83eef01a] flex items-center justify-center gap-1.5">
          <span className="text-[9px] [font-family:'Inter',Helvetica] text-[#d4e9f344]">{t("dashboard.dailyAction")}</span>
          <span className="text-[9px] text-[#83eef066]">·</span>
          <span className="text-[9px] [font-family:'Inter',Helvetica] font-semibold text-[#83eef0]">{t("dashboard.reefPts")}</span>
          <span className="text-[9px] [font-family:'Inter',Helvetica] text-[#d4e9f344]">{t("dashboard.oncePerDay")}</span>
        </div>
      )}
    </div>
  );
}

// ── Graph hint overlay — shown on first visit, dismisses after interaction ────
function GraphHintOverlay({ onDismiss }: { onDismiss: () => void }) {
  const [fading, setFading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    setFading(true);
    setTimeout(onDismiss, 350);
  }, [onDismiss]);

  useEffect(() => {
    timerRef.current = setTimeout(dismiss, 12000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [dismiss]);

  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center transition-opacity duration-300"
      style={{
        opacity: fading ? 0 : 1,
        background: "rgba(0,8,12,0.82)",
        backdropFilter: "blur(8px)",
      }}
    >
      {/* Card */}
      <div
        className="relative mx-4 flex flex-col items-center gap-4 rounded-3xl px-7 py-7 max-w-sm w-full text-center"
        style={{
          background: "linear-gradient(160deg,#001a22 0%,#00080c 100%)",
          border: "1px solid rgba(131,238,240,0.22)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.8), 0 0 60px rgba(131,238,240,0.06)",
        }}
      >
        {/* Dismiss X */}
        <button
          onClick={dismiss}
          data-testid="button-graph-hint-dismiss"
          className="absolute top-3.5 right-3.5 w-7 h-7 flex items-center justify-center rounded-full text-[#d4e9f340] hover:text-[#83eef0] hover:bg-[#83eef010] transition-colors"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
          </svg>
        </button>

        {/* Avatar + pulse ring */}
        <div className="relative flex items-center justify-center">
          <div className="absolute w-20 h-20 rounded-full animate-ping" style={{ background: "rgba(131,238,240,0.06)", animationDuration: "2.4s" }} />
          <div className="w-16 h-16 rounded-full overflow-hidden border-2" style={{ borderColor: "rgba(131,238,240,0.35)" }}>
            <img src={pepoPng} alt="Pepo" className="w-full h-full object-cover" />
          </div>
        </div>

        {/* Title */}
        <div className="flex flex-col gap-1">
          <span className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-bold text-[#83eef0] text-base leading-tight">
            Reef Knowledge Graph
          </span>
          <span className="[font-family:'Inter',Helvetica] text-[#d4e9f380] text-xs leading-relaxed">
            Ask PepoThePolypBot about the MesoReef ecosystem — nodes and connections build as you explore.
          </span>
        </div>

        {/* Panel tip */}
        <div
          className="w-full flex items-start gap-2.5 rounded-2xl px-3.5 py-3"
          style={{ background: "rgba(131,238,240,0.05)", border: "1px solid rgba(131,238,240,0.12)" }}
        >
          <span className="text-sm mt-0.5 shrink-0">💡</span>
          <span className="[font-family:'Inter',Helvetica] text-[10px] text-[#d4e9f399] leading-relaxed text-left">
            Use the <span className="font-semibold text-[#83eef0]">Explorer</span> on the left to search nodes and browse recent activity. Click any node on the graph to explore its connections.
          </span>
        </div>

        {/* Example prompt pills */}
        <div className="flex flex-col gap-2 w-full">
          <span className="[font-family:'Inter',Helvetica] text-[10px] text-[#d4e9f340] uppercase tracking-wider">
            try asking
          </span>
          {EXAMPLE_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={dismiss}
              data-testid={`button-graph-prompt-${prompt.slice(0, 10).replace(/\s+/g, "-").toLowerCase()}`}
              className="w-full px-4 py-2.5 rounded-2xl text-left text-xs [font-family:'Inter',Helvetica] text-[#d4e9f3cc] transition-all duration-150 hover:text-[#83eef0] active:scale-95"
              style={{
                background: "rgba(131,238,240,0.04)",
                border: "1px solid rgba(131,238,240,0.12)",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(131,238,240,0.09)")}
              onMouseLeave={e => (e.currentTarget.style.background = "rgba(131,238,240,0.04)")}
            >
              "{prompt}"
            </button>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={dismiss}
          data-testid="button-graph-hint-explore"
          className="w-full py-3 rounded-2xl [font-family:'Plus_Jakarta_Sans',Helvetica] font-bold text-sm text-[#003c3e] transition-all duration-200 hover:opacity-90 active:scale-95"
          style={{
            background: "linear-gradient(160deg,rgba(131,238,240,1) 0%,rgba(63,176,179,1) 100%)",
            boxShadow: "0 4px 20px rgba(131,238,240,0.28)",
          }}
        >
          Start Exploring →
        </button>

        {/* Auto-dismiss hint */}
        <span className="[font-family:'Inter',Helvetica] text-[9px] text-[#d4e9f330]">
          Dismisses automatically in a few seconds
        </span>
      </div>
    </div>
  );
}

// ── Graph loading shimmer ─────────────────────────────────────────────────────
function GraphLoadingShimmer({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#00080c] z-10 gap-4">
      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" className="animate-pulse">
        <circle cx="5" cy="12" r="2.5" fill="#83eef0" />
        <circle cx="12" cy="5" r="2.5" fill="#83eef066" />
        <circle cx="19" cy="12" r="2.5" fill="#83eef0" />
        <circle cx="12" cy="19" r="2.5" fill="#83eef066" />
        <line x1="5" y1="12" x2="12" y2="5" stroke="#83eef040" strokeWidth="1.2"/>
        <line x1="12" y1="5" x2="19" y2="12" stroke="#83eef040" strokeWidth="1.2"/>
        <line x1="5" y1="12" x2="12" y2="19" stroke="#83eef040" strokeWidth="1.2"/>
        <line x1="12" y1="19" x2="19" y2="12" stroke="#83eef040" strokeWidth="1.2"/>
        <line x1="5" y1="12" x2="19" y2="12" stroke="#83eef030" strokeWidth="1.2"/>
        <line x1="12" y1="5" x2="12" y2="19" stroke="#83eef030" strokeWidth="1.2"/>
      </svg>
      <span className="[font-family:'Inter',Helvetica] text-[#83eef0] text-sm opacity-70">Loading Knowledge Graph…</span>
    </div>
  );
}

// ── Main dashboard ─────────────────────────────────────────────────────────────
export const ReefInsightDashboardSection = (): JSX.Element => {
  const [graphLoading, setGraphLoading] = useState(true);
  const [coralOpen, setCoralOpen] = useState(true);
  const [explorerVisible, setExplorerVisible] = useState(true);
  // Dynamic scale: computed from container width so all three panels always fit
  const [scale, setScale] = useState(0.75);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const iframeWrapperRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  // Show hint overlay unless dismissed within the last 7 days
  const [showHint, setShowHint] = useState<boolean>(() => {
    try {
      const ts = localStorage.getItem(HINT_KEY);
      if (!ts) return true;
      return Date.now() - Number(ts) > HINT_TTL_MS;
    } catch {
      return true;
    }
  });

  const dismissHint = useCallback(() => {
    try { localStorage.setItem(HINT_KEY, String(Date.now())); } catch { /* ignore */ }
    setShowHint(false);
  }, []);

  const handleIframeLoad = useCallback(() => {
    setGraphLoading(false);
  }, []);

  // ResizeObserver: keep the iframe's internal viewport = TARGET_INTERNAL_PX
  // wide regardless of how wide/narrow the container is, capped at MAX_SCALE
  // so things never exceed 90 % of native size (the "90 % of fit" UX goal).
  useEffect(() => {
    const el = iframeWrapperRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      const computed = w / TARGET_INTERNAL_PX;
      setScale(Math.min(MAX_SCALE, Math.max(MIN_SCALE, computed)));
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div className="flex flex-row flex-1 self-stretch min-h-0 overflow-hidden px-2 md:px-4 pt-2 md:pt-3 pb-20 md:pb-3 gap-2">

      {/* ════════════════════════════════════════════════════════════════
          KNOWLEDGE GRAPH — branded header + cropped iframe
      ════════════════════════════════════════════════════════════════ */}
      <div
        className="flex flex-col flex-1 min-h-0 rounded-[16px] md:rounded-[24px] overflow-hidden"
        style={{
          minHeight: 320,
          border: "1px solid rgba(131,238,240,0.20)",
          boxShadow:
            "0 0 0 1px rgba(131,238,240,0.05)," +
            "0 0 60px rgba(131,238,240,0.08)," +
            "0 24px 64px rgba(0,0,0,0.6)," +
            "inset 0 0 120px rgba(0,8,12,0.6)",
          background: "#00080c",
        }}
      >
        {/* ── Header bar ──────────────────────────────────────────── */}
        <div
          className="shrink-0 flex items-center justify-between px-4 py-2.5"
          style={{
            background: "linear-gradient(90deg,rgba(0,26,34,0.95) 0%,rgba(0,8,12,0.95) 100%)",
            borderBottom: "1px solid rgba(131,238,240,0.12)",
          }}
        >
          {/* Left: icon + title */}
          <div className="flex items-center gap-2.5">
            {/* Graph node icon */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0">
              <circle cx="5"  cy="12" r="2.5" fill="#83eef0"/>
              <circle cx="12" cy="5"  r="2.5" fill="#83eef066"/>
              <circle cx="19" cy="12" r="2.5" fill="#83eef0"/>
              <circle cx="12" cy="19" r="2.5" fill="#83eef066"/>
              <line x1="5"  y1="12" x2="12" y2="5"  stroke="#83eef050" strokeWidth="1.2"/>
              <line x1="12" y1="5"  x2="19" y2="12" stroke="#83eef050" strokeWidth="1.2"/>
              <line x1="5"  y1="12" x2="12" y2="19" stroke="#83eef050" strokeWidth="1.2"/>
              <line x1="12" y1="19" x2="19" y2="12" stroke="#83eef050" strokeWidth="1.2"/>
            </svg>
            <span
              className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-bold text-sm"
              style={{ color: "#d4e9f3" }}
            >
              Regen Reef Knowledge Graph
            </span>
          </div>

          {/* Right: EXPLORER toggle + powered-by badge + open-in-full link */}
          <div className="flex items-center gap-3">
            {/* EXPLORER panel visibility toggle */}
            <button
              onClick={() => setExplorerVisible(v => !v)}
              data-testid="button-toggle-explorer"
              title={explorerVisible ? "Minimize EXPLORER panel" : "Show EXPLORER panel"}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-colors hover:bg-[#83eef010] text-[#83eef066] hover:text-[#83eef0]"
              style={{ border: "1px solid rgba(131,238,240,0.14)" }}
            >
              {/* Sidebar/panel icon */}
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
                <line x1="9" y1="3" x2="9" y2="21" stroke="currentColor" strokeWidth="2"/>
                {explorerVisible
                  ? <polyline points="6,9 3,12 6,15" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                  : <polyline points="12,9 15,12 12,15" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                }
              </svg>
              <span className="[font-family:'Inter',Helvetica] text-[10px] font-medium hidden sm:block">
                {explorerVisible ? "Hide Explorer" : "Show Explorer"}
              </span>
            </button>

            <span className="[font-family:'Inter',Helvetica] text-[10px] text-[#d4e9f340] hidden sm:block">
              powered by Bonfires.ai
            </span>
            <a
              href={BONFIRES_GRAPH_URL}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="link-graph-fullscreen"
              title="Open in full screen"
              className="flex items-center gap-1 px-2.5 py-1 rounded-full transition-colors hover:bg-[#83eef010] text-[#83eef066] hover:text-[#83eef0]"
              style={{ border: "1px solid rgba(131,238,240,0.14)" }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                <path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6M15 3h6v6M10 14L21 3"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="[font-family:'Inter',Helvetica] text-[10px] font-medium hidden sm:block">Full screen</span>
            </a>
          </div>
        </div>

        {/* ── iframe wrapper ─────────────────────────────────────── */}
        {/* ResizeObserver (attached via iframeWrapperRef) watches this    */}
        {/* div's width and recalculates `scale` so the iframe always      */}
        {/* renders at TARGET_INTERNAL_PX (1250 px) internally — wide      */}
        {/* enough for all three Bonfires.ai panels — while the visual     */}
        {/* output is scaled down to fill this container exactly.          */}
        <div ref={iframeWrapperRef} className="relative flex-1 min-h-0 overflow-hidden">
          {/* Subtle teal edge glows */}
          <div className="absolute top-0 left-0 bottom-0 w-[3px] z-[6] pointer-events-none"
            style={{ background: "linear-gradient(180deg,rgba(131,238,240,0.0) 0%,rgba(131,238,240,0.30) 50%,rgba(131,238,240,0.0) 100%)" }} />
          <div className="absolute top-0 left-0 right-0 h-[2px] z-[6] pointer-events-none"
            style={{ background: "linear-gradient(90deg,rgba(131,238,240,0.0) 0%,rgba(131,238,240,0.35) 50%,rgba(131,238,240,0.0) 100%)" }} />

          <GraphLoadingShimmer visible={graphLoading} />

          {/* iframe: internal viewport = TARGET_INTERNAL_PX px wide (1250 px).
              `scale` is recomputed on every container resize so the visual
              result always fills the wrapper exactly, panels always visible.
              Formula (transformOrigin = top left):
                A point at internal (ix, iy) maps to visual:
                  visual_x = css_left + ix × scale
                  visual_y = css_top  + iy × scale
              So to show internal y=NAV_CROP_PX at visual y=0:
                css_top = -(NAV_CROP_PX × scale)          ← NOT /scale
              To show internal x=LEFT_CROP_PX at visual x=0 (explorer hidden):
                css_left = -(LEFT_CROP_PX × scale)
              Heights/widths compensate by adding the crop in px. */}
          <iframe
            ref={iframeRef}
            src={BONFIRES_GRAPH_URL}
            title="Regen Reef Knowledge Graph"
            className="absolute border-0"
            style={{
              transform: `scale(${scale})`,
              transformOrigin: "top left",
              top: `${-(NAV_CROP_PX * scale)}px`,
              left: explorerVisible ? 0 : `${-(LEFT_CROP_PX * scale)}px`,
              width: explorerVisible
                ? `${(1 / scale) * 100}%`
                : `calc(${(1 / scale) * 100}% + ${LEFT_CROP_PX}px)`,
              height: `calc(${(1 / scale) * 100}% + ${NAV_CROP_PX}px)`,
              background: "#00080c",
            }}
            allow="clipboard-write; clipboard-read; pointer-lock; fullscreen"
            loading="lazy"
            data-testid="iframe-knowledge-graph"
            onLoad={handleIframeLoad}
          />

          {/* First-visit hint */}
          {showHint && !graphLoading && (
            <GraphHintOverlay onDismiss={dismissHint} />
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════
          DAILY REEF ACTION — collapsible right panel
      ════════════════════════════════════════════════════════════════ */}
      <div
        className="hidden md:flex flex-col shrink-0 min-h-0 transition-all duration-300"
        style={{ width: coralOpen ? 260 : 32 }}
      >
        {/* Collapse / expand toggle tab */}
        <button
          onClick={() => setCoralOpen(o => !o)}
          data-testid="button-coral-toggle"
          title={coralOpen ? "Hide Daily Reef Action" : "Show Daily Reef Action"}
          className="flex items-center justify-center w-8 h-8 rounded-full shrink-0 self-end mb-2 transition-colors"
          style={{
            background: "rgba(131,238,240,0.08)",
            border: "1px solid rgba(131,238,240,0.20)",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path
              d={coralOpen ? "M9 18l6-6-6-6" : "M15 18l-6-6 6-6"}
              stroke="#83eef0"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {/* Panel content — only rendered when open */}
        {coralOpen && (
          <div className="flex-1 min-h-0 overflow-hidden rounded-[20px]">
            <CleanCoralPanel />
          </div>
        )}
      </div>

    </div>
  );
};
