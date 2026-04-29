import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Link } from "wouter";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useOrcidAuth } from "@/hooks/use-orcid-auth";
import {
  ArrowLeft, Vote, Plus, CheckCircle2, XCircle, Loader2, Users, BarChart2,
  Calendar, ChevronDown, ChevronUp, AlertCircle, ExternalLink, Github,
  CircleDot, CheckSquare, BarChart, Info, Search, TrendingUp, Activity,
  Clock, Hash, Shield, Zap, Eye, LayoutGrid, Globe,
} from "lucide-react";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import coralBg from "@assets/coral_micro_1777060394505.jpg";

// ─── Vocdoni config ───────────────────────────────────────────────────────────
const VOCDONI_ENV = (import.meta.env.VITE_VOCDONI_ENV as string) || "prod";

const DEFAULT_GH_OWNER = (import.meta.env.VITE_GITHUB_OWNER as string) || "robioreefeco";
const DEFAULT_GH_REPO  = (import.meta.env.VITE_GITHUB_REPO  as string) || "memento-mori";

// ─── Types ───────────────────────────────────────────────────────────────────
type VotingStrategy = "standard" | "approval" | "quadratic";
type CensusMode     = "open" | "base-members";

interface VocdoniChoice {
  title: Record<string, string> | string;
  value: number;
}
interface VocdoniQuestion {
  title: Record<string, string> | string;
  description?: Record<string, string> | string;
  choices: VocdoniChoice[];
}
interface VocdoniElection {
  electionId: string;
  organizationId: string;
  status: "ONGOING" | "ENDED" | "UPCOMING" | "PAUSED" | "CANCELED" | string;
  startDate: string;
  endDate: string;
  finalResults: boolean;
  voteCount: number;
  title: Record<string, string> | string;
  description?: Record<string, string> | string;
  header?: string;
  questions?: VocdoniQuestion[];
  results?: string[][];
  census?: { censusType: string; maxCensusSize?: number };
  meta?: Record<string, any>;
}

interface GithubItem {
  number: number;
  title: string;
  type: "issue" | "pr";
  url: string;
  labels: string[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getText(val: Record<string, string> | string | undefined, fallback = ""): string {
  if (!val) return fallback;
  if (typeof val === "string") return val;
  return val.default ?? val.en ?? Object.values(val)[0] ?? fallback;
}

function statusStyle(status: string) {
  switch (status?.toUpperCase()) {
    case "ONGOING":  return { label: "Active",   color: "#4ade80", bg: "#4ade8015", border: "#4ade8030", dot: "#4ade80" };
    case "ENDED":    return { label: "Ended",    color: "#94a3b8", bg: "#ffffff06", border: "#ffffff10", dot: "#94a3b8" };
    case "RESULTS":  return { label: "Results",  color: "#83eef0", bg: "#83eef015", border: "#83eef030", dot: "#83eef0" };
    case "UPCOMING": return { label: "Upcoming", color: "#a78bfa", bg: "#a78bfa15", border: "#a78bfa30", dot: "#a78bfa" };
    case "PAUSED":   return { label: "Paused",   color: "#fbbf24", bg: "#fbbf2415", border: "#fbbf2430", dot: "#fbbf24" };
    case "CANCELED": return { label: "Canceled", color: "#f87171", bg: "#f8717115", border: "#f8717130", dot: "#f87171" };
    default:         return { label: status || "Unknown", color: "#94a3b8", bg: "#ffffff06", border: "#ffffff10", dot: "#94a3b8" };
  }
}

// ─── Map Vocdoni SDK PublishedElection → VocdoniElection ─────────────────────
function mapSDKElection(e: any): VocdoniElection {
  const status = typeof e.status === "string" ? e.status : String(e.status ?? "UNKNOWN");
  const toISO  = (d: any) => d instanceof Date ? d.toISOString() : (d ?? "");
  return {
    electionId:      e.id ?? e.electionId ?? "",
    organizationId:  e.organizationId ?? "",
    status,
    startDate:       toISO(e.startDate),
    endDate:         toISO(e.endDate),
    finalResults:    e.finalResults ?? (status === "RESULTS" || status === "ENDED"),
    voteCount:       e.voteCount ?? 0,
    title:           e.title ?? "",
    description:     e.description,
    header:          e.header,
    questions:       e.questions,
    results:         e.results,
    census:          e.census,
    meta:            e.meta,
  };
}

function fmtDate(dateStr: string): string {
  try { return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
  catch { return dateStr; }
}
function fmtDateShort(dateStr: string): string {
  try { return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" }); }
  catch { return dateStr; }
}
function daysLeft(endDate: string): string {
  const diff = new Date(endDate).getTime() - Date.now();
  if (diff <= 0) return "Ended";
  const d = Math.ceil(diff / 86400000);
  return d === 1 ? "1 day left" : `${d} days left`;
}

function totalVotes(results: string[][] | undefined, qi = 0): number {
  if (!results?.[qi]) return 0;
  return results[qi].reduce((s, v) => s + (parseInt(v) || 0), 0);
}
function pct(results: string[][] | undefined, qi: number, ci: number): number {
  const tot = totalVotes(results, qi);
  if (!tot || !results?.[qi]) return 0;
  return Math.round(((parseInt(results[qi][ci] || "0")) / tot) * 100);
}

function strategyFromMeta(meta?: Record<string, any>): VotingStrategy {
  if (!meta) return "standard";
  return (meta.votingStrategy as VotingStrategy) || "standard";
}
function censorModeFromMeta(meta?: Record<string, any>): CensusMode {
  if (!meta) return "open";
  return (meta.censusMode as CensusMode) || "open";
}

const STRATEGY_META: Record<VotingStrategy, { label: string; color: string; bg: string; icon: any }> = {
  standard:  { label: "Standard",  color: "#83eef0", bg: "#83eef010", icon: Vote },
  approval:  { label: "Approval",  color: "#a78bfa", bg: "#a78bfa10", icon: CheckSquare },
  quadratic: { label: "Quadratic", color: "#f59e0b", bg: "#f59e0b10", icon: BarChart },
};

// ─── Strategy badge ──────────────────────────────────────────────────────────
function StrategyBadge({ strategy }: { strategy: VotingStrategy }) {
  const s = STRATEGY_META[strategy] ?? STRATEGY_META.standard;
  const Icon = s.icon;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ color: s.color, background: s.bg, border: `1px solid ${s.color}25` }}>
      <Icon size={9} />{s.label}
    </span>
  );
}

// ─── Status pill ─────────────────────────────────────────────────────────────
function StatusPill({ status }: { status: string }) {
  const s = statusStyle(status);
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ color: s.color, background: s.bg, border: `1px solid ${s.border}` }}>
      <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: s.dot }} />
      {s.label}
    </span>
  );
}

// ─── Step stepper ─────────────────────────────────────────────────────────────
function StepStepper({ steps }: { steps: { label: string; state: "waiting" | "active" | "done" | "skip" }[] }) {
  return (
    <div className="flex flex-col gap-3 py-2">
      {steps.filter(s => s.state !== "skip").map((s, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
            style={{ background: s.state === "done" ? "#83eef018" : s.state === "active" ? "#83eef010" : "#ffffff08", border: `1.5px solid ${s.state === "done" ? "#83eef060" : s.state === "active" ? "#83eef040" : "#ffffff12"}` }}>
            {s.state === "done"    && <CheckCircle2 size={14} className="text-[#83eef0]" />}
            {s.state === "active"  && <Loader2 size={14} className="animate-spin text-[#83eef0]" />}
            {s.state === "waiting" && <div className="w-2 h-2 rounded-full bg-[#ffffff20]" />}
          </div>
          <span className="text-sm transition-colors" style={{ fontFamily: "'Inter',sans-serif", color: s.state === "done" ? "#83eef0" : s.state === "active" ? "#d4e9f3" : "#d4e9f344" }}>
            {s.label}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Election-type flags (anonymous / secret / weighted) ──────────────────────
function ElectionTypeFlags({ election }: { election: VocdoniElection }) {
  const flags: { label: string; icon: any; color: string; title: string }[] = [];
  const meta = election.meta ?? {};
  const isAnon   = meta.anonymous || meta?.electionType?.anonymous;
  const isSecret = meta.secretUntilTheEnd || meta?.electionType?.secretUntilTheEnd;
  const censusType = election.census?.censusType ?? "";
  const isWeighted = censusType.toLowerCase().includes("weighted");
  if (isAnon)    flags.push({ label: "Anonymous",     icon: Shield,     color: "#a78bfa", title: "Votes cannot be linked to voter identity" });
  if (isSecret)  flags.push({ label: "Secret results", icon: Eye,        color: "#f59e0b", title: "Results are hidden until the election ends" });
  if (isWeighted) flags.push({ label: "Weighted",      icon: BarChart,   color: "#83eef0", title: "Voting power is weighted by census data" });
  if (!flags.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {flags.map(f => (
        <span key={f.label} title={f.title} className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full cursor-help" style={{ color: f.color, background: `${f.color}10`, border: `1px solid ${f.color}25` }}>
          <f.icon size={8} /> {f.label}
        </span>
      ))}
    </div>
  );
}

// ─── DAO Stats bar ────────────────────────────────────────────────────────────
function DAOStats({ elections }: { elections: VocdoniElection[] }) {
  const stats = useMemo(() => ({
    total:   elections.length,
    active:  elections.filter(e => e.status?.toUpperCase() === "ONGOING").length,
    ended:   elections.filter(e => e.status?.toUpperCase() === "ENDED").length,
    votes:   elections.reduce((s, e) => s + (e.voteCount || 0), 0),
  }), [elections]);

  const items = [
    { label: "Proposals",    value: stats.total,  Icon: Hash,       color: "#83eef0" },
    { label: "Active",       value: stats.active, Icon: Activity,   color: "#4ade80" },
    { label: "Votes Cast",   value: stats.votes,  Icon: TrendingUp, color: "#a78bfa" },
    { label: "Completed",    value: stats.ended,  Icon: CheckCircle2, color: "#94a3b8" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {items.map(({ label, value, Icon, color }) => (
        <div key={label} className="flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ background: "rgba(0,8,12,0.6)", border: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(12px)" }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}15` }}>
            <Icon size={16} style={{ color }} />
          </div>
          <div>
            <div className="text-lg font-bold leading-none mb-0.5" style={{ fontFamily: "'Plus_Jakarta_Sans',sans-serif", color: "#d4e9f3" }}>{value.toLocaleString()}</div>
            <div className="text-[10px] font-medium" style={{ fontFamily: "'Inter',sans-serif", color: "#9aaeb8" }}>{label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Proposal card ────────────────────────────────────────────────────────────
function ProposalCard({
  election, onSelect, voted,
}: { election: VocdoniElection; onSelect: (e: VocdoniElection) => void; voted: boolean }) {
  const s      = statusStyle(election.status);
  const isActive = election.status?.toUpperCase() === "ONGOING";
  const title  = getText(election.title, "Untitled Proposal");
  const desc   = getText(election.description);
  const q0     = election.questions?.[0];
  const choices = q0?.choices ?? [];
  const results = election.results;
  const strategy = strategyFromMeta(election.meta);
  const sm     = STRATEGY_META[strategy] ?? STRATEGY_META.standard;
  const tot    = totalVotes(results);
  const topChoices = choices.slice(0, 3);

  return (
    <button
      data-testid={`card-proposal-${election.electionId}`}
      onClick={() => onSelect(election)}
      className="w-full text-left rounded-[20px] border overflow-hidden transition-all hover:scale-[1.01] hover:shadow-[0_0_24px_rgba(131,238,240,0.08)] active:scale-[0.99] group"
      style={{ background: "rgba(0,8,12,0.7)", borderColor: "rgba(255,255,255,0.07)", backdropFilter: "blur(16px)" }}
    >
      {/* Card header accent bar */}
      <div className="h-0.5 w-full" style={{ background: isActive ? "linear-gradient(90deg, #4ade80 0%, #83eef0 100%)" : `linear-gradient(90deg, ${s.color}60 0%, transparent 100%)` }} />

      <div className="p-5">
        {/* Top row */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <StatusPill status={election.status} />
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <StrategyBadge strategy={strategy} />
            {election.meta?.censusMode === "base-members" && (
              <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ color: "#6366f1", background: "#6366f110", border: "1px solid #6366f125" }}>
                <Shield size={8} /> Base
              </span>
            )}
          </div>
        </div>

        {/* Title */}
        <h3 className="font-bold text-[15px] leading-snug mb-1.5 line-clamp-2" style={{ fontFamily: "'Plus_Jakarta_Sans',sans-serif", color: "#d4e9f3" }}>
          {title}
        </h3>

        {/* Description */}
        {desc && (
          <p className="text-xs leading-relaxed line-clamp-2 mb-3" style={{ fontFamily: "'Inter',sans-serif", color: "#9aaeb8" }}>
            {desc}
          </p>
        )}

        {/* Vote bars */}
        {results && topChoices.length > 0 ? (
          <div className="flex flex-col gap-1.5 mb-4">
            {topChoices.map((c, ci) => {
              const p = pct(results, 0, ci);
              const isWinner = p === Math.max(...choices.slice(0, 3).map((_, i) => pct(results, 0, i)));
              return (
                <div key={ci}>
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="text-[10px] truncate max-w-[70%]" style={{ fontFamily: "'Inter',sans-serif", color: isWinner && election.status === "ENDED" ? "#d4e9f3" : "#9aaeb8" }}>{getText(c.title)}</span>
                    <span className="text-[10px] font-semibold ml-2 flex-shrink-0" style={{ color: isWinner && election.status === "ENDED" ? sm.color : "#9aaeb860" }}>{p}%</span>
                  </div>
                  <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${p}%`, background: isWinner && election.status === "ENDED" ? sm.color : `${sm.color}60` }} />
                  </div>
                </div>
              );
            })}
            {choices.length > 3 && (
              <span className="text-[10px]" style={{ color: "#9aaeb860", fontFamily: "'Inter',sans-serif" }}>+ {choices.length - 3} more options</span>
            )}
          </div>
        ) : choices.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {choices.slice(0, 4).map((c, ci) => (
              <span key={ci} className="text-[10px] px-2.5 py-1 rounded-full" style={{ fontFamily: "'Inter',sans-serif", color: "#9aaeb8", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                {getText(c.title)}
              </span>
            ))}
            {choices.length > 4 && <span className="text-[10px] px-2.5 py-1 rounded-full" style={{ fontFamily: "'Inter',sans-serif", color: "#9aaeb850", background: "rgba(255,255,255,0.03)" }}>+{choices.length - 4}</span>}
          </div>
        ) : null}

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 pt-3 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1" style={{ color: "#9aaeb8" }}>
              <Users size={10} />
              <span className="text-[10px]" style={{ fontFamily: "'Inter',sans-serif" }}>{tot.toLocaleString()} votes</span>
            </div>
            <div className="flex items-center gap-1" style={{ color: "#9aaeb860" }}>
              <Calendar size={10} />
              <span className="text-[10px]" style={{ fontFamily: "'Inter',sans-serif" }}>{isActive ? daysLeft(election.endDate) : fmtDateShort(election.endDate)}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {voted && (
              <span className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-full" style={{ color: "#83eef0", background: "#83eef012", border: "1px solid #83eef025", fontFamily: "'Inter',sans-serif" }}>
                <CheckCircle2 size={9} /> Voted
              </span>
            )}
            <span className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-full transition-colors group-hover:bg-[#83eef015]" style={{ color: "#83eef066", border: "1px solid rgba(131,238,240,0.1)", fontFamily: "'Inter',sans-serif" }}>
              <Eye size={9} /> View
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

// ─── Proposal detail overlay ──────────────────────────────────────────────────
function ProposalDetail({
  election, onClose, onVote, voted, refreshing,
}: { election: VocdoniElection; onClose: () => void; onVote: () => void; voted: boolean; refreshing?: boolean }) {
  const title    = getText(election.title, "Untitled Proposal");
  const desc     = getText(election.description);
  const q0       = election.questions?.[0];
  const choices  = q0?.choices ?? [];
  const results  = election.results;
  const strategy = strategyFromMeta(election.meta);
  const sm       = STRATEGY_META[strategy] ?? STRATEGY_META.standard;
  const isActive = election.status?.toUpperCase() === "ONGOING";
  const tot      = totalVotes(results);
  const maxPct   = results ? Math.max(...choices.map((_, ci) => pct(results, 0, ci))) : 0;

  const [iframeLoading, setIframeLoading] = useState(true);
  const [iframeError, setIframeError]     = useState(false);
  const vocdoniElectionUrl = `https://app.vocdoni.io/processes/show/#/${election.electionId}`;

  return (
    <div className="fixed inset-0 z-40 flex items-stretch justify-end" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: "rgba(0,4,8,0.7)", backdropFilter: "blur(4px)" }} />
      <div
        className="relative w-full md:w-[520px] h-full overflow-y-auto flex flex-col"
        style={{ background: "#00101a", borderLeft: "1px solid rgba(131,238,240,0.12)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Top bar */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(0,16,26,0.95)", backdropFilter: "blur(12px)" }}>
          <div className="flex items-center gap-2 flex-wrap">
            <StatusPill status={election.status} />
            <StrategyBadge strategy={strategy} />
            {refreshing && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: "#83eef008", border: "1px solid #83eef020", color: "#83eef066", fontFamily: "'Inter',sans-serif" }}>
                <Loader2 size={9} className="animate-spin" /> Fetching live data…
              </span>
            )}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-[#ffffff10]" style={{ color: "#9aaeb8" }}>
            <XCircle size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col gap-6 p-5 pb-24">

          {/* Title + meta */}
          <div className="flex flex-col gap-3">
            <h2 className="font-bold text-xl leading-snug" style={{ fontFamily: "'Plus_Jakarta_Sans',sans-serif", color: "#d4e9f3" }}>{title}</h2>
            {desc && (
              <p className="text-sm leading-relaxed" style={{ fontFamily: "'Inter',sans-serif", color: "#9aaeb8" }}>{desc}</p>
            )}
            <div className="flex flex-wrap gap-4 mt-1">
              <div className="flex items-center gap-1.5" style={{ color: "#9aaeb8" }}>
                <Calendar size={12} />
                <span className="text-xs" style={{ fontFamily: "'Inter',sans-serif" }}>Starts {fmtDate(election.startDate)}</span>
              </div>
              <div className="flex items-center gap-1.5" style={{ color: "#9aaeb8" }}>
                <Clock size={12} />
                <span className="text-xs" style={{ fontFamily: "'Inter',sans-serif" }}>Ends {fmtDate(election.endDate)}</span>
              </div>
              <div className="flex items-center gap-1.5" style={{ color: "#9aaeb8" }}>
                <Users size={12} />
                <span className="text-xs" style={{ fontFamily: "'Inter',sans-serif" }}>{tot.toLocaleString()} {tot === 1 ? "vote" : "votes"} cast</span>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px" style={{ background: "rgba(255,255,255,0.07)" }} />

          {/* Choices + results */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ fontFamily: "'Inter',sans-serif", color: "#9aaeb8" }}>
              {results ? "Results" : "Options"}
            </h3>
            {choices.length > 0 ? (
              <div className="flex flex-col gap-2">
                {choices.map((c, ci) => {
                  const p    = pct(results, 0, ci);
                  const cnt  = results ? parseInt(results[0]?.[ci] || "0") : 0;
                  const isTop = results && p === maxPct && maxPct > 0;
                  return (
                    <div key={ci} className="rounded-2xl p-3.5" style={{ background: isTop && election.status === "ENDED" ? `${sm.color}0a` : "rgba(255,255,255,0.03)", border: `1px solid ${isTop && election.status === "ENDED" ? `${sm.color}25` : "rgba(255,255,255,0.06)"}` }}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {isTop && election.status === "ENDED" && (
                            <CheckCircle2 size={13} style={{ color: sm.color, flexShrink: 0 }} />
                          )}
                          <span className="text-sm font-medium" style={{ fontFamily: "'Inter',sans-serif", color: isTop && election.status === "ENDED" ? "#d4e9f3" : "#9aaeb8" }}>
                            {getText(c.title)}
                          </span>
                        </div>
                        {results && (
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs" style={{ fontFamily: "'Inter',sans-serif", color: "#9aaeb860" }}>{cnt.toLocaleString()}</span>
                            <span className="text-sm font-bold min-w-[36px] text-right" style={{ fontFamily: "'Inter',sans-serif", color: isTop ? sm.color : "#9aaeb8" }}>{p}%</span>
                          </div>
                        )}
                      </div>
                      {results && (
                        <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${p}%`, background: isTop ? sm.color : `${sm.color}40` }} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm" style={{ color: "#9aaeb850", fontFamily: "'Inter',sans-serif" }}>No choices available.</p>
            )}
          </div>

          {/* Divider */}
          <div className="h-px" style={{ background: "rgba(255,255,255,0.07)" }} />

          {/* Info block */}
          <div className="flex flex-col gap-2 text-xs" style={{ fontFamily: "'Inter',sans-serif", color: "#9aaeb8" }}>
            <div className="flex items-center justify-between py-1.5 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
              <span className="font-medium">Election ID</span>
              <a href={`https://explorer.vote/processes/show/#/${election.electionId}`} target="_blank" rel="noopener noreferrer" title="View on Vocdoni Explorer" className="font-mono text-[10px] truncate max-w-[180px] no-underline hover:underline" style={{ color: "#83eef080" }}>{election.electionId.slice(0, 16)}…</a>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
              <span className="font-medium">Strategy</span>
              <StrategyBadge strategy={strategy} />
            </div>
            <div className="flex items-center justify-between py-1.5 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
              <span className="font-medium">Census type</span>
              <span style={{ color: "#9aaeb8" }}>
                {election.census?.censusType
                  ? election.census.censusType.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
                  : election.meta?.censusMode === "base-members" ? "Base Network" : "Open Wallet"}
              </span>
            </div>
            {election.census?.maxCensusSize != null && (
              <div className="flex items-center justify-between py-1.5 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                <span className="font-medium">Max voters</span>
                <span>{Number(election.census.maxCensusSize).toLocaleString()}</span>
              </div>
            )}
            <div className="pt-1">
              <ElectionTypeFlags election={election} />
            </div>
          </div>

          {/* Vocdoni App Embed */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ fontFamily: "'Inter',sans-serif", color: "#9aaeb8" }}>Vocdoni Voting Interface</h3>
              <a href={vocdoniElectionUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-[10px] font-medium no-underline transition-all hover:opacity-80"
                style={{ fontFamily: "'Inter',sans-serif", color: "#83eef070" }}>
                <ExternalLink size={9} /> Open in new tab
              </a>
            </div>

            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(131,238,240,0.15)" }}>
              {/* Mock browser bar */}
              <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ background: "rgba(0,6,12,0.9)", borderColor: "rgba(131,238,240,0.08)" }}>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.12)" }} />
                  <div className="w-2 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.12)" }} />
                  <div className="w-2 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.12)" }} />
                </div>
                <div className="flex-1 flex items-center gap-1.5 px-2 py-0.5 rounded-md" style={{ background: "rgba(255,255,255,0.05)" }}>
                  {!iframeError && <div className="w-1.5 h-1.5 rounded-full bg-[#4ade80] flex-shrink-0 animate-pulse" />}
                  <span className="text-[9px] truncate" style={{ fontFamily: "'Inter',sans-serif", color: "#9aaeb860" }}>
                    app.vocdoni.io/processes/show/#/{election.electionId.slice(0, 10)}…
                  </span>
                </div>
              </div>

              {/* Iframe container */}
              {iframeError ? (
                <div className="flex flex-col items-center gap-3 py-14 text-center px-6" style={{ background: "rgba(0,8,12,0.6)" }}>
                  <AlertCircle size={24} style={{ color: "#f8717160" }} />
                  <p className="text-xs leading-relaxed" style={{ fontFamily: "'Inter',sans-serif", color: "#9aaeb8" }}>
                    The Vocdoni app could not be embedded here.
                  </p>
                  <a href={vocdoniElectionUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold no-underline transition-all hover:opacity-80"
                    style={{ background: "#83eef020", border: "1px solid #83eef040", color: "#83eef0", fontFamily: "'Inter',sans-serif" }}>
                    <ExternalLink size={11} /> Open Vocdoni App
                  </a>
                </div>
              ) : (
                <div className="relative" style={{ minHeight: "560px" }}>
                  {iframeLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10" style={{ background: "rgba(0,8,12,0.8)" }}>
                      <Loader2 size={28} className="animate-spin" style={{ color: "#83eef0" }} />
                      <span className="text-xs" style={{ fontFamily: "'Inter',sans-serif", color: "#9aaeb8" }}>Loading Vocdoni app…</span>
                    </div>
                  )}
                  <iframe
                    key={election.electionId}
                    src={vocdoniElectionUrl}
                    title={`Vocdoni: ${title}`}
                    className="w-full block"
                    style={{ height: "560px", border: "none", display: "block", background: "#00101a" }}
                    loading="lazy"
                    sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-storage-access-by-user-activation"
                    onLoad={() => setIframeLoading(false)}
                    onError={() => { setIframeLoading(false); setIframeError(true); }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sticky bottom action */}
        {isActive && (
          <div className="sticky bottom-0 px-5 py-4 border-t" style={{ borderColor: "rgba(131,238,240,0.12)", background: "rgba(0,16,26,0.97)", backdropFilter: "blur(12px)" }}>
            {voted ? (
              <div className="flex items-center justify-center gap-2 py-3.5 rounded-2xl" style={{ background: "rgba(131,238,240,0.08)", border: "1px solid rgba(131,238,240,0.2)" }}>
                <CheckCircle2 size={16} className="text-[#83eef0]" />
                <span className="font-semibold text-sm" style={{ fontFamily: "'Inter',sans-serif", color: "#83eef0" }}>Vote Submitted</span>
              </div>
            ) : (
              <button
                onClick={onVote}
                data-testid={`button-vote-detail-${election.electionId}`}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-sm transition-all hover:opacity-90 active:scale-[0.98]"
                style={{ background: "linear-gradient(135deg, #83eef0 0%, #3fb0b3 100%)", color: "#004d50", fontFamily: "'Inter',sans-serif" }}
              >
                <Vote size={16} /> Cast Your Vote
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Vote modal ───────────────────────────────────────────────────────────────
type VotePhase = "checking" | "not-eligible" | "already-voted" | "form" | "processing" | "success" | "error";
type VoteSdkStep = "account" | "faucet" | "get-election" | "get-proof" | "get-signature" | "calc-zk" | "generate-tx" | "sign-tx" | "done";

function getVoteStepDefs(needsFaucet: boolean, isAnonymous: boolean): Array<{ key: VoteSdkStep; label: string }> {
  return [
    { key: "account",      label: "Creating Vocdoni account" },
    ...(needsFaucet ? [{ key: "faucet" as VoteSdkStep,       label: "Collecting voting tokens" }] : []),
    { key: "get-election", label: "Loading election" },
    ...(isAnonymous
      ? [{ key: "get-signature" as VoteSdkStep, label: "Signing anonymization proof" },
         { key: "calc-zk" as VoteSdkStep,        label: "Computing zero-knowledge proof" }]
      : [{ key: "get-proof" as VoteSdkStep,      label: "Verifying census membership" }]),
    { key: "generate-tx",  label: "Building vote transaction" },
    { key: "sign-tx",      label: "Signing transaction" },
    { key: "done",         label: "Recorded on Vocdoni chain" },
  ];
}

function VoteModal({
  election, onClose, onSuccess,
}: { election: VocdoniElection; onClose: () => void; onSuccess: () => void }) {
  const { wallets } = useWallets();
  const strategy = strategyFromMeta(election.meta);

  const [choices, setChoices]               = useState<Record<number, number>>({});
  const [approvalChoices, setApprovalChoices] = useState<Record<number, Set<number>>>({});
  const [credits, setCredits]               = useState<Record<number, Record<number, number>>>({});
  const TOTAL_CREDITS = 25;

  const [phase, setPhase]           = useState<VotePhase>("checking");
  const [errorMsg, setErrorMsg]     = useState("");
  const [currentSdkStep, setCurrentSdkStep] = useState<VoteSdkStep>("account");
  const [needsFaucet, setNeedsFaucet] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);

  const questions = election.questions ?? [];
  const usedCredits = (qi: number) => Object.values(credits[qi] || {}).reduce((s, c) => s + c * c, 0);
  const allAnswered = (() => {
    if (strategy === "standard")  return questions.every((_, qi) => choices[qi] !== undefined);
    if (strategy === "approval")  return questions.every((_, qi) => (approvalChoices[qi]?.size ?? 0) > 0);
    if (strategy === "quadratic") return questions.every((_, qi) => usedCredits(qi) > 0 && usedCredits(qi) <= TOTAL_CREDITS);
    return false;
  })();

  // ── Detect election anonymity from meta/census ─────────────────────────────
  useEffect(() => {
    const meta = election.meta ?? {};
    const censusType = election.census?.censusType ?? "";
    setIsAnonymous(!!(meta.anonymous || meta?.electionType?.anonymous || censusType.toLowerCase().includes("anon")));
  }, [election]);

  // ── Pre-flight: census eligibility + already-voted check ──────────────────
  useEffect(() => {
    let active = true;
    (async () => {
      const wallet = wallets[0];
      if (!wallet) { if (active) setPhase("form"); return; }
      try {
        const { VocdoniSDKClient, EnvOptions } = await import("@vocdoni/sdk");
        const eip1193 = await wallet.getEthereumProvider();
        const { ethers } = await import("ethers");
        const provider = new ethers.providers.Web3Provider(eip1193 as any);
        const signer   = provider.getSigner();
        const env = VOCDONI_ENV === "prod" ? EnvOptions.PROD : VOCDONI_ENV === "dev" ? EnvOptions.DEV : EnvOptions.STG;
        const client = new VocdoniSDKClient({ env, wallet: signer });

        // hasAlreadyVoted: returns a voteId string if voted, null if not
        try {
          const voteId = await client.hasAlreadyVoted({ electionId: election.electionId });
          if (!active) return;
          if (voteId) { setPhase("already-voted"); return; }
        } catch {
          // Not voted yet or anonymous election — continue
        }

        // isInCensus: returns boolean
        const inCensus = await client.isInCensus({ electionId: election.electionId });
        if (!active) return;
        if (!inCensus) { setPhase("not-eligible"); return; }

        if (active) setPhase("form");
      } catch {
        // On network error fall through to form — handleVote will surface real error
        if (active) setPhase("form");
      }
    })();
    return () => { active = false; };
  }, [election.electionId, wallets]);

  // ── Vote submission using submitVoteSteps() async generator ───────────────
  async function handleVote() {
    if (!allAnswered) return;
    const wallet = wallets[0];
    if (!wallet) { setErrorMsg("No wallet connected."); setPhase("error"); return; }

    setPhase("processing");
    setCurrentSdkStep("account");
    setNeedsFaucet(false);
    setErrorMsg("");

    try {
      const { VocdoniSDKClient, EnvOptions, Vote, VoteSteps } = await import("@vocdoni/sdk");
      const eip1193 = await wallet.getEthereumProvider();
      const { ethers } = await import("ethers");
      const provider = new ethers.providers.Web3Provider(eip1193 as any);
      const signer   = provider.getSigner();
      const env = VOCDONI_ENV === "prod" ? EnvOptions.PROD : VOCDONI_ENV === "dev" ? EnvOptions.DEV : EnvOptions.STG;

      const client = new VocdoniSDKClient({ env, wallet: signer });
      const accountInfo = await client.createAccount();

      if (accountInfo.balance === 0 && VOCDONI_ENV !== "prod") {
        setNeedsFaucet(true);
        setCurrentSdkStep("faucet");
        await client.collectFaucetTokens();
      }

      setCurrentSdkStep("get-election");
      client.setElectionId(election.electionId);

      let voteValues: number[];
      if (strategy === "approval") {
        const q0 = election.questions?.[0]?.choices ?? [];
        voteValues = q0.map((_, ci) => (approvalChoices[0]?.has(ci) ? 1 : 0));
      } else if (strategy === "quadratic") {
        const q0 = election.questions?.[0]?.choices ?? [];
        voteValues = q0.map((_, ci) => credits[0]?.[ci] ?? 0);
      } else {
        voteValues = questions.map((_, qi) => choices[qi]);
      }

      for await (const step of client.submitVoteSteps(new Vote(voteValues))) {
        switch (step.key) {
          case VoteSteps.GET_ELECTION:  setCurrentSdkStep("get-election"); break;
          case VoteSteps.GET_PROOF:     setCurrentSdkStep("get-proof"); break;
          case VoteSteps.GET_SIGNATURE: setCurrentSdkStep("get-signature"); break;
          case VoteSteps.CALC_ZK_PROOF: setCurrentSdkStep("calc-zk"); break;
          case VoteSteps.GENERATE_TX:   setCurrentSdkStep("generate-tx"); break;
          case VoteSteps.SIGN_TX:       setCurrentSdkStep("sign-tx"); break;
          case VoteSteps.DONE:          setCurrentSdkStep("done"); break;
        }
      }

      setPhase("success");
      setTimeout(() => { onSuccess(); onClose(); }, 2400);
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (msg.includes("already voted") || msg.includes("vote already"))
        setErrorMsg("You have already voted on this proposal.");
      else if (msg.includes("census") || msg.includes("not in census"))
        setErrorMsg("Your wallet is not in the voting census for this proposal.");
      else
        setErrorMsg(msg.length < 200 ? msg : "Vote submission failed. Please try again.");
      setPhase("error");
    }
  }

  // ── Derive step states for StepStepper ────────────────────────────────────
  function stepState(key: VoteSdkStep): "waiting" | "active" | "done" | "skip" {
    const defs = getVoteStepDefs(needsFaucet, isAnonymous);
    const order = defs.map(s => s.key);
    if (!order.includes(key)) return "skip";
    const curIdx = order.indexOf(currentSdkStep);
    const idx    = order.indexOf(key);
    if (currentSdkStep === "done") return "done";
    return idx < curIdx ? "done" : idx === curIdx ? "active" : "waiting";
  }

  const isBlocking = phase === "processing" || phase === "checking";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:px-4 sm:py-6 overflow-y-auto" onClick={isBlocking ? undefined : onClose}>
      <div className="absolute inset-0" style={{ background: "rgba(0,8,12,0.88)" }} />
      <div className="relative w-full sm:max-w-md rounded-t-[28px] sm:rounded-[28px] border-t sm:border border-[#83eef030] p-5 sm:p-6 flex flex-col gap-5 max-h-[90vh] overflow-y-auto"
        style={{ background: "#00131a", backdropFilter: "blur(20px)" }}
        onClick={e => e.stopPropagation()}>
        <div className="sm:hidden w-10 h-1 rounded-full bg-[#ffffff20] mx-auto -mt-1 mb-1" />

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <StrategyBadge strategy={strategy} />
              <ElectionTypeFlags election={election} />
            </div>
            <h2 className="font-bold text-[17px] leading-snug" style={{ fontFamily: "'Plus_Jakarta_Sans',sans-serif", color: "#d4e9f3" }}>
              {getText(election.title, "Untitled Proposal")}
            </h2>
          </div>
          <button onClick={onClose} disabled={isBlocking} className="text-[#d4e9f344] hover:text-[#d4e9f3] transition-colors flex-shrink-0 mt-0.5 disabled:opacity-30">
            <XCircle size={20} />
          </button>
        </div>

        {/* ── Checking eligibility ── */}
        {phase === "checking" && (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <Loader2 size={32} className="animate-spin" style={{ color: "#83eef0" }} />
            <div>
              <p className="font-semibold text-sm" style={{ fontFamily: "'Plus_Jakarta_Sans',sans-serif", color: "#d4e9f3" }}>Verifying eligibility…</p>
              <p className="text-xs mt-1" style={{ fontFamily: "'Inter',sans-serif", color: "#9aaeb8" }}>Checking census membership and vote history</p>
            </div>
          </div>
        )}

        {/* ── Not in census ── */}
        {phase === "not-eligible" && (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "#f8717115", border: "1px solid #f8717130" }}>
              <XCircle size={26} style={{ color: "#f87171" }} />
            </div>
            <div>
              <p className="font-bold text-base" style={{ fontFamily: "'Plus_Jakarta_Sans',sans-serif", color: "#d4e9f3" }}>Not eligible to vote</p>
              <p className="text-xs mt-1.5 max-w-xs" style={{ fontFamily: "'Inter',sans-serif", color: "#9aaeb8" }}>
                Your connected wallet is not in the census for this proposal. Voting eligibility is determined at the time the election was created.
              </p>
            </div>
            <a href={`https://explorer.vote/processes/show/#/${election.electionId}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-semibold no-underline" style={{ color: "#83eef0", fontFamily: "'Inter',sans-serif" }}>
              <ExternalLink size={11} /> View election on Vocdoni
            </a>
          </div>
        )}

        {/* ── Already voted ── */}
        {phase === "already-voted" && (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "#83eef018", border: "1px solid #83eef040" }}>
              <CheckCircle2 size={26} className="text-[#83eef0]" />
            </div>
            <div>
              <p className="font-bold text-base" style={{ fontFamily: "'Plus_Jakarta_Sans',sans-serif", color: "#d4e9f3" }}>Already voted</p>
              <p className="text-xs mt-1.5 max-w-xs" style={{ fontFamily: "'Inter',sans-serif", color: "#9aaeb8" }}>
                Your vote has already been recorded on-chain for this proposal.
              </p>
            </div>
            <a href={`https://explorer.vote/processes/show/#/${election.electionId}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-semibold no-underline" style={{ color: "#83eef0", fontFamily: "'Inter',sans-serif" }}>
              <ExternalLink size={11} /> View on Vocdoni Explorer
            </a>
          </div>
        )}

        {/* ── Processing (SDK steps) ── */}
        {phase === "processing" && (
          <StepStepper steps={getVoteStepDefs(needsFaucet, isAnonymous).map(s => ({
            label: s.label,
            state: stepState(s.key),
          }))} />
        )}

        {/* ── Success ── */}
        {phase === "success" && (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "#83eef018", border: "1px solid #83eef040" }}>
              <CheckCircle2 size={30} className="text-[#83eef0]" />
            </div>
            <p className="font-bold text-lg" style={{ fontFamily: "'Plus_Jakarta_Sans',sans-serif", color: "#d4e9f3" }}>Vote submitted!</p>
            <p className="text-sm max-w-xs" style={{ fontFamily: "'Inter',sans-serif", color: "#9aaeb8" }}>
              Your vote is recorded on-chain and will be counted when the election ends.
            </p>
            <a href={`https://explorer.vote/processes/show/#/${election.electionId}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-semibold no-underline" style={{ color: "#83eef0", fontFamily: "'Inter',sans-serif" }}>
              <ExternalLink size={11} /> View on Vocdoni Explorer
            </a>
          </div>
        )}

        {/* ── Vote form ── */}
        {(phase === "form" || phase === "error") && (
          <>
            {strategy === "standard" && questions.map((q, qi) => (
              <div key={qi} className="flex flex-col gap-2">
                <p className="font-semibold text-sm" style={{ fontFamily: "'Plus_Jakarta_Sans',sans-serif", color: "#d4e9f3" }}>{getText(q.title, `Question ${qi + 1}`)}</p>
                <div className="flex flex-col gap-1.5">
                  {q.choices.map((c, ci) => {
                    const selected = choices[qi] === c.value;
                    return (
                      <button key={ci} data-testid={`button-choice-q${qi}-c${ci}`}
                        onClick={() => setChoices(prev => ({ ...prev, [qi]: c.value }))}
                        className="flex items-center gap-3 px-4 py-3 rounded-2xl border text-left transition-all"
                        style={{ background: selected ? "#83eef018" : "#ffffff06", borderColor: selected ? "#83eef050" : "#ffffff0d", color: selected ? "#83eef0" : "#d4e9f3cc" }}>
                        <div className="w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center" style={{ borderColor: selected ? "#83eef0" : "#ffffff25" }}>
                          {selected && <div className="w-2 h-2 rounded-full bg-[#83eef0]" />}
                        </div>
                        <span className="text-sm" style={{ fontFamily: "'Inter',sans-serif" }}>{getText(c.title)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {strategy === "approval" && questions.map((q, qi) => (
              <div key={qi} className="flex flex-col gap-2">
                <p className="font-semibold text-sm" style={{ fontFamily: "'Plus_Jakarta_Sans',sans-serif", color: "#d4e9f3" }}>{getText(q.title, `Question ${qi + 1}`)}</p>
                <p className="text-xs" style={{ fontFamily: "'Inter',sans-serif", color: "#9aaeb8" }}>Select all options you approve of.</p>
                <div className="flex flex-col gap-1.5">
                  {q.choices.map((c, ci) => {
                    const checked = approvalChoices[qi]?.has(ci) ?? false;
                    return (
                      <button key={ci} data-testid={`button-approval-q${qi}-c${ci}`}
                        onClick={() => setApprovalChoices(prev => { const s = new Set(prev[qi] ?? []); if (s.has(ci)) s.delete(ci); else s.add(ci); return { ...prev, [qi]: s }; })}
                        className="flex items-center gap-3 px-4 py-3 rounded-2xl border text-left transition-all"
                        style={{ background: checked ? "#a78bfa18" : "#ffffff06", borderColor: checked ? "#a78bfa50" : "#ffffff0d", color: checked ? "#a78bfa" : "#d4e9f3cc" }}>
                        <div className="w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center" style={{ borderColor: checked ? "#a78bfa" : "#ffffff25" }}>
                          {checked && <CheckCircle2 size={10} style={{ color: "#a78bfa" }} />}
                        </div>
                        <span className="text-sm" style={{ fontFamily: "'Inter',sans-serif" }}>{getText(c.title)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {strategy === "quadratic" && questions.map((q, qi) => {
              const used = usedCredits(qi);
              return (
                <div key={qi} className="flex flex-col gap-2">
                  <p className="font-semibold text-sm" style={{ fontFamily: "'Plus_Jakarta_Sans',sans-serif", color: "#d4e9f3" }}>{getText(q.title, `Question ${qi + 1}`)}</p>
                  <div className="flex items-center justify-between px-1">
                    <p className="text-xs" style={{ fontFamily: "'Inter',sans-serif", color: "#9aaeb8" }}>Distribute credits (cost = credits²)</p>
                    <span className="text-xs font-semibold" style={{ fontFamily: "'Inter',sans-serif", color: used > TOTAL_CREDITS ? "#f87171" : "#f59e0b" }}>{used}/{TOTAL_CREDITS}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "#ffffff0a" }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, (used / TOTAL_CREDITS) * 100)}%`, background: used > TOTAL_CREDITS ? "#f87171" : "linear-gradient(90deg, #f59e0b 0%, #f97316 100%)" }} />
                  </div>
                  <div className="flex flex-col gap-2">
                    {q.choices.map((c, ci) => {
                      const val = credits[qi]?.[ci] ?? 0;
                      return (
                        <div key={ci} className="flex items-center gap-3 px-4 py-3 rounded-2xl border" style={{ background: val > 0 ? "#f59e0b10" : "#ffffff06", borderColor: val > 0 ? "#f59e0b30" : "#ffffff0d" }}>
                          <span className="text-sm flex-1" style={{ fontFamily: "'Inter',sans-serif", color: "#d4e9f3cc" }}>{getText(c.title)}</span>
                          <div className="flex items-center gap-2">
                            <button data-testid={`button-qv-minus-q${qi}-c${ci}`}
                              onClick={() => setCredits(prev => ({ ...prev, [qi]: { ...(prev[qi] || {}), [ci]: Math.max(0, (prev[qi]?.[ci] ?? 0) - 1) } }))}
                              className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "#ffffff10", color: "#d4e9f3", fontFamily: "'Inter',sans-serif" }}>-</button>
                            <span className="w-6 text-center text-sm font-bold" style={{ fontFamily: "'Inter',sans-serif", color: "#f59e0b" }}>{val}</span>
                            <button data-testid={`button-qv-plus-q${qi}-c${ci}`}
                              onClick={() => {
                                const nv = (credits[qi]?.[ci] ?? 0) + 1;
                                const oc = Object.entries(credits[qi] || {}).reduce((s, [k, v]) => parseInt(k) === ci ? s : s + (v as number) * (v as number), 0);
                                if (oc + nv * nv <= TOTAL_CREDITS) setCredits(prev => ({ ...prev, [qi]: { ...(prev[qi] || {}), [ci]: nv } }));
                              }}
                              className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "#ffffff10", color: "#d4e9f3", fontFamily: "'Inter',sans-serif" }}>+</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {phase === "error" && (
              <div className="flex items-start gap-2 p-3 rounded-xl text-xs" style={{ background: "#f8717115", border: "1px solid #f8717130", color: "#fca5a5", fontFamily: "'Inter',sans-serif" }}>
                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" /> {errorMsg}
              </div>
            )}

            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-[11px]" style={{ background: "#ffffff06", border: "1px solid #ffffff0c", color: "#d4e9f355", fontFamily: "'Inter',sans-serif" }}>
              <Info size={12} className="flex-shrink-0 mt-0.5" />
              {strategy === "quadratic" ? `Quadratic: cost = credits². You have ${TOTAL_CREDITS} credits.`
                : strategy === "approval" ? "Approval: approve as many options as you like."
                : "Standard: pick exactly one option per question."}
            </div>

            <button onClick={handleVote} disabled={!allAnswered} data-testid="button-submit-vote"
              className="flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-sm transition-all disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, #83eef0 0%, #3fb0b3 100%)", color: "#004d50", fontFamily: "'Inter',sans-serif" }}>
              <Vote size={15} /> Cast Vote
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Create proposal modal ────────────────────────────────────────────────────
function CreateModal({
  onClose, orgAddress, onCreated,
}: { onClose: () => void; orgAddress: string; onCreated: () => void }) {
  const { wallets } = useWallets();
  const [title, setTitle]       = useState("");
  const [description, setDescription] = useState("");
  const [options, setOptions]   = useState(["Yes", "No", "Abstain"]);

  const defaultStart = () => { const d = new Date(); d.setMinutes(d.getMinutes() + 15); return d.toISOString().slice(0, 16); };
  const defaultEnd   = () => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().slice(0, 16); };
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate,   setEndDate]   = useState(defaultEnd);
  const [strategy, setStrategy]   = useState<VotingStrategy>("standard");
  const [censusMode, setCensusMode] = useState<CensusMode>("open");

  type CreatePhase = "form" | "processing" | "success" | "error";
  type CreateSubStep = "account" | "faucet" | "election";
  const [phase, setPhase]         = useState<CreatePhase>("form");
  const [subStep, setSubStep]     = useState<CreateSubStep>("account");
  const [needsFaucet, setNeedsFaucet] = useState(false);
  const [errorMsg, setErrorMsg]   = useState("");
  const [createdId, setCreatedId] = useState("");

  const [ghOwner, setGhOwner]     = useState(DEFAULT_GH_OWNER);
  const [ghRepo,  setGhRepo]      = useState(DEFAULT_GH_REPO);
  const [ghItems, setGhItems]     = useState<GithubItem[]>([]);
  const [ghLoading, setGhLoading] = useState(false);
  const [ghError, setGhError]     = useState("");
  const [ghOpen, setGhOpen]       = useState(false);
  const [ghSelected, setGhSelected] = useState<Set<number>>(new Set());
  const [ghFilter, setGhFilter]   = useState<"all" | "issue" | "pr">("all");

  function setOption(i: number, val: string) { setOptions(prev => prev.map((o, idx) => idx === i ? val : o)); }
  function addOption()             { if (options.length < 10) setOptions(prev => [...prev, ""]); }
  function removeOption(i: number) { if (options.length > 2) setOptions(prev => prev.filter((_, idx) => idx !== i)); }

  async function loadGithub() {
    setGhLoading(true); setGhError(""); setGhItems([]);
    try {
      const r = await fetch(`/api/github/issues?owner=${encodeURIComponent(ghOwner)}&repo=${encodeURIComponent(ghRepo)}&type=all`);
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Failed to load");
      setGhItems(data.items || []);
    } catch (err: any) { setGhError(err.message || "Failed to load GitHub items"); }
    finally { setGhLoading(false); }
  }

  function importSelected() {
    const toAdd = ghItems.filter((_, i) => ghSelected.has(i)).map(item =>
      `${item.type === "pr" ? "Merge PR" : "Resolve"} #${item.number}: ${item.title}`
    );
    setOptions(prev => {
      const existing = prev.filter(o => o.trim());
      const combined = [...existing, ...toAdd].slice(0, 10);
      return combined.length < 2 ? [...combined, ""] : combined;
    });
    setGhOpen(false); setGhSelected(new Set());
  }

  async function handleCreate() {
    if (!title.trim() || options.filter(o => o.trim()).length < 2) return;
    const wallet = wallets[0];
    if (!wallet) { setErrorMsg("No wallet connected."); setPhase("error"); return; }

    setPhase("processing"); setSubStep("account"); setNeedsFaucet(false); setErrorMsg("");

    try {
      const { VocdoniSDKClient, EnvOptions, Election, ApprovalElection, PlainCensus } = await import("@vocdoni/sdk");
      const eip1193 = await wallet.getEthereumProvider();
      const { ethers } = await import("ethers");
      const provider = new ethers.providers.Web3Provider(eip1193 as any);
      const signer   = provider.getSigner();
      const myAddress = await signer.getAddress();
      const env = VOCDONI_ENV === "prod" ? EnvOptions.PROD : VOCDONI_ENV === "dev" ? EnvOptions.DEV : EnvOptions.STG;

      const client = new VocdoniSDKClient({ env, wallet: signer });
      const accountInfo = await client.createAccount();

      if (accountInfo.balance === 0 && VOCDONI_ENV !== "prod") {
        setNeedsFaucet(true); setSubStep("faucet");
        await client.collectFaucetTokens();
      }

      setSubStep("election");
      const census = new PlainCensus();
      census.add(myAddress);

      const cleanOptions = options.filter(o => o.trim()).map((o, idx) => ({ title: o.trim(), value: idx }));
      const voteTypeMeta = {
        standard:  { uniqueChoices: true },
        approval:  { uniqueChoices: false, maxValue: 1, maxCount: cleanOptions.length },
        quadratic: { costExponent: 2, maxValue: 5, maxCount: cleanOptions.length },
      }[strategy];

      const electionParams = {
        title: title.trim(), description: description.trim(),
        startDate: new Date(startDate), endDate: new Date(endDate),
        census, electionType: { interruptible: true, dynamicCensus: true },
        voteType: voteTypeMeta, meta: { votingStrategy: strategy, censusMode },
      } as any;

      let electionObj: any = strategy === "approval" ? ApprovalElection.from(electionParams) : Election.from(electionParams);
      electionObj.addQuestion(title.trim(), description.trim(), cleanOptions);

      const electionId = await client.createElection(electionObj);
      setCreatedId(electionId || "");
      setPhase("success");
      setTimeout(() => { onCreated(); onClose(); }, 3500);
    } catch (err: any) {
      setErrorMsg(err?.message?.slice(0, 240) || "Failed to create proposal.");
      setPhase("error");
    }
  }

  const createStepStates = (s: CreateSubStep): "waiting" | "active" | "done" => {
    const order: CreateSubStep[] = needsFaucet ? ["account", "faucet", "election"] : ["account", "election"];
    const cur = order.indexOf(subStep); const idx = order.indexOf(s);
    return idx < cur ? "done" : idx === cur ? "active" : "waiting";
  };

  const now15 = new Date(); now15.setMinutes(now15.getMinutes() + 15);
  const filteredGhItems = ghFilter === "all" ? ghItems : ghItems.filter(i => i.type === ghFilter);
  const STRATEGIES: { key: VotingStrategy; label: string; desc: string; Icon: any; color: string }[] = [
    { key: "standard",  label: "Standard",  desc: "One choice per voter",           Icon: Vote,        color: "#83eef0" },
    { key: "approval",  label: "Approval",  desc: "Approve multiple options",        Icon: CheckSquare, color: "#a78bfa" },
    { key: "quadratic", label: "Quadratic", desc: "Distribute credits (cost = c²)", Icon: BarChart,    color: "#f59e0b" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:px-4 sm:py-8 overflow-y-auto" onClick={phase === "processing" ? undefined : onClose}>
      <div className="absolute inset-0" style={{ background: "rgba(0,8,12,0.88)" }} />
      <div className="relative w-full sm:max-w-lg rounded-t-[28px] sm:rounded-[28px] border-t sm:border border-[#83eef030] p-5 sm:p-6 flex flex-col gap-5 max-h-[92vh] overflow-y-auto"
        style={{ background: "#00131a" }} onClick={e => e.stopPropagation()}>
        <div className="sm:hidden w-10 h-1 rounded-full bg-[#ffffff20] mx-auto -mt-1 mb-1" />

        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg" style={{ fontFamily: "'Plus_Jakarta_Sans',sans-serif", color: "#d4e9f3" }}>New Proposal</h2>
          <button onClick={onClose} disabled={phase === "processing"} className="text-[#d4e9f344] hover:text-[#d4e9f3] transition-colors disabled:opacity-30"><XCircle size={20} /></button>
        </div>

        {phase === "processing" && (
          <div className="py-2">
            <p className="text-xs mb-4" style={{ fontFamily: "'Inter',sans-serif", color: "#9aaeb8" }}>Publishing on-chain. This may take a moment.</p>
            <StepStepper steps={[
              { label: "Setting up voting account",          state: createStepStates("account") },
              { label: "Collecting voting tokens",            state: needsFaucet ? createStepStates("faucet") : "skip" },
              { label: "Publishing election to Vocdoni chain", state: createStepStates("election") },
            ]} />
          </div>
        )}

        {phase === "success" && (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "#83eef018", border: "1px solid #83eef040" }}>
              <CheckCircle2 size={30} className="text-[#83eef0]" />
            </div>
            <p className="font-bold text-lg" style={{ fontFamily: "'Plus_Jakarta_Sans',sans-serif", color: "#d4e9f3" }}>Proposal created!</p>
            <p className="text-sm max-w-xs" style={{ fontFamily: "'Inter',sans-serif", color: "#9aaeb8" }}>Your election has been published to the Vocdoni chain. It will appear in the list shortly.</p>
            {createdId && (
              <a href={`https://app.vocdoni.io/processes/show/#/${createdId}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs font-semibold no-underline" style={{ color: "#83eef0", fontFamily: "'Inter',sans-serif" }}>
                <ExternalLink size={11} /> View on Vocdoni Explorer
              </a>
            )}
          </div>
        )}

        {(phase === "form" || phase === "error") && (
          <>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold" style={{ fontFamily: "'Inter',sans-serif", color: "#d4e9f380" }}>Voting Strategy</label>
              <div className="grid grid-cols-3 gap-2">
                {STRATEGIES.map(s => {
                  const active = strategy === s.key;
                  return (
                    <button key={s.key} data-testid={`button-strategy-${s.key}`} onClick={() => setStrategy(s.key)}
                      className="flex flex-col items-center gap-1.5 px-2 py-3 rounded-2xl border transition-all"
                      style={{ background: active ? `${s.color}12` : "#ffffff06", borderColor: active ? `${s.color}50` : "#ffffff10" }}>
                      <s.Icon size={16} style={{ color: active ? s.color : "#d4e9f344" }} />
                      <span className="text-xs font-semibold" style={{ fontFamily: "'Inter',sans-serif", color: active ? s.color : "#d4e9f380" }}>{s.label}</span>
                      <span className="text-[9px] text-center leading-tight" style={{ fontFamily: "'Inter',sans-serif", color: active ? `${s.color}aa` : "#d4e9f333" }}>{s.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold" style={{ fontFamily: "'Inter',sans-serif", color: "#d4e9f380" }}>Census (who can vote)</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: "open" as CensusMode, label: "Open Wallet", desc: "Any EVM wallet", color: "#83eef0" },
                  { key: "base-members" as CensusMode, label: "Base Network", desc: "DAO members on Base", color: "#6366f1" },
                ].map(c => {
                  const active = censusMode === c.key;
                  return (
                    <button key={c.key} data-testid={`button-census-${c.key}`} onClick={() => setCensusMode(c.key)}
                      className="flex flex-col items-start gap-1 px-4 py-3 rounded-2xl border transition-all text-left"
                      style={{ background: active ? `${c.color}12` : "#ffffff06", borderColor: active ? `${c.color}50` : "#ffffff10" }}>
                      <span className="text-xs font-semibold" style={{ fontFamily: "'Inter',sans-serif", color: active ? c.color : "#d4e9f380" }}>{c.label}</span>
                      <span className="text-[10px]" style={{ fontFamily: "'Inter',sans-serif", color: active ? `${c.color}99` : "#d4e9f333" }}>{c.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold" style={{ fontFamily: "'Inter',sans-serif", color: "#d4e9f380" }}>Title</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Proposal title…"
                data-testid="input-proposal-title" maxLength={200}
                className="px-4 py-2.5 rounded-xl text-sm placeholder-[#d4e9f333] outline-none"
                style={{ fontFamily: "'Inter',sans-serif", color: "#d4e9f3", background: "#ffffff08", border: "1px solid #ffffff12" }} />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold" style={{ fontFamily: "'Inter',sans-serif", color: "#d4e9f380" }}>Description</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe the proposal…"
                data-testid="input-proposal-description" rows={3} maxLength={2000}
                className="px-4 py-2.5 rounded-xl text-sm placeholder-[#d4e9f333] outline-none resize-none"
                style={{ fontFamily: "'Inter',sans-serif", color: "#d4e9f3", background: "#ffffff08", border: "1px solid #ffffff12" }} />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold" style={{ fontFamily: "'Inter',sans-serif", color: "#d4e9f380" }}>Voting Options</label>
                <button data-testid="button-import-github"
                  onClick={() => { setGhOpen(!ghOpen); if (!ghOpen && ghItems.length === 0) loadGithub(); }}
                  className="flex items-center gap-1.5 text-[10px] font-semibold px-3 py-1.5 rounded-full transition-all"
                  style={{ fontFamily: "'Inter',sans-serif", color: "#d4e9f380", background: "#ffffff08", border: "1px solid #ffffff12" }}>
                  <Github size={11} /> Import from GitHub
                </button>
              </div>

              {ghOpen && (
                <div className="rounded-2xl border overflow-hidden" style={{ background: "#ffffff06", borderColor: "#ffffff10" }}>
                  <div className="flex items-center gap-2 p-3 border-b" style={{ borderColor: "#ffffff08" }}>
                    <input value={ghOwner} onChange={e => setGhOwner(e.target.value)} placeholder="owner" className="flex-1 px-2 py-1 rounded-lg text-xs outline-none" style={{ fontFamily: "'Inter',sans-serif", background: "#ffffff08", border: "1px solid #ffffff10", color: "#d4e9f3" }} />
                    <span style={{ color: "#d4e9f344" }}>/</span>
                    <input value={ghRepo} onChange={e => setGhRepo(e.target.value)} placeholder="repo" className="flex-1 px-2 py-1 rounded-lg text-xs outline-none" style={{ fontFamily: "'Inter',sans-serif", background: "#ffffff08", border: "1px solid #ffffff10", color: "#d4e9f3" }} />
                    <button onClick={loadGithub} className="px-2.5 py-1 rounded-lg text-[10px] font-semibold" style={{ fontFamily: "'Inter',sans-serif", background: "#83eef015", color: "#83eef0", border: "1px solid #83eef030" }}>Load</button>
                  </div>
                  {ghLoading && <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin text-[#83eef0]" /></div>}
                  {ghError   && <p className="p-3 text-xs" style={{ fontFamily: "'Inter',sans-serif", color: "#f87171" }}>{ghError}</p>}
                  {ghItems.length > 0 && (
                    <>
                      <div className="flex gap-1 p-2 border-b" style={{ borderColor: "#ffffff08" }}>
                        {(["all", "issue", "pr"] as const).map(f => (
                          <button key={f} onClick={() => setGhFilter(f)} className="px-2 py-1 rounded-lg text-[10px] font-semibold transition-all" style={{ fontFamily: "'Inter',sans-serif", background: ghFilter === f ? "#ffffff12" : "transparent", color: ghFilter === f ? "#d4e9f3" : "#d4e9f344" }}>{f.toUpperCase()}</button>
                        ))}
                      </div>
                      <div className="max-h-44 overflow-y-auto">
                        {filteredGhItems.map((item, i) => (
                          <button key={i} onClick={() => setGhSelected(prev => { const s = new Set(prev); if (s.has(i)) s.delete(i); else s.add(i); return s; })}
                            className="w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-[#ffffff06] transition-colors"
                            style={{ borderTop: i > 0 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                            <div className="w-3.5 h-3.5 rounded border mt-0.5 flex-shrink-0 flex items-center justify-center" style={{ borderColor: ghSelected.has(i) ? "#83eef0" : "#ffffff25", background: ghSelected.has(i) ? "#83eef020" : "transparent" }}>
                              {ghSelected.has(i) && <CheckCircle2 size={8} style={{ color: "#83eef0" }} />}
                            </div>
                            <div>
                              <span className="text-[10px] px-1.5 py-0.5 rounded mr-1.5 font-semibold" style={{ fontFamily: "'Inter',sans-serif", background: item.type === "pr" ? "#a78bfa15" : "#83eef015", color: item.type === "pr" ? "#a78bfa" : "#83eef0" }}>{item.type.toUpperCase()}</span>
                              <span className="text-xs" style={{ fontFamily: "'Inter',sans-serif", color: "#d4e9f3cc" }}>#{item.number} {item.title}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                      {ghSelected.size > 0 && (
                        <div className="p-2 border-t" style={{ borderColor: "#ffffff08" }}>
                          <button onClick={importSelected} className="w-full py-2 rounded-xl text-xs font-semibold" style={{ fontFamily: "'Inter',sans-serif", background: "#83eef015", color: "#83eef0", border: "1px solid #83eef030" }}>
                            Import {ghSelected.size} selected as options
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                {options.map((o, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input value={o} onChange={e => setOption(i, e.target.value)} placeholder={`Option ${i + 1}`} data-testid={`input-option-${i}`} maxLength={200}
                      className="flex-1 px-3.5 py-2.5 rounded-xl text-sm placeholder-[#d4e9f333] outline-none"
                      style={{ fontFamily: "'Inter',sans-serif", color: "#d4e9f3", background: "#ffffff08", border: "1px solid #ffffff12" }} />
                    {options.length > 2 && (
                      <button onClick={() => removeOption(i)} data-testid={`button-remove-option-${i}`} className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors hover:bg-[#f8717120]" style={{ color: "#f8717166" }}>
                        <XCircle size={14} />
                      </button>
                    )}
                  </div>
                ))}
                {options.length < 10 && (
                  <button onClick={addOption} data-testid="button-add-option" className="flex items-center gap-1.5 py-2 text-xs font-semibold transition-colors" style={{ fontFamily: "'Inter',sans-serif", color: "#83eef066" }}>
                    <Plus size={12} /> Add option
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold" style={{ fontFamily: "'Inter',sans-serif", color: "#d4e9f380" }}>Start</label>
                <input type="datetime-local" value={startDate} min={now15.toISOString().slice(0, 16)} onChange={e => setStartDate(e.target.value)} data-testid="input-start-date"
                  className="px-3 py-2.5 rounded-xl text-xs outline-none" style={{ fontFamily: "'Inter',sans-serif", background: "#ffffff08", border: "1px solid #ffffff12", color: "#d4e9f3", colorScheme: "dark" }} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold" style={{ fontFamily: "'Inter',sans-serif", color: "#d4e9f380" }}>End</label>
                <input type="datetime-local" value={endDate} min={startDate || now15.toISOString().slice(0, 16)} onChange={e => setEndDate(e.target.value)} data-testid="input-end-date"
                  className="px-3 py-2.5 rounded-xl text-xs outline-none" style={{ fontFamily: "'Inter',sans-serif", background: "#ffffff08", border: "1px solid #ffffff12", color: "#d4e9f3", colorScheme: "dark" }} />
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 rounded-xl text-[11px]" style={{ background: "#83eef008", border: "1px solid #83eef015", color: "#83eef099", fontFamily: "'Inter',sans-serif" }}>
              <Info size={12} className="flex-shrink-0 mt-0.5" />
              <span>
                {strategy === "quadratic" ? "Quadratic: cost = credits². 25 credits per voter."
                  : strategy === "approval" ? "Approval: voters approve as many options as they like."
                  : "Standard: each voter picks one option."}
                {censusMode === "base-members" && " Census uses Base network wallets."}
              </span>
            </div>

            {phase === "error" && (
              <div className="flex items-start gap-2 p-3 rounded-xl text-xs" style={{ background: "#f8717115", border: "1px solid #f8717130", color: "#fca5a5", fontFamily: "'Inter',sans-serif" }}>
                <AlertCircle size={13} className="flex-shrink-0 mt-0.5" /> {errorMsg}
              </div>
            )}

            <button onClick={handleCreate} disabled={!title.trim() || options.filter(o => o.trim()).length < 2} data-testid="button-create-proposal"
              className="flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-sm transition-all disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, #83eef0 0%, #3fb0b3 100%)", color: "#004d50", fontFamily: "'Inter',sans-serif" }}>
              <Zap size={15} /> Create Proposal
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── How Voting Works panel ───────────────────────────────────────────────────
function HowVotingWorks() {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border overflow-hidden" style={{ background: "rgba(0,8,12,0.5)", borderColor: "rgba(131,238,240,0.08)" }}>
      <button onClick={() => setOpen(o => !o)} data-testid="button-how-voting-works"
        className="w-full flex items-center gap-2.5 px-4 py-3 text-left hover:bg-[#83eef006] transition-colors">
        <Info size={14} style={{ color: "#83eef060", flexShrink: 0 }} />
        <span className="flex-1 text-xs font-medium" style={{ fontFamily: "'Inter',sans-serif", color: "#d4e9f366" }}>How voting works on MesoReef DAO</span>
        <ChevronDown size={13} style={{ color: "#d4e9f330", transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
      </button>
      {open && (
        <div className="px-4 pb-4 flex flex-col gap-3">
          <div className="h-px" style={{ background: "#83eef010" }} />
          <p className="text-[11px] leading-relaxed" style={{ fontFamily: "'Inter',sans-serif", color: "#d4e9f350" }}>
            MesoReef DAO votes are recorded on-chain via{" "}
            <a href="https://vocdoni.io" target="_blank" rel="noopener noreferrer" className="font-semibold no-underline" style={{ color: "#83eef0" }}>Vocdoni</a>
            {" "}— a censorship-resistant, gasless governance protocol.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {[
              { icon: "✅", name: "Standard",  desc: "One person, one vote. Most votes wins.", color: "#83eef0" },
              { icon: "🗳️", name: "Approval",  desc: "Vote for as many options as you support.", color: "#a78bfa" },
              { icon: "⚡", name: "Quadratic", desc: "Allocate credits — costs more to concentrate.", color: "#f59e0b" },
            ].map(m => (
              <div key={m.name} className="flex flex-col gap-1.5 p-3 rounded-xl" style={{ background: `${m.color}06`, border: `1px solid ${m.color}15` }}>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{m.icon}</span>
                  <span className="text-xs font-bold" style={{ fontFamily: "'Plus_Jakarta_Sans',sans-serif", color: "#d4e9f3cc" }}>{m.name}</span>
                </div>
                <p className="text-[10.5px] leading-relaxed" style={{ fontFamily: "'Inter',sans-serif", color: "#d4e9f355" }}>{m.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-[10px]" style={{ fontFamily: "'Inter',sans-serif", color: "#d4e9f330" }}>
            Connect a wallet to vote. A Vocdoni account is created automatically and is gasless.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Main governance page ─────────────────────────────────────────────────────
export function Governance() {
  const { authenticated, login } = usePrivy();
  const { orcidAuthenticated } = useOrcidAuth();
  const { wallets } = useWallets();
  const isAuthed = authenticated || orcidAuthenticated;

  const [elections, setElections]       = useState<VocdoniElection[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [filter, setFilter]             = useState<"all" | "active" | "ended" | "upcoming">("all");
  const [stratFilter, setStratFilter]   = useState<VotingStrategy | "all">("all");
  const [searchQuery, setSearchQuery]   = useState("");
  const [voteTarget, setVoteTarget]     = useState<VocdoniElection | null>(null);
  const [detailTarget, setDetailTarget] = useState<VocdoniElection | null>(null);
  const [detailRefreshing, setDetailRefreshing] = useState(false);
  const [voted, setVoted]               = useState<Record<string, boolean>>({});
  const [createOpen, setCreateOpen]     = useState(false);
  const [page, setPage]                 = useState(0);
  const [hasMore, setHasMore]           = useState(false);
  const [sdkConnected, setSdkConnected] = useState(false);
  const [viewMode, setViewMode]         = useState<"list" | "app">("list");
  const [orgIframeLoading, setOrgIframeLoading] = useState(true);
  const [orgIframeError, setOrgIframeError]     = useState(false);

  const [orgAddress, setOrgAddress]     = useState<string>("");
  const [configLoaded, setConfigLoaded] = useState(false);

  // ── Vocdoni SDK client (read-only, no wallet needed) ──────────────────────
  const vocdoniClientRef = useRef<any>(null);
  const [sdkReady, setSdkReady] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { VocdoniSDKClient, EnvOptions } = await import("@vocdoni/sdk");
        const env =
          VOCDONI_ENV === "prod" ? EnvOptions.PROD :
          VOCDONI_ENV === "dev"  ? EnvOptions.DEV  : EnvOptions.STG;
        vocdoniClientRef.current = new VocdoniSDKClient({ env });
        if (active) { setSdkReady(true); setSdkConnected(true); }
      } catch (e) {
        console.error("[governance] SDK init failed:", e);
      }
    })();
    return () => { active = false; };
  }, []);

  // ── Fetch org address from server config ──────────────────────────────────
  useEffect(() => {
    fetch("/api/governance/info")
      .then(r => r.json())
      .then((d: { orgAddress: string; env: string; configured: boolean }) => {
        setOrgAddress(d.orgAddress || "");
      })
      .catch(() => {})
      .finally(() => setConfigLoaded(true));
  }, []);

  // ── Fetch election list via Vocdoni SDK ───────────────────────────────────
  const fetchElections = useCallback(async (pageNum = 0) => {
    if (!configLoaded || !orgAddress || !sdkReady) return;
    setLoading(true); setError(null);
    try {
      const client = vocdoniClientRef.current;
      const result = await client.fetchElections({
        organizationId: orgAddress,
        page: pageNum,
        limit: 20,
      });

      const mapped: VocdoniElection[] = (result.elections ?? [])
        .filter((e: any) => e && typeof e.id !== "undefined")
        .map(mapSDKElection);

      setElections(prev => pageNum === 0 ? mapped : [...prev, ...mapped]);
      const pagination = result.pagination;
      setHasMore(pagination ? pagination.nextPage !== null && pagination.nextPage !== undefined : false);
    } catch (err: any) {
      console.error("[governance] fetchElections:", err);
      setError(err?.message || "Failed to load proposals from Vocdoni.");
    } finally { setLoading(false); }
  }, [configLoaded, orgAddress, sdkReady]);

  useEffect(() => {
    if (configLoaded && orgAddress && sdkReady) fetchElections(0);
    else if (configLoaded && !orgAddress) setLoading(false);
  }, [configLoaded, orgAddress, sdkReady, fetchElections]);

  // ── Auto-refresh active elections every 30 s ─────────────────────────────
  useEffect(() => {
    if (!orgAddress || !sdkReady) return;
    const hasActive = elections.some(e => e.status?.toUpperCase() === "ONGOING");
    if (!hasActive) return;
    const id = setInterval(() => fetchElections(0), 30_000);
    return () => clearInterval(id);
  }, [elections, orgAddress, sdkReady, fetchElections]);

  // ── Open detail panel: show immediately, then refresh from SDK ────────────
  const openDetail = useCallback(async (election: VocdoniElection) => {
    setDetailTarget(election);
    if (!sdkReady) return;
    setDetailRefreshing(true);
    try {
      const full = await vocdoniClientRef.current.fetchElection(election.electionId);
      const mapped = mapSDKElection(full);
      setDetailTarget(mapped);
      setElections(prev => prev.map(e => e.electionId === mapped.electionId ? mapped : e));
    } catch (e) {
      // Keep existing data on error
    } finally { setDetailRefreshing(false); }
  }, [sdkReady]);

  // Update detail target when elections refresh in the background
  useEffect(() => {
    if (detailTarget) {
      const updated = elections.find(e => e.electionId === detailTarget.electionId);
      if (updated) setDetailTarget(updated);
    }
  }, [elections]);

  const filtered = useMemo(() => {
    return elections.filter(e => {
      const st = e.status?.toUpperCase();
      // RESULTS is Vocdoni's "ended with final results" state — treat as ended
      const isEnded   = st === "ENDED" || st === "RESULTS";
      const isActive  = st === "ONGOING";
      const isUpcoming = st === "UPCOMING";
      if (filter === "active"   && !isActive)   return false;
      if (filter === "ended"    && !isEnded)    return false;
      if (filter === "upcoming" && !isUpcoming) return false;
      if (stratFilter !== "all" && strategyFromMeta(e.meta) !== stratFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const t = getText(e.title, "").toLowerCase();
        const d = getText(e.description, "").toLowerCase();
        if (!t.includes(q) && !d.includes(q)) return false;
      }
      return true;
    });
  }, [elections, filter, stratFilter, searchQuery]);

  const FILTER_TABS = [
    { key: "all" as const,      label: "All" },
    { key: "active" as const,   label: "Active" },
    { key: "upcoming" as const, label: "Upcoming" },
    { key: "ended" as const,    label: "Ended" },
  ];

  return (
    <div className="min-h-screen w-full" style={{ backgroundImage: `url(${coralBg})`, backgroundSize: "cover", backgroundPosition: "center", backgroundAttachment: "fixed" }}>
      {/* Dark overlay */}
      <div style={{ position: "fixed", inset: 0, background: "linear-gradient(180deg, rgba(0,6,10,0.92) 0%, rgba(0,12,20,0.86) 40%, rgba(0,6,10,0.95) 100%)", zIndex: 0, pointerEvents: "none" }} />

      <div style={{ position: "relative", zIndex: 1 }}>

        {/* ── Mobile top bar ── */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-[#ffffff08] md:hidden">
          <Link href="/">
            <button className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
              <ArrowLeft size={15} style={{ color: "#9aaeb8" }} />
            </button>
          </Link>
          <span className="text-sm font-bold" style={{ fontFamily: "'Plus_Jakarta_Sans',sans-serif", color: "#d4e9f3" }}>Governance</span>
          {authenticated && wallets.length > 0 ? (
            <button onClick={() => setCreateOpen(true)} data-testid="button-new-proposal-mobile"
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{ background: "linear-gradient(135deg, #83eef0 0%, #3fb0b3 100%)", color: "#004d50", fontFamily: "'Inter',sans-serif" }}>
              <Plus size={12} /> New
            </button>
          ) : (
            <div className="w-8" />
          )}
        </div>

        {/* ── Desktop header ── */}
        <div className="hidden md:flex items-center gap-4 px-6 py-4 border-b border-[#ffffff07]">
          <Link href="/">
            <button className="flex items-center gap-2 text-sm transition-colors hover:opacity-80" style={{ fontFamily: "'Inter',sans-serif", color: "#9aaeb8" }}>
              <ArrowLeft size={15} /> Back
            </button>
          </Link>
        </div>

        {/* ── Hero ── */}
        <div className="max-w-4xl mx-auto px-4 md:px-6 pt-8 pb-6">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, #83eef020 0%, #3fb0b315 100%)", border: "1px solid rgba(131,238,240,0.2)" }}>
                <Vote size={22} style={{ color: "#83eef0" }} />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold" style={{ fontFamily: "'Plus_Jakarta_Sans',sans-serif", color: "#d4e9f3" }}>
                  MesoReef DAO
                </h1>
                <p className="text-sm" style={{ fontFamily: "'Inter',sans-serif", color: "#9aaeb8" }}>On-chain governance · Powered by Vocdoni</p>
              </div>
            </div>
            {/* Desktop create button */}
            {authenticated && wallets.length > 0 && orgAddress && (
              <button onClick={() => setCreateOpen(true)} data-testid="button-new-proposal"
                className="hidden md:flex items-center gap-2 px-5 py-2.5 rounded-2xl font-semibold text-sm transition-all hover:opacity-90 flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #83eef0 0%, #3fb0b3 100%)", color: "#004d50", fontFamily: "'Inter',sans-serif" }}>
                <Plus size={15} /> New Proposal
              </button>
            )}
            {!isAuthed && (
              <button onClick={login} data-testid="button-sign-in-governance"
                className="hidden md:flex items-center gap-2 px-5 py-2.5 rounded-2xl font-semibold text-sm transition-all hover:opacity-90 flex-shrink-0"
                style={{ border: "1px solid rgba(131,238,240,0.3)", color: "#83eef0", fontFamily: "'Inter',sans-serif" }}>
                Sign in to vote
              </button>
            )}
          </div>

          {/* Network badge */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1 rounded-full" style={{ background: "#6366f110", border: "1px solid #6366f125", color: "#818cf8", fontFamily: "'Inter',sans-serif" }}>
              <Shield size={10} /> Base Network
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1 rounded-full" style={{ background: "#83eef010", border: "1px solid #83eef025", color: "#83eef0", fontFamily: "'Inter',sans-serif" }}>
              <Zap size={10} /> Gasless Voting
            </span>
            {/* Live SDK connection indicator */}
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1 rounded-full" style={{ background: sdkConnected ? "#4ade8010" : "#ffffff06", border: `1px solid ${sdkConnected ? "#4ade8030" : "#ffffff10"}`, color: sdkConnected ? "#4ade80" : "#9aaeb860", fontFamily: "'Inter',sans-serif" }}>
              {sdkConnected
                ? <><span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-pulse" /> SDK Live</>
                : <><Loader2 size={10} className="animate-spin" /> Connecting…</>}
            </span>
            <a href="https://explorer.vote" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1 rounded-full no-underline transition-all hover:opacity-80"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#9aaeb8", fontFamily: "'Inter',sans-serif" }}>
              <ExternalLink size={10} /> Explorer
            </a>
          </div>
        </div>

        {/* ── Main content ── */}
        <div className="max-w-4xl mx-auto px-4 md:px-6 pb-32 md:pb-16">

          {/* Loading config skeleton */}
          {!configLoaded ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: "rgba(0,8,12,0.5)", border: "1px solid rgba(255,255,255,0.04)" }} />
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-48 rounded-[20px] animate-pulse" style={{ background: "rgba(0,8,12,0.5)", border: "1px solid rgba(255,255,255,0.04)" }} />
                ))}
              </div>
            </>
          ) : !orgAddress ? (
            /* ── Not configured state ── */
            <div className="flex flex-col items-center gap-6 py-20 text-center">
              <div className="w-24 h-24 rounded-3xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgba(131,238,240,0.08) 0%, rgba(63,176,179,0.05) 100%)", border: "1px solid rgba(131,238,240,0.15)" }}>
                <Vote size={40} style={{ color: "#83eef050" }} />
              </div>
              <div className="flex flex-col gap-2 max-w-md">
                <h2 className="text-2xl font-bold" style={{ fontFamily: "'Plus_Jakarta_Sans',sans-serif", color: "#d4e9f3" }}>
                  DAO Governance Coming Soon
                </h2>
                <p className="text-sm leading-relaxed" style={{ fontFamily: "'Inter',sans-serif", color: "#9aaeb8" }}>
                  MesoReef DAO governance is powered by{" "}
                  <a href="https://vocdoni.io" target="_blank" rel="noopener noreferrer" className="font-semibold no-underline" style={{ color: "#83eef0" }}>Vocdoni</a>
                  {" "}— gasless, censorship-resistant, on-chain voting. Proposals will appear here once the DAO org is live on Base.
                </p>
              </div>

              {/* Feature grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-lg">
                {[
                  { icon: <Zap size={18} style={{ color: "#83eef0" }} />, title: "Gasless", desc: "Zero gas fees — all voting is free", bg: "#83eef0" },
                  { icon: <Shield size={18} style={{ color: "#a78bfa" }} />, title: "On-chain", desc: "Every vote recorded on Vocdoni chain", bg: "#a78bfa" },
                  { icon: <Activity size={18} style={{ color: "#4ade80" }} />, title: "Verifiable", desc: "Results are transparent and auditable", bg: "#4ade80" },
                ].map(f => (
                  <div key={f.title} className="flex flex-col items-center gap-2 p-4 rounded-2xl text-center" style={{ background: "rgba(0,8,12,0.6)", border: `1px solid ${f.bg}12` }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${f.bg}10` }}>{f.icon}</div>
                    <span className="text-sm font-bold" style={{ fontFamily: "'Plus_Jakarta_Sans',sans-serif", color: "#d4e9f3" }}>{f.title}</span>
                    <span className="text-[10px]" style={{ fontFamily: "'Inter',sans-serif", color: "#9aaeb8" }}>{f.desc}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap justify-center gap-2">
                <a href="https://vocdoni.io" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-full text-xs font-semibold no-underline transition-all hover:opacity-80"
                  style={{ background: "#83eef020", border: "1px solid #83eef040", color: "#83eef0", fontFamily: "'Inter',sans-serif" }}>
                  <ExternalLink size={11} /> Vocdoni Protocol
                </a>
                <a href="https://app.vocdoni.io" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-full text-xs font-semibold no-underline transition-all hover:opacity-80"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#9aaeb8", fontFamily: "'Inter',sans-serif" }}>
                  <ExternalLink size={11} /> Vocdoni App
                </a>
              </div>

              <div className="w-full max-w-lg">
                <HowVotingWorks />
              </div>
            </div>
          ) : (
            /* ── Configured: full governance dashboard ── */
            <>
              {/* Stats */}
              <DAOStats elections={elections} />

              {/* View mode toggle */}
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={() => setViewMode("list")}
                  data-testid="button-view-list"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all"
                  style={{ fontFamily: "'Inter',sans-serif", background: viewMode === "list" ? "#83eef020" : "rgba(0,8,12,0.5)", border: `1px solid ${viewMode === "list" ? "#83eef050" : "rgba(255,255,255,0.1)"}`, color: viewMode === "list" ? "#83eef0" : "#9aaeb8" }}>
                  <LayoutGrid size={12} /> List
                </button>
                <button
                  onClick={() => { setViewMode("app"); setOrgIframeLoading(true); setOrgIframeError(false); }}
                  data-testid="button-view-app"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all"
                  style={{ fontFamily: "'Inter',sans-serif", background: viewMode === "app" ? "#83eef020" : "rgba(0,8,12,0.5)", border: `1px solid ${viewMode === "app" ? "#83eef050" : "rgba(255,255,255,0.1)"}`, color: viewMode === "app" ? "#83eef0" : "#9aaeb8" }}>
                  <Globe size={12} /> Vocdoni App
                </button>
              </div>

              {/* ── Vocdoni App iframe view ── */}
              {viewMode === "app" && (
                <div className="rounded-2xl overflow-hidden mb-4" style={{ border: "1px solid rgba(131,238,240,0.15)" }}>
                  {/* Browser chrome bar */}
                  <div className="flex items-center gap-2 px-3 py-2 border-b" style={{ background: "rgba(0,6,12,0.95)", borderColor: "rgba(131,238,240,0.08)" }}>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }} />
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }} />
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }} />
                    </div>
                    <div className="flex-1 flex items-center gap-2 px-3 py-1 rounded-md" style={{ background: "rgba(255,255,255,0.05)" }}>
                      {!orgIframeError && orgIframeLoading && <Loader2 size={9} className="animate-spin flex-shrink-0" style={{ color: "#83eef080" }} />}
                      {!orgIframeError && !orgIframeLoading && <div className="w-1.5 h-1.5 rounded-full bg-[#4ade80] flex-shrink-0 animate-pulse" />}
                      <span className="text-[10px] truncate" style={{ fontFamily: "'Inter',sans-serif", color: "#9aaeb870" }}>
                        app.vocdoni.io/organization/{orgAddress.slice(0, 20)}…
                      </span>
                    </div>
                    <a href={`https://app.vocdoni.io/organization/${orgAddress}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[10px] font-medium no-underline transition-all hover:opacity-80 flex-shrink-0"
                      style={{ fontFamily: "'Inter',sans-serif", color: "#83eef070" }}>
                      <ExternalLink size={10} /> Open
                    </a>
                  </div>

                  {orgIframeError ? (
                    <div className="flex flex-col items-center gap-4 py-20 text-center px-6" style={{ background: "rgba(0,8,12,0.6)" }}>
                      <AlertCircle size={28} style={{ color: "#f8717160" }} />
                      <div className="flex flex-col gap-1.5">
                        <p className="text-sm font-semibold" style={{ fontFamily: "'Plus_Jakarta_Sans',sans-serif", color: "#d4e9f3" }}>Could not embed Vocdoni App</p>
                        <p className="text-xs" style={{ fontFamily: "'Inter',sans-serif", color: "#9aaeb8" }}>Open directly in a new tab instead.</p>
                      </div>
                      <a href={`https://app.vocdoni.io/organization/${orgAddress}`} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-semibold no-underline transition-all hover:opacity-80"
                        style={{ background: "#83eef020", border: "1px solid #83eef040", color: "#83eef0", fontFamily: "'Inter',sans-serif" }}>
                        <ExternalLink size={12} /> Open in Vocdoni App
                      </a>
                    </div>
                  ) : (
                    <div className="relative" style={{ minHeight: "75vh" }}>
                      {orgIframeLoading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10" style={{ background: "rgba(0,8,12,0.85)" }}>
                          <Loader2 size={32} className="animate-spin" style={{ color: "#83eef0" }} />
                          <span className="text-sm" style={{ fontFamily: "'Inter',sans-serif", color: "#9aaeb8" }}>Loading Vocdoni App…</span>
                        </div>
                      )}
                      <iframe
                        key={orgAddress}
                        src={`https://app.vocdoni.io/organization/${orgAddress}`}
                        title="MesoReef DAO — Vocdoni App"
                        className="w-full block"
                        style={{ height: "75vh", minHeight: "600px", border: "none", display: "block", background: "#000" }}
                        loading="lazy"
                        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-storage-access-by-user-activation"
                        onLoad={() => setOrgIframeLoading(false)}
                        onError={() => { setOrgIframeLoading(false); setOrgIframeError(true); }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* ── List view ── */}
              {viewMode === "list" && (
              <>

              {/* How voting works */}
              <div className="mb-4">
                <HowVotingWorks />
              </div>

              {/* Toolbar: search + filters + create */}
              <div className="flex flex-col gap-3 mb-4">
                {/* Search */}
                <div className="relative">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#9aaeb8" }} />
                  <input
                    value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search proposals…" data-testid="input-search-proposals"
                    className="w-full pl-9 pr-4 py-2.5 rounded-2xl text-sm outline-none"
                    style={{ fontFamily: "'Inter',sans-serif", background: "rgba(0,8,12,0.6)", border: "1px solid rgba(255,255,255,0.08)", color: "#d4e9f3" }}
                  />
                </div>

                {/* Filter row */}
                <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                  {FILTER_TABS.map(tab => (
                    <button key={tab.key} onClick={() => setFilter(tab.key)} data-testid={`button-filter-${tab.key}`}
                      className="flex-none px-4 py-2 rounded-full text-xs font-semibold transition-all"
                      style={{ fontFamily: "'Inter',sans-serif", background: filter === tab.key ? "#83eef020" : "rgba(0,8,12,0.5)", border: `1px solid ${filter === tab.key ? "#83eef050" : "rgba(255,255,255,0.1)"}`, color: filter === tab.key ? "#83eef0" : "#9aaeb8" }}>
                      {tab.label}
                    </button>
                  ))}
                  <div className="flex-none w-px mx-1 self-stretch" style={{ background: "rgba(255,255,255,0.08)" }} />
                  {(["all", "standard", "approval", "quadratic"] as const).map(key => (
                    <button key={key} onClick={() => setStratFilter(key)} data-testid={`button-strat-filter-${key}`}
                      className="flex-none px-3 py-2 rounded-full text-[10px] font-semibold transition-all capitalize"
                      style={{ fontFamily: "'Inter',sans-serif", background: stratFilter === key ? "rgba(255,255,255,0.1)" : "rgba(0,8,12,0.4)", border: `1px solid ${stratFilter === key ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.07)"}`, color: stratFilter === key ? "#d4e9f3" : "#9aaeb860" }}>
                      {key === "all" ? "Any strategy" : key}
                    </button>
                  ))}
                  {!loading && (
                    <span className="flex-none self-center ml-auto pl-2 text-[10px] whitespace-nowrap" style={{ fontFamily: "'Inter',sans-serif", color: "#9aaeb850" }}>
                      {filtered.length} proposal{filtered.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>

              {/* Loading skeletons */}
              {loading && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-52 rounded-[20px] animate-pulse" style={{ background: "rgba(0,8,12,0.5)", border: "1px solid rgba(255,255,255,0.04)" }} />
                  ))}
                </div>
              )}

              {/* Error state */}
              {!loading && error && (
                <div className="flex flex-col items-center gap-3 py-16 text-center">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "#f8717115", border: "1px solid #f8717125" }}>
                    <AlertCircle size={26} style={{ color: "#f87171" }} />
                  </div>
                  <p className="text-sm font-medium" style={{ fontFamily: "'Inter',sans-serif", color: "#fca5a5" }}>{error}</p>
                  <button onClick={() => fetchElections(0)} className="text-xs font-semibold underline" style={{ fontFamily: "'Inter',sans-serif", color: "#83eef0" }}>Try again</button>
                </div>
              )}

              {/* Empty state */}
              {!loading && !error && filtered.length === 0 && (
                <div className="flex flex-col items-center gap-3 py-20 text-center">
                  <BarChart2 size={40} style={{ color: "rgba(212,233,243,0.15)" }} />
                  <span className="text-lg font-bold" style={{ fontFamily: "'Plus_Jakarta_Sans',sans-serif", color: "#d4e9f366" }}>No proposals found</span>
                  <span className="text-sm max-w-xs" style={{ fontFamily: "'Inter',sans-serif", color: "#9aaeb860" }}>
                    {searchQuery ? `No results for "${searchQuery}"` : filter !== "all" ? "No proposals in this category yet." : authenticated && wallets.length > 0 ? "Create the first governance proposal." : "Connect a wallet to create a proposal."}
                  </span>
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="text-xs font-semibold" style={{ color: "#83eef0", fontFamily: "'Inter',sans-serif" }}>Clear search</button>
                  )}
                </div>
              )}

              {/* Proposal grid */}
              {!loading && !error && filtered.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filtered.map(e => (
                    <ProposalCard key={e.electionId} election={e} onSelect={openDetail} voted={!!voted[e.electionId]} />
                  ))}
                </div>
              )}

              {/* Load more */}
              {hasMore && !loading && (
                <div className="flex justify-center mt-6">
                  <button onClick={() => { const next = page + 1; setPage(next); fetchElections(next); }} data-testid="button-load-more"
                    className="px-6 py-2.5 rounded-full text-xs font-semibold transition-all hover:opacity-80"
                    style={{ fontFamily: "'Inter',sans-serif", border: "1px solid rgba(131,238,240,0.2)", color: "#83eef0", background: "rgba(131,238,240,0.06)" }}>
                    Load more proposals
                  </button>
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-center gap-3 mt-10 pb-2 opacity-40">
                <span className="text-[10px]" style={{ fontFamily: "'Inter',sans-serif", color: "#d4e9f3" }}>Powered by</span>
                <a href="https://vocdoni.io" target="_blank" rel="noopener noreferrer" className="text-[10px] font-semibold no-underline" style={{ fontFamily: "'Inter',sans-serif", color: "#83eef0" }}>Vocdoni</a>
                <span style={{ color: "rgba(255,255,255,0.2)" }}>·</span>
                <a href={`https://github.com/${DEFAULT_GH_OWNER}/${DEFAULT_GH_REPO}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[10px] no-underline" style={{ fontFamily: "'Inter',sans-serif", color: "rgba(212,233,243,0.5)" }}>
                  <Github size={9} /> {DEFAULT_GH_OWNER}/{DEFAULT_GH_REPO}
                </a>
              </div>
              </>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Mobile FAB ── */}
      {authenticated && wallets.length > 0 && orgAddress && (
        <button onClick={() => setCreateOpen(true)} data-testid="button-new-proposal-fab"
          aria-label="New Proposal"
          className="md:hidden fixed bottom-[88px] right-4 z-20 w-14 h-14 rounded-full flex items-center justify-center shadow-[0_4px_24px_rgba(131,238,240,0.3)] active:opacity-80 transition-all"
          style={{ background: "linear-gradient(135deg, #83eef0 0%, #3fb0b3 100%)" }}>
          <Plus size={22} style={{ color: "#004d50" }} />
        </button>
      )}

      {/* ── Proposal detail overlay ── */}
      {detailTarget && (
        <ProposalDetail
          election={detailTarget}
          onClose={() => setDetailTarget(null)}
          onVote={() => { setVoteTarget(detailTarget); }}
          voted={!!voted[detailTarget.electionId]}
          refreshing={detailRefreshing}
        />
      )}

      {/* ── Vote modal ── */}
      {voteTarget && (
        <VoteModal
          election={voteTarget}
          onClose={() => setVoteTarget(null)}
          onSuccess={() => {
            setVoted(prev => ({ ...prev, [voteTarget.electionId]: true }));
            fetchElections(0);
          }}
        />
      )}

      {/* ── Create modal ── */}
      {createOpen && (
        <CreateModal orgAddress={orgAddress} onClose={() => setCreateOpen(false)} onCreated={() => fetchElections(0)} />
      )}

      <MobileBottomNav />
    </div>
  );
}
