import { Card, CardContent } from "@/components/ui/card";
import { useState, useEffect, useCallback, useRef } from "react";
import { ExternalLink, Network, Search, Clock, Loader2, Send, X } from "lucide-react";
import pepoPng from "@assets/MesoReefDAO_Pepo_The_Polyp_1776218616437.png";
import coralBg from "@assets/coral_textures_1776303814463.jpg";
import { usePrivy } from "@privy-io/react-auth";
import { useOrcidAuth } from "@/hooks/use-orcid-auth";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

const TELEGRAM_BOT_URL = "https://t.me/PepothePolyp_bot";
const BONFIRES_GRAPH_URL = "https://pepo.app.bonfires.ai/graph";

const FOOTER_LINK_HREFS = [
  { key: "privacy" as const,       href: "https://mesoreefdao.gitbook.io/privacy-policy" },
  { key: "terms" as const,         href: "https://mesoreefdao.gitbook.io/terms-and-conditions" },
  { key: "conservation" as const,  href: "https://mesoreefdao.org/science-ai" },
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
interface BonfiresEpisode {
  uuid: string;
  name: string;
  node_type?: string;
  valid_at: string | null;
  created_at: string;
  summary?: string;
  content?: { content?: string };
}

interface BonfiresSearchResult {
  uuid: string;
  name: string;
  node_type: string;
  summary?: string;
  content?: { content?: string };
}

// ── Suggested prompts shown in the Explorer ──────────────────────────────────
const SUGGESTED_PROMPTS = [
  "Any interesting things happened recently?",
  "Who are the most active participants lately?",
  "What can you do?",
];

function BonfiresExplorer() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ entities: BonfiresSearchResult[]; episodes: BonfiresEpisode[] } | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [activeTab, setActiveTab] = useState<"search" | "recent">("recent");
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();

  const { data: recentData, isLoading: recentLoading } = useQuery<{ episodes: BonfiresEpisode[] }>({
    queryKey: ["/api/graph/recent"],
    staleTime: 5 * 60 * 1000,
  });

  const runSearch = async (q: string) => {
    if (!q.trim()) return;
    setSearching(true);
    setSearchError(false);
    setSearchResults(null);
    setActiveTab("search");
    try {
      const res = await fetch("/api/graph/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q.trim() }),
      });
      if (!res.ok) throw new Error("search failed");
      setSearchResults(await res.json());
    } catch {
      setSearchError(true);
    } finally {
      setSearching(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); runSearch(searchQuery); };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults(null);
    setSearchError(false);
    setActiveTab("recent");
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const allResults = searchResults ? [...(searchResults.entities || []), ...(searchResults.episodes || [])] : [];

  const fmtDate = (iso: string | null | undefined) => {
    if (!iso) return null;
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
      " · " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  const nodeTypePill = (type: string | undefined) => {
    const isEpisode = (type ?? "episode") === "episode";
    return (
      <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[8px] font-semibold uppercase tracking-wider ${
        isEpisode ? "bg-[#3b82f615] text-[#60a5fa]" : "bg-[#22c55e15] text-[#4ade80]"
      }`}>
        {isEpisode ? t("dashboard.episode") : t("dashboard.entity")}
      </span>
    );
  };

  return (
    <div className="flex flex-col border-t border-[#83eef01a] bg-[#00080ccc]">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 shrink-0">
        <span className="[font-family:'Inter',Helvetica] text-[#d4e9f3] text-[11px] font-bold tracking-widest uppercase">
          Explorer
        </span>
        <span className="text-[9px] text-[#83eef066] [font-family:'Inter',Helvetica]">
          {t("dashboard.poweredByBonfires")}
        </span>
      </div>

      {/* ── Search bar ── */}
      <div className="px-4 pb-2 shrink-0">
        <form onSubmit={handleSearch} className="relative flex items-center">
          <Search size={13} className="absolute left-3 text-[#d4e9f333] pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t("dashboard.searchGraph")}
            className="w-full bg-[#ffffff0a] border border-[#83eef01a] rounded-xl pl-8 pr-8 py-2 text-[#d4e9f3] text-[12px] placeholder:text-[#d4e9f333] focus:outline-none focus:border-[#83eef044] transition-colors"
            data-testid="input-graph-search"
          />
          {searchQuery ? (
            <button type="button" onClick={clearSearch} className="absolute right-2.5 text-[#d4e9f344] hover:text-[#d4e9f3] transition-colors">
              <X size={13} />
            </button>
          ) : (
            <button type="submit" disabled={!searchQuery.trim() || searching} className="absolute right-2.5 text-[#83eef066] hover:text-[#83eef0] disabled:opacity-30 transition-colors">
              {searching ? <Loader2 size={13} className="animate-spin" /> : <Send size={12} />}
            </button>
          )}
        </form>
      </div>

      {/* ── Suggested prompts (idle state) ── */}
      {!searchResults && !searching && !searchError && (
        <div className="px-4 pb-3 flex flex-col gap-1.5 shrink-0">
          <p className="text-[9px] text-[#d4e9f344] [font-family:'Inter',Helvetica] uppercase tracking-wider mb-0.5">
            {t("dashboard.searchGraph").replace("…", "")} examples
          </p>
          {SUGGESTED_PROMPTS.map(prompt => (
            <button
              key={prompt}
              onClick={() => { setSearchQuery(prompt); runSearch(prompt); }}
              className="text-left text-[11px] text-[#d4e9f380] hover:text-[#83eef0] hover:bg-[#83eef00a] px-3 py-1.5 rounded-xl border border-[#ffffff08] hover:border-[#83eef01a] transition-all [font-family:'Inter',Helvetica]"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* ── Results / Recent feed ── */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-2" style={{ maxHeight: "320px" }}>

        {/* Search error */}
        {searchError && (
          <p className="text-[#ff6b6b] text-[10px] text-center py-3">{t("dashboard.searchUnavailable")}</p>
        )}

        {/* Search results */}
        {searching && (
          <div className="flex justify-center py-6">
            <Loader2 size={18} className="text-[#83eef066] animate-spin" />
          </div>
        )}

        {searchResults !== null && !searching && (
          <>
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[9px] text-[#83eef066] uppercase tracking-widest font-semibold [font-family:'Inter',Helvetica]">
                {allResults.length === 0 ? t("dashboard.noResults") : t("dashboard.result", { count: allResults.length })}
              </span>
              <button onClick={clearSearch} className="text-[9px] text-[#d4e9f344] hover:text-[#d4e9f3] transition-colors [font-family:'Inter',Helvetica]">
                ← Back
              </button>
            </div>
            {allResults.slice(0, 8).map(item => (
              <div key={item.uuid} className="bg-[#ffffff06] hover:bg-[#83eef008] rounded-xl px-3 py-2.5 border border-[#ffffff0a] hover:border-[#83eef01a] transition-all cursor-default">
                <div className="flex items-center gap-1.5 mb-1">
                  {nodeTypePill(item.node_type)}
                </div>
                <div className="text-[#d4e9f3] text-[12px] font-semibold leading-snug line-clamp-2 [font-family:'Inter',Helvetica]">{item.name}</div>
                {(item.summary || item.content?.content) && (
                  <div className="text-[#d4e9f355] text-[10px] mt-1 line-clamp-3 leading-relaxed [font-family:'Inter',Helvetica]">
                    {item.summary || item.content?.content}
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        {/* Recent activity — default view */}
        {activeTab === "recent" && !searchResults && !searching && !searchError && (
          <>
            <div className="flex items-center gap-1.5 mb-0.5">
              <Clock size={10} className="text-[#83eef066]" />
              <span className="text-[9px] text-[#83eef066] uppercase tracking-widest font-semibold [font-family:'Inter',Helvetica]">
                {t("dashboard.recentActivity")}
              </span>
            </div>
            {recentLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 size={18} className="text-[#83eef066] animate-spin" />
              </div>
            ) : (recentData?.episodes || []).length === 0 ? (
              <p className="text-[#d4e9f344] text-[10px] text-center py-3 [font-family:'Inter',Helvetica]">{t("dashboard.noRecentActivity")}</p>
            ) : (
              (recentData?.episodes || []).slice(0, 8).map(ep => (
                <div key={ep.uuid} className="bg-[#ffffff06] hover:bg-[#83eef008] rounded-xl px-3 py-2.5 border border-[#ffffff0a] hover:border-[#83eef01a] transition-all cursor-default">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[8px] font-semibold uppercase tracking-wider bg-[#3b82f615] text-[#60a5fa]">
                      {t("dashboard.episode")}
                    </span>
                    {fmtDate(ep.valid_at || ep.created_at) && (
                      <span className="text-[#83eef055] text-[9px] [font-family:'Inter',Helvetica]">
                        {fmtDate(ep.valid_at || ep.created_at)}
                      </span>
                    )}
                  </div>
                  <div className="text-[#d4e9f3] text-[12px] font-semibold leading-snug line-clamp-2 [font-family:'Inter',Helvetica]">{ep.name}</div>
                  {ep.content?.content && (
                    <div className="text-[#d4e9f355] text-[10px] mt-1 line-clamp-3 leading-relaxed [font-family:'Inter',Helvetica]">
                      {ep.content.content}
                    </div>
                  )}
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}

function KnowledgeGraphPanel() {
  const { t } = useTranslation();
  return (
    <div
      className="relative flex-1 self-stretch w-full flex flex-col rounded-[24px] md:rounded-[32px] overflow-hidden border border-solid border-[#83eef01a] bg-[#00080c]"
      style={{ minHeight: "320px", boxShadow: "inset 0 2px 6px rgba(0,0,0,0.55), inset 0 1px 2px rgba(0,0,0,0.35)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#83eef01a] bg-[#001017bf] shrink-0">
        <div className="flex items-center gap-2.5">
          <img className="w-6 h-6 flex-shrink-0" alt="Bonfires" src="/figmaAssets/container.svg" />
          <div className="flex flex-col">
            <span className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-bold text-[#83eef0] text-sm leading-5">
              {t("dashboard.knowledgeGraph")}
            </span>
            <span className="[font-family:'Inter',Helvetica] font-normal text-[#d4e9f366] text-[10px] leading-4">
              {t("dashboard.poweredByBonfires")}
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
          <span className="[font-family:'Inter',Helvetica] text-[#83eef0] text-[10px] font-medium whitespace-nowrap">{t("dashboard.fullGraph")}</span>
        </a>
      </div>

      <div className="relative flex-1 w-full overflow-hidden" style={{ minHeight: "400px" }}>
        {/* Bonfires.ai graph — all screen sizes */}
        <iframe
          src="/api/graph-embed"
          title="Reef Knowledge Graph"
          style={{
            position: "absolute",
            top: "0",
            left: "0",
            width: "100%",
            height: "100%",
            border: "none",
          }}
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          loading="lazy"
          data-testid="iframe-knowledge-graph"
        />
      </div>
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
              {t("dashboard.dailyReefAction")}
            </span>
            <span className="[font-family:'Inter',Helvetica] font-normal text-[#d4e9f366] text-[10px] leading-4">
              {t("dashboard.helpPepoRestore")}
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
          <span className="[font-family:'Inter',Helvetica] text-[#229ED9] text-[10px] font-medium whitespace-nowrap">{t("dashboard.telegram")}</span>
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
              <p className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-semibold text-[#83eef0] text-base">{t("dashboard.coralCleaned")}</p>
              <p className="[font-family:'Inter',Helvetica] text-[#d4e9f366] text-xs leading-relaxed">
                {t("dashboard.doneForToday")}
              </p>
            </>
          ) : isAuthenticated ? (
            <>
              <p className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-semibold text-[#d4e9f3] text-base">{t("dashboard.coralNeedsHelp")}</p>
              <p className="[font-family:'Inter',Helvetica] text-[#d4e9f366] text-xs leading-relaxed">
                {t("dashboard.cleanCorals")}
              </p>
            </>
          ) : (
            <>
              <p className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-semibold text-[#d4e9f3] text-base">{t("dashboard.helpRegenerate")}</p>
              <p className="[font-family:'Inter',Helvetica] text-[#d4e9f366] text-xs leading-relaxed">
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
                {t("dashboard.cleaning")}
              </span>
            ) : claimed ? t("dashboard.cleanedToday") : t("dashboard.cleanCoral")}
          </button>
        ) : (
          <button
            onClick={() => { try { login(); } catch { /* ignore */ } }}
            data-testid="button-sign-in-to-clean"
            className="px-8 py-3.5 rounded-2xl [font-family:'Plus_Jakarta_Sans',Helvetica] font-bold text-sm bg-[linear-gradient(160deg,rgba(131,238,240,1)_0%,rgba(63,176,179,1)_100%)] text-[#003c3e] hover:opacity-90 active:scale-95 shadow-[0_4px_20px_rgba(131,238,240,0.3)] transition-all duration-300"
          >
            {t("dashboard.signInToClean")}
          </button>
        )}

        {claimed && (
          <p className="[font-family:'Inter',Helvetica] text-[#d4e9f330] text-[10px]">{t("dashboard.resetsAtMidnight")}</p>
        )}
      </div>

      {isAuthenticated && !claimed && !checking && (
        <div className="relative z-10 shrink-0 px-4 py-2 bg-[#83eef008] border-t border-[#83eef01a] flex items-center justify-center gap-1.5">
          <span className="text-[9px] [font-family:'Inter',Helvetica] text-[#d4e9f344]">{t("dashboard.dailyAction")}</span>
          <span className="text-[9px] [font-family:'Inter',Helvetica] font-semibold text-[#83eef066]">·</span>
          <span className="text-[9px] [font-family:'Inter',Helvetica] font-semibold text-[#83eef0]">{t("dashboard.reefPts")}</span>
          <span className="text-[9px] [font-family:'Inter',Helvetica] text-[#d4e9f344]">{t("dashboard.oncePerDay")}</span>
        </div>
      )}
    </div>
  );
}

// ── Main dashboard ───────────────────────────────────────────────────────────
export const ReefInsightDashboardSection = (): JSX.Element => {
  const [mobileTab, setMobileTab] = useState<"graph" | "action">("graph");
  const { t } = useTranslation();

  return (
    <div className="flex flex-col flex-1 self-stretch overflow-y-auto overflow-x-hidden pb-24 md:pb-6">

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
          {t("dashboard.graphTab")}
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
          🪸 {t("dashboard.actionTab")}
        </button>
      </div>

      {/* Main content area — desktop: Knowledge Graph left + Daily Reef Action right */}
      <div className="flex flex-col md:flex-row flex-1 gap-4 md:gap-6 px-3 md:px-6 pt-3 md:pt-6 min-h-0">

        {/* Knowledge Graph — left / full on mobile */}
        <div className={`flex-1 min-w-0 ${mobileTab === "action" ? "hidden md:block" : "block"}`}>
          <div style={{ height: "clamp(420px, 74vh, 920px)" }} className="w-full">
            <KnowledgeGraphPanel />
          </div>
        </div>

        {/* Daily Reef Action — right panel on desktop, full-width on mobile */}
        <div className={`md:w-[300px] md:flex-none shrink-0 ${mobileTab === "graph" ? "hidden md:flex" : "flex"} flex-col`}>
          <CleanCoralPanel />
        </div>

      </div>

      {/* Footer row — centered below */}
      <div className="flex justify-center px-3 md:px-6 pt-4 md:pt-5 pb-2">
        <Card className="flex flex-col items-center justify-center gap-3 px-6 py-4 w-full max-w-lg bg-[#00000066] rounded-[28px] border border-solid border-[#ffffff1a] backdrop-blur-md [-webkit-backdrop-filter:blur(12px)_brightness(100%)] shadow-none">
          <CardContent className="flex flex-col items-center gap-3 p-0 w-full">
            <nav className="inline-flex items-start gap-4 md:gap-6 relative flex-[0_0_auto]">
              {FOOTER_LINK_HREFS.map(({ key, href }) => (
                <a
                  key={key}
                  className="relative flex items-center w-fit [font-family:'Inter',Helvetica] font-normal text-[#d4e9f366] text-[9px] md:text-[10px] tracking-[1.00px] leading-[15px] whitespace-nowrap hover:text-[#d4e9f3] transition-colors"
                  href={href}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {t(`footer.${key}`)}
                </a>
              ))}
            </nav>
            <div className="inline-flex flex-col items-center gap-1 relative flex-[0_0_auto] opacity-60">
              <span className="[font-family:'Inter',Helvetica] font-normal text-[#d4e9f3] text-[8px] text-center leading-3">
                {t("footer.copyright")}
              </span>
              <div className="inline-flex items-center gap-1.5 relative flex-[0_0_auto]">
                <span className="[font-family:'Inter',Helvetica] font-normal text-[#d4e9f3] text-[8px] text-center leading-3">
                  {t("footer.poweredBy")}{" "}
                  <a href="https://bonfires.ai/" rel="noopener noreferrer" target="_blank" className="hover:text-[#d4e9f3] transition-colors">
                    Bonfires.ai
                  </a>
                </span>
                <img src="/figmaAssets/bonfires-ai-logo-new.png" alt="Bonfires.ai" className="h-3.5 w-auto object-contain" />
              </div>
              <span className="[font-family:'Inter',Helvetica] font-normal text-[#d4e9f3] text-[8px] text-center leading-3">
                {t("footer.allRightsReserved")}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
