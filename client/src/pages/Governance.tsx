import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useOrcidAuth } from "@/hooks/use-orcid-auth";
import {
  ArrowLeft, Vote, Plus, CheckCircle2, XCircle, Loader2, Users, BarChart2,
  Calendar, ChevronDown, ChevronUp, AlertCircle, ExternalLink, Github, GitPullRequest,
  CircleDot, CheckSquare, BarChart, RefreshCw, Info,
} from "lucide-react";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import coralBg from "@assets/coral_micro_1777060394505.jpg";

// ─── Vocdoni config ───────────────────────────────────────────────────────────
// VOCDONI_ENV is used client-side by the SDK for voting/creating proposals.
// The org address and API calls go through the server proxy (/api/governance/*).
const VOCDONI_ENV = (import.meta.env.VITE_VOCDONI_ENV as string) || "prod";

// Default GitHub repo for importing voting options
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
    case "ONGOING":  return { label: "Active",    color: "#83eef0", bg: "#83eef015", border: "#83eef030" };
    case "ENDED":    return { label: "Ended",     color: "#d4e9f366", bg: "#ffffff06", border: "#ffffff10" };
    case "UPCOMING": return { label: "Upcoming",  color: "#A6CE39",  bg: "#A6CE3915", border: "#A6CE3930" };
    case "PAUSED":   return { label: "Paused",    color: "#f59e0b",  bg: "#f59e0b15", border: "#f59e0b30" };
    case "CANCELED": return { label: "Canceled",  color: "#ff4a4a",  bg: "#ff4a4a15", border: "#ff4a4a30" };
    default:         return { label: status || "Unknown", color: "#d4e9f366", bg: "#ffffff06", border: "#ffffff10" };
  }
}

function fmtDate(dateStr: string): string {
  try { return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
  catch { return dateStr; }
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

// ─── Strategy badge ───────────────────────────────────────────────────────────
function StrategyBadge({ strategy }: { strategy: VotingStrategy }) {
  const map = {
    standard:  { label: "Standard",  icon: Vote,        color: "#83eef0", bg: "#83eef010" },
    approval:  { label: "Approval",  icon: CheckSquare, color: "#A6CE39", bg: "#A6CE3910" },
    quadratic: { label: "Quadratic", icon: BarChart,    color: "#c7b4ff", bg: "#c7b4ff10" },
  };
  const s = map[strategy] ?? map.standard;
  const Icon = s.icon;
  return (
    <span
      className="flex items-center gap-1 text-[10px] [font-family:'Inter',Helvetica] font-semibold px-2 py-0.5 rounded-full"
      style={{ color: s.color, background: s.bg, border: `1px solid ${s.color}25` }}
    >
      <Icon size={9} />
      {s.label}
    </span>
  );
}

// ─── Census badge ─────────────────────────────────────────────────────────────
function CensusBadge({ mode }: { mode: CensusMode }) {
  if (mode === "base-members") {
    return (
      <span
        className="flex items-center gap-1 text-[10px] [font-family:'Inter',Helvetica] font-semibold px-2 py-0.5 rounded-full"
        style={{ color: "#2151f5", background: "#2151f510", border: "1px solid #2151f525" }}
        title="Census based on Base Network members"
      >
        <span className="font-bold">Base</span>
      </span>
    );
  }
  return null;
}

// ─── Proposal card ───────────────────────────────────────────────────────────
function ProposalCard({
  election, onVote, voted,
}: { election: VocdoniElection; onVote: (e: VocdoniElection) => void; voted: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const s = statusStyle(election.status);
  const isActive = election.status?.toUpperCase() === "ONGOING";
  const title    = getText(election.title, "Untitled Proposal");
  const desc     = getText(election.description);
  const q0       = election.questions?.[0];
  const choices  = q0?.choices ?? [];
  const results  = election.results;
  const tot      = totalVotes(results);
  const strategy = strategyFromMeta(election.meta);
  const censusMode = censorModeFromMeta(election.meta);

  return (
    <div
      data-testid={`card-proposal-${election.electionId}`}
      className="rounded-[24px] border overflow-hidden transition-all"
      style={{ background: "#00080ca0", borderColor: "#ffffff0d", backdropFilter: "blur(12px)" }}
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <span
            className="text-[10px] font-semibold px-2.5 py-1 rounded-full [font-family:'Inter',Helvetica]"
            style={{ color: s.color, background: s.bg, border: `1px solid ${s.border}` }}
          >
            {s.label}
          </span>
          <div className="flex items-center gap-1.5 text-[#d4e9f344]" title={`Ends ${fmtDate(election.endDate)}`}>
            <Calendar size={11} />
            <span className="[font-family:'Inter',Helvetica] text-[10px]">{fmtDate(election.endDate)}</span>
          </div>
        </div>

        {/* Strategy + census badges */}
        <div className="flex items-center gap-1.5 mb-2.5">
          <StrategyBadge strategy={strategy} />
          <CensusBadge mode={censusMode} />
        </div>

        <h3 className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-bold text-[#d4e9f3] text-base leading-snug mb-1.5">
          {title}
        </h3>
        {desc && (
          <p className="[font-family:'Inter',Helvetica] text-[#9aaeb8] text-xs leading-relaxed line-clamp-2">
            {desc}
          </p>
        )}
      </div>

      {/* Options / Results */}
      {choices.length > 0 && (
        <div className="px-5 pb-4 flex flex-col gap-2">
          {choices.slice(0, expanded ? choices.length : 4).map((choice, ci) => {
            const p = pct(results, 0, ci);
            return (
              <div key={ci} className="flex flex-col gap-0.5">
                <div className="flex justify-between items-center">
                  <span className="[font-family:'Inter',Helvetica] text-xs text-[#d4e9f3cc]">
                    {getText(choice.title)}
                  </span>
                  {results && <span className="[font-family:'Inter',Helvetica] text-[10px] text-[#d4e9f366]">{p}%</span>}
                </div>
                {results && (
                  <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "#ffffff0a" }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${p}%`,
                        background: strategy === "quadratic"
                          ? "linear-gradient(90deg, #c7b4ff 0%, #8b5cf6 100%)"
                          : strategy === "approval"
                          ? "linear-gradient(90deg, #A6CE39 0%, #5a8a1c 100%)"
                          : "linear-gradient(90deg, #83eef0 0%, #3fb0b3 100%)",
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
          {choices.length > 4 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-[#83eef066] hover:text-[#83eef0] text-[10px] [font-family:'Inter',Helvetica] transition-colors mt-0.5 self-start"
            >
              {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              {expanded ? "Show less" : `+${choices.length - 4} more options`}
            </button>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between gap-3 px-5 py-3 border-t" style={{ borderColor: "#ffffff09" }}>
        <div className="flex items-center gap-1.5">
          <Users size={11} className="text-[#d4e9f344]" />
          <span className="[font-family:'Inter',Helvetica] text-[10px] text-[#d4e9f344]">
            {tot.toLocaleString()} {tot === 1 ? "vote" : "votes"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`https://app.vocdoni.io/processes/show/#/${election.electionId}`}
            target="_blank" rel="noopener noreferrer"
            data-testid={`link-vocdoni-explorer-${election.electionId}`}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[10px] [font-family:'Inter',Helvetica] font-medium transition-colors no-underline"
            style={{ color: "#d4e9f366", border: "1px solid #ffffff0d" }}
          >
            <ExternalLink size={9} /> Explorer
          </a>
          {isActive && !voted && (
            <button
              onClick={() => onVote(election)}
              data-testid={`button-vote-${election.electionId}`}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] [font-family:'Inter',Helvetica] font-semibold transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #83eef0 0%, #3fb0b3 100%)", color: "#00585a" }}
            >
              <Vote size={11} /> Vote
            </button>
          )}
          {voted && (
            <span
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] [font-family:'Inter',Helvetica] font-medium"
              style={{ color: "#83eef0", background: "#83eef015", border: "1px solid #83eef030" }}
            >
              <CheckCircle2 size={11} /> Voted
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── SDK step stepper ─────────────────────────────────────────────────────────
function StepStepper({ steps }: { steps: { label: string; state: "waiting" | "active" | "done" | "skip" }[] }) {
  return (
    <div className="flex flex-col gap-3 py-2">
      {steps.filter(s => s.state !== "skip").map((s, i) => (
        <div key={i} className="flex items-center gap-3">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
            style={{
              background: s.state === "done" ? "#83eef018" : s.state === "active" ? "#83eef010" : "#ffffff08",
              border: `1.5px solid ${s.state === "done" ? "#83eef060" : s.state === "active" ? "#83eef040" : "#ffffff12"}`,
            }}
          >
            {s.state === "done"   && <CheckCircle2 size={14} className="text-[#83eef0]" />}
            {s.state === "active" && <Loader2 size={14} className="animate-spin text-[#83eef0]" />}
            {s.state === "waiting"&& <div className="w-2 h-2 rounded-full bg-[#ffffff20]" />}
          </div>
          <span className="[font-family:'Inter',Helvetica] text-sm transition-colors" style={{ color: s.state === "done" ? "#83eef0" : s.state === "active" ? "#d4e9f3" : "#d4e9f344" }}>
            {s.label}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Vote modal ───────────────────────────────────────────────────────────────
function VoteModal({
  election, onClose, onSuccess,
}: { election: VocdoniElection; onClose: () => void; onSuccess: () => void }) {
  const { wallets } = useWallets();
  const strategy = strategyFromMeta(election.meta);

  const [choices, setChoices] = useState<Record<number, number>>({});
  const [approvalChoices, setApprovalChoices] = useState<Record<number, Set<number>>>({});
  const [credits, setCredits] = useState<Record<number, Record<number, number>>>({});
  const TOTAL_CREDITS = 25;

  type Phase = "form" | "processing" | "success" | "error";
  type SubStep = "account" | "faucet" | "vote";
  const [phase, setPhase] = useState<Phase>("form");
  const [subStep, setSubStep] = useState<SubStep>("account");
  const [needsFaucet, setNeedsFaucet] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const questions = election.questions ?? [];

  const usedCredits = (qi: number) =>
    Object.values(credits[qi] || {}).reduce((s, c) => s + c * c, 0);

  const allAnswered = (() => {
    if (strategy === "standard") return questions.every((_, qi) => choices[qi] !== undefined);
    if (strategy === "approval") return questions.every((_, qi) => (approvalChoices[qi]?.size ?? 0) > 0);
    if (strategy === "quadratic") return questions.every((_, qi) => usedCredits(qi) > 0 && usedCredits(qi) <= TOTAL_CREDITS);
    return false;
  })();

  async function handleVote() {
    if (!allAnswered) return;
    const wallet = wallets[0];
    if (!wallet) { setErrorMsg("No wallet connected."); setPhase("error"); return; }

    setPhase("processing");
    setSubStep("account");
    setNeedsFaucet(false);
    setErrorMsg("");

    try {
      const { VocdoniSDKClient, EnvOptions, Vote } = await import("@vocdoni/sdk");
      const eip1193 = await wallet.getEthereumProvider();
      const { ethers } = await import("ethers");
      const provider = new ethers.providers.Web3Provider(eip1193 as any);
      const signer = provider.getSigner();
      const env =
        VOCDONI_ENV === "prod" ? EnvOptions.PROD :
        VOCDONI_ENV === "dev"  ? EnvOptions.DEV  : EnvOptions.STG;

      // Step 1: set up account
      const client = new VocdoniSDKClient({ env, wallet: signer });
      const accountInfo = await client.createAccount();

      // Step 2: faucet (non-prod only when balance is 0)
      if (accountInfo.balance === 0 && VOCDONI_ENV !== "prod") {
        setNeedsFaucet(true);
        setSubStep("faucet");
        await client.collectFaucetTokens();
      }

      // Step 3: submit vote
      setSubStep("vote");
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

      await client.submitVote(new Vote(voteValues));
      setPhase("success");
      setTimeout(() => { onSuccess(); onClose(); }, 2200);
    } catch (err: any) {
      console.error("[governance vote]", err);
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

  const stepStates = (s: SubStep): "waiting" | "active" | "done" => {
    const order: SubStep[] = needsFaucet ? ["account", "faucet", "vote"] : ["account", "vote"];
    const cur = order.indexOf(subStep);
    const idx = order.indexOf(s);
    if (idx < cur) return "done";
    if (idx === cur) return "active";
    return "waiting";
  };

  const processingSteps = [
    { label: "Setting up voting account", state: stepStates("account") },
    { label: "Collecting voting tokens", state: needsFaucet ? stepStates("faucet") : ("skip" as const) },
    { label: "Submitting vote to Vocdoni chain", state: stepStates("vote") },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:px-4 sm:py-6 overflow-y-auto" onClick={phase === "processing" ? undefined : onClose}>
      <div className="absolute inset-0" style={{ background: "rgba(0,8,12,0.85)" }} />
      <div
        className="relative w-full sm:max-w-md rounded-t-[28px] sm:rounded-[28px] border-t sm:border border-[#83eef030] p-5 sm:p-6 flex flex-col gap-5 max-h-[90vh] overflow-y-auto"
        style={{ background: "#00131a", backdropFilter: "blur(20px)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* drag handle (mobile) */}
        <div className="sm:hidden w-10 h-1 rounded-full bg-[#ffffff20] mx-auto -mt-1 mb-1" />

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1.5">
            <StrategyBadge strategy={strategy} />
            <h2 className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-bold text-[#d4e9f3] text-[17px] leading-snug">
              {getText(election.title, "Untitled Proposal")}
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={phase === "processing"}
            className="text-[#d4e9f344] hover:text-[#d4e9f3] transition-colors flex-shrink-0 mt-0.5 disabled:opacity-30"
          >
            <XCircle size={20} />
          </button>
        </div>

        {/* Processing steps */}
        {phase === "processing" && <StepStepper steps={processingSteps} />}

        {/* Success */}
        {phase === "success" && (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "#83eef018", border: "1px solid #83eef040" }}>
              <CheckCircle2 size={30} className="text-[#83eef0]" />
            </div>
            <p className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-bold text-[#d4e9f3] text-lg">Vote submitted!</p>
            <p className="[font-family:'Inter',Helvetica] text-[#9aaeb8] text-sm max-w-xs">
              Your vote has been recorded on the Vocdoni chain and will be counted when the election ends.
            </p>
            <a
              href={`https://app.vocdoni.io/processes/show/#/${election.electionId}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs [font-family:'Inter',Helvetica] font-semibold no-underline"
              style={{ color: "#83eef0" }}
            >
              <ExternalLink size={11} /> View on Vocdoni Explorer
            </a>
          </div>
        )}

        {/* Voting form (shown in form + error phases) */}
        {(phase === "form" || phase === "error") && (
          <>
            {/* Standard voting */}
            {strategy === "standard" && questions.map((q, qi) => (
              <div key={qi} className="flex flex-col gap-2">
                <p className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-semibold text-[#d4e9f3] text-sm">
                  {getText(q.title, `Question ${qi + 1}`)}
                </p>
                <div className="flex flex-col gap-1.5">
                  {q.choices.map((c, ci) => {
                    const selected = choices[qi] === c.value;
                    return (
                      <button
                        key={ci}
                        data-testid={`button-choice-q${qi}-c${ci}`}
                        onClick={() => setChoices(prev => ({ ...prev, [qi]: c.value }))}
                        className="flex items-center gap-3 px-4 py-3 rounded-2xl border text-left transition-all"
                        style={{ background: selected ? "#83eef018" : "#ffffff06", borderColor: selected ? "#83eef050" : "#ffffff0d", color: selected ? "#83eef0" : "#d4e9f3cc" }}
                      >
                        <div className="w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center" style={{ borderColor: selected ? "#83eef0" : "#ffffff25" }}>
                          {selected && <div className="w-2 h-2 rounded-full" style={{ background: "#83eef0" }} />}
                        </div>
                        <span className="[font-family:'Inter',Helvetica] text-sm">{getText(c.title)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Approval voting */}
            {strategy === "approval" && questions.map((q, qi) => (
              <div key={qi} className="flex flex-col gap-2">
                <p className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-semibold text-[#d4e9f3] text-sm">
                  {getText(q.title, `Question ${qi + 1}`)}
                </p>
                <p className="[font-family:'Inter',Helvetica] text-[#9aaeb8] text-xs">Select all options you approve of.</p>
                <div className="flex flex-col gap-1.5">
                  {q.choices.map((c, ci) => {
                    const checked = approvalChoices[qi]?.has(ci) ?? false;
                    return (
                      <button
                        key={ci}
                        data-testid={`button-approval-q${qi}-c${ci}`}
                        onClick={() => setApprovalChoices(prev => {
                          const s = new Set(prev[qi] ?? []);
                          if (s.has(ci)) s.delete(ci); else s.add(ci);
                          return { ...prev, [qi]: s };
                        })}
                        className="flex items-center gap-3 px-4 py-3 rounded-2xl border text-left transition-all"
                        style={{ background: checked ? "#A6CE3918" : "#ffffff06", borderColor: checked ? "#A6CE3950" : "#ffffff0d", color: checked ? "#A6CE39" : "#d4e9f3cc" }}
                      >
                        <div className="w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center" style={{ borderColor: checked ? "#A6CE39" : "#ffffff25" }}>
                          {checked && <CheckCircle2 size={10} style={{ color: "#A6CE39" }} />}
                        </div>
                        <span className="[font-family:'Inter',Helvetica] text-sm">{getText(c.title)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Quadratic voting */}
            {strategy === "quadratic" && questions.map((q, qi) => {
              const used = usedCredits(qi);
              return (
                <div key={qi} className="flex flex-col gap-2">
                  <p className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-semibold text-[#d4e9f3] text-sm">
                    {getText(q.title, `Question ${qi + 1}`)}
                  </p>
                  <div className="flex items-center justify-between px-1">
                    <p className="[font-family:'Inter',Helvetica] text-[#9aaeb8] text-xs">Distribute credits (cost = credits²)</p>
                    <span className="[font-family:'Inter',Helvetica] text-xs font-semibold" style={{ color: used > TOTAL_CREDITS ? "#ff4a4a" : "#c7b4ff" }}>
                      {used}/{TOTAL_CREDITS} used
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "#ffffff0a" }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, (used / TOTAL_CREDITS) * 100)}%`, background: used > TOTAL_CREDITS ? "#ff4a4a" : "linear-gradient(90deg, #c7b4ff 0%, #8b5cf6 100%)" }} />
                  </div>
                  <div className="flex flex-col gap-2">
                    {q.choices.map((c, ci) => {
                      const val = credits[qi]?.[ci] ?? 0;
                      return (
                        <div key={ci} className="flex items-center gap-3 px-4 py-3 rounded-2xl border" style={{ background: val > 0 ? "#c7b4ff10" : "#ffffff06", borderColor: val > 0 ? "#c7b4ff30" : "#ffffff0d" }}>
                          <span className="[font-family:'Inter',Helvetica] text-sm flex-1 text-[#d4e9f3cc]">{getText(c.title)}</span>
                          <div className="flex items-center gap-2">
                            <button
                              data-testid={`button-qv-minus-q${qi}-c${ci}`}
                              onClick={() => setCredits(prev => ({ ...prev, [qi]: { ...(prev[qi] || {}), [ci]: Math.max(0, (prev[qi]?.[ci] ?? 0) - 1) } }))}
                              className="w-7 h-7 rounded-full flex items-center justify-center transition-colors text-[15px]"
                              style={{ background: "#ffffff10", color: "#d4e9f3" }}
                            >-</button>
                            <span className="w-6 text-center [font-family:'Inter',Helvetica] text-sm font-bold" style={{ color: "#c7b4ff" }}>{val}</span>
                            <button
                              data-testid={`button-qv-plus-q${qi}-c${ci}`}
                              onClick={() => {
                                const newVal = (credits[qi]?.[ci] ?? 0) + 1;
                                const otherCost = Object.entries(credits[qi] || {}).reduce((s, [k, v]) => parseInt(k) === ci ? s : s + (v * v), 0);
                                if (otherCost + newVal * newVal <= TOTAL_CREDITS) {
                                  setCredits(prev => ({ ...prev, [qi]: { ...(prev[qi] || {}), [ci]: newVal } }));
                                }
                              }}
                              className="w-7 h-7 rounded-full flex items-center justify-center transition-colors text-[15px]"
                              style={{ background: "#ffffff10", color: "#d4e9f3" }}
                            >+</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Error */}
            {phase === "error" && (
              <div className="flex items-start gap-2 p-3 rounded-xl text-xs [font-family:'Inter',Helvetica]" style={{ background: "#ff4a4a15", border: "1px solid #ff4a4a30", color: "#ff8a8a" }}>
                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" /> {errorMsg}
              </div>
            )}

            {/* Strategy hint */}
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-[11px] [font-family:'Inter',Helvetica]" style={{ background: "#ffffff06", border: "1px solid #ffffff0c", color: "#d4e9f355" }}>
              <Info size={12} className="flex-shrink-0 mt-0.5" />
              {strategy === "quadratic"
                ? `Quadratic voting: cost = credits². You have ${TOTAL_CREDITS} credits to distribute.`
                : strategy === "approval"
                ? "Approval voting: approve as many options as you like."
                : "Standard voting: pick exactly one option per question."}
            </div>

            {/* Submit */}
            <button
              onClick={handleVote}
              disabled={!allAnswered}
              data-testid="button-submit-vote"
              className="flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-sm [font-family:'Inter',Helvetica] transition-all disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, #83eef0 0%, #3fb0b3 100%)", color: "#00585a" }}
            >
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
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [options, setOptions] = useState(["Yes", "No", "Abstain"]);

  const defaultStart = () => {
    const d = new Date(); d.setMinutes(d.getMinutes() + 15);
    return d.toISOString().slice(0, 16);
  };
  const defaultEnd = () => {
    const d = new Date(); d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 16);
  };
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [strategy, setStrategy] = useState<VotingStrategy>("standard");
  const [censusMode, setCensusMode] = useState<CensusMode>("open");

  type CreatePhase = "form" | "processing" | "success" | "error";
  type CreateSubStep = "account" | "faucet" | "election";
  const [phase, setPhase] = useState<CreatePhase>("form");
  const [subStep, setSubStep] = useState<CreateSubStep>("account");
  const [needsFaucet, setNeedsFaucet] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [createdId, setCreatedId] = useState("");

  // GitHub import state
  const [ghOwner, setGhOwner] = useState(DEFAULT_GH_OWNER);
  const [ghRepo,  setGhRepo]  = useState(DEFAULT_GH_REPO);
  const [ghItems, setGhItems] = useState<GithubItem[]>([]);
  const [ghLoading, setGhLoading] = useState(false);
  const [ghError, setGhError] = useState("");
  const [ghOpen, setGhOpen] = useState(false);
  const [ghSelected, setGhSelected] = useState<Set<number>>(new Set());
  const [ghFilter, setGhFilter] = useState<"all" | "issue" | "pr">("all");

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
    } catch (err: any) {
      setGhError(err.message || "Failed to load GitHub items");
    } finally { setGhLoading(false); }
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

    setPhase("processing");
    setSubStep("account");
    setNeedsFaucet(false);
    setErrorMsg("");

    try {
      const { VocdoniSDKClient, EnvOptions, Election, ApprovalElection, PlainCensus } = await import("@vocdoni/sdk");

      const eip1193 = await wallet.getEthereumProvider();
      const { ethers } = await import("ethers");
      const provider = new ethers.providers.Web3Provider(eip1193 as any);
      const signer = provider.getSigner();
      const myAddress = await signer.getAddress();
      const env =
        VOCDONI_ENV === "prod" ? EnvOptions.PROD :
        VOCDONI_ENV === "dev"  ? EnvOptions.DEV  : EnvOptions.STG;

      // Step 1: account
      const client = new VocdoniSDKClient({ env, wallet: signer });
      const accountInfo = await client.createAccount();

      // Step 2: faucet if needed
      if (accountInfo.balance === 0 && VOCDONI_ENV !== "prod") {
        setNeedsFaucet(true);
        setSubStep("faucet");
        await client.collectFaucetTokens();
      }

      // Step 3: create election
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
        title: title.trim(),
        description: description.trim(),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        census,
        electionType: { interruptible: true, dynamicCensus: true },
        voteType: voteTypeMeta,
        meta: { votingStrategy: strategy, censusMode },
      } as any;

      let electionObj: any;
      if (strategy === "approval") {
        electionObj = ApprovalElection.from(electionParams);
      } else {
        electionObj = Election.from(electionParams);
      }
      electionObj.addQuestion(title.trim(), description.trim(), cleanOptions);

      const electionId = await client.createElection(electionObj);
      setCreatedId(electionId || "");
      setPhase("success");
      setTimeout(() => { onCreated(); onClose(); }, 3500);
    } catch (err: any) {
      console.error("[governance create]", err);
      setErrorMsg(err?.message?.slice(0, 240) || "Failed to create proposal.");
      setPhase("error");
    }
  }

  const createStepStates = (s: CreateSubStep): "waiting" | "active" | "done" => {
    const order: CreateSubStep[] = needsFaucet ? ["account", "faucet", "election"] : ["account", "election"];
    const cur = order.indexOf(subStep);
    const idx = order.indexOf(s);
    if (idx < cur) return "done";
    if (idx === cur) return "active";
    return "waiting";
  };

  const processingSteps = [
    { label: "Setting up voting account", state: createStepStates("account") },
    { label: "Collecting voting tokens", state: needsFaucet ? createStepStates("faucet") : ("skip" as const) },
    { label: "Publishing election to Vocdoni chain", state: createStepStates("election") },
  ];

  const now15 = new Date(); now15.setMinutes(now15.getMinutes() + 15);
  const filteredGhItems = ghFilter === "all" ? ghItems : ghItems.filter(i => i.type === ghFilter);

  const STRATEGIES: { key: VotingStrategy; label: string; desc: string; Icon: any; color: string }[] = [
    { key: "standard",  label: "Standard",  desc: "One choice per voter",           Icon: Vote,        color: "#83eef0" },
    { key: "approval",  label: "Approval",  desc: "Approve multiple options",        Icon: CheckSquare, color: "#A6CE39" },
    { key: "quadratic", label: "Quadratic", desc: "Distribute credits (cost = c²)", Icon: BarChart,    color: "#c7b4ff" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:px-4 sm:py-8 overflow-y-auto" onClick={phase === "processing" ? undefined : onClose}>
      <div className="absolute inset-0" style={{ background: "rgba(0,8,12,0.85)" }} />
      <div
        className="relative w-full sm:max-w-lg rounded-t-[28px] sm:rounded-[28px] border-t sm:border border-[#83eef030] p-5 sm:p-6 flex flex-col gap-5 max-h-[92vh] overflow-y-auto"
        style={{ background: "#00131a" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="sm:hidden w-10 h-1 rounded-full bg-[#ffffff20] mx-auto -mt-1 mb-1" />

        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-bold text-[#d4e9f3] text-lg">New Proposal</h2>
          <button
            onClick={onClose}
            disabled={phase === "processing"}
            className="text-[#d4e9f344] hover:text-[#d4e9f3] transition-colors disabled:opacity-30"
          >
            <XCircle size={20} />
          </button>
        </div>

        {/* Processing steps */}
        {phase === "processing" && (
          <div className="py-2">
            <p className="[font-family:'Inter',Helvetica] text-[#9aaeb8] text-xs mb-4">Publishing your proposal on-chain. This may take a minute.</p>
            <StepStepper steps={processingSteps} />
          </div>
        )}

        {/* Success */}
        {phase === "success" && (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "#83eef018", border: "1px solid #83eef040" }}>
              <CheckCircle2 size={30} className="text-[#83eef0]" />
            </div>
            <p className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-bold text-[#d4e9f3] text-lg">Proposal created!</p>
            <p className="[font-family:'Inter',Helvetica] text-[#9aaeb8] text-sm max-w-xs">
              Your election has been published to the Vocdoni chain. It will appear in the list shortly.
            </p>
            {createdId && (
              <a
                href={`https://app.vocdoni.io/processes/show/#/${createdId}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs [font-family:'Inter',Helvetica] font-semibold no-underline"
                style={{ color: "#83eef0" }}
              >
                <ExternalLink size={11} /> View on Vocdoni Explorer
              </a>
            )}
          </div>
        )}

        {/* Form (shown in form + error phases) */}
        {(phase === "form" || phase === "error") && (
          <>
            {/* Voting strategy */}
            <div className="flex flex-col gap-2">
              <label className="[font-family:'Inter',Helvetica] text-xs font-semibold text-[#d4e9f380]">Voting Strategy</label>
              <div className="grid grid-cols-3 gap-2">
                {STRATEGIES.map(s => {
                  const active = strategy === s.key;
                  return (
                    <button
                      key={s.key}
                      data-testid={`button-strategy-${s.key}`}
                      onClick={() => setStrategy(s.key)}
                      className="flex flex-col items-center gap-1.5 px-2 py-3 rounded-2xl border transition-all"
                      style={{ background: active ? `${s.color}12` : "#ffffff06", borderColor: active ? `${s.color}50` : "#ffffff10" }}
                    >
                      <s.Icon size={16} style={{ color: active ? s.color : "#d4e9f344" }} />
                      <span className="[font-family:'Inter',Helvetica] text-xs font-semibold" style={{ color: active ? s.color : "#d4e9f380" }}>{s.label}</span>
                      <span className="[font-family:'Inter',Helvetica] text-[9px] text-center leading-tight" style={{ color: active ? `${s.color}aa` : "#d4e9f333" }}>{s.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Census mode */}
            <div className="flex flex-col gap-2">
              <label className="[font-family:'Inter',Helvetica] text-xs font-semibold text-[#d4e9f380]">Census (who can vote)</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: "open" as CensusMode, label: "Open Wallet", desc: "Any EVM wallet can be added", color: "#83eef0" },
                  { key: "base-members" as CensusMode, label: "Base Network", desc: "DAO members on Base chain", color: "#2151f5" },
                ].map(c => {
                  const active = censusMode === c.key;
                  return (
                    <button
                      key={c.key}
                      data-testid={`button-census-${c.key}`}
                      onClick={() => setCensusMode(c.key)}
                      className="flex flex-col items-start gap-1 px-4 py-3 rounded-2xl border transition-all text-left"
                      style={{ background: active ? `${c.color}12` : "#ffffff06", borderColor: active ? `${c.color}50` : "#ffffff10" }}
                    >
                      <span className="[font-family:'Inter',Helvetica] text-xs font-semibold" style={{ color: active ? c.color : "#d4e9f380" }}>{c.label}</span>
                      <span className="[font-family:'Inter',Helvetica] text-[10px]" style={{ color: active ? `${c.color}99` : "#d4e9f333" }}>{c.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Title */}
            <div className="flex flex-col gap-1.5">
              <label className="[font-family:'Inter',Helvetica] text-xs font-semibold text-[#d4e9f380]">Title</label>
              <input
                value={title} onChange={e => setTitle(e.target.value)}
                placeholder="Proposal title…" data-testid="input-proposal-title" maxLength={200}
                className="px-4 py-2.5 rounded-xl text-sm [font-family:'Inter',Helvetica] text-[#d4e9f3] placeholder-[#d4e9f333] outline-none"
                style={{ background: "#ffffff08", border: "1px solid #ffffff12" }}
              />
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <label className="[font-family:'Inter',Helvetica] text-xs font-semibold text-[#d4e9f380]">Description</label>
              <textarea
                value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Describe the proposal…" data-testid="input-proposal-description"
                rows={3} maxLength={2000}
                className="px-4 py-2.5 rounded-xl text-sm [font-family:'Inter',Helvetica] text-[#d4e9f3] placeholder-[#d4e9f333] outline-none resize-none"
                style={{ background: "#ffffff08", border: "1px solid #ffffff12" }}
              />
            </div>

            {/* Voting options */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="[font-family:'Inter',Helvetica] text-xs font-semibold text-[#d4e9f380]">Voting Options</label>
                <button
                  data-testid="button-import-github"
                  onClick={() => { setGhOpen(!ghOpen); if (!ghOpen && ghItems.length === 0) loadGithub(); }}
                  className="flex items-center gap-1.5 text-[10px] [font-family:'Inter',Helvetica] font-semibold px-3 py-1.5 rounded-full transition-all"
                  style={{ color: "#d4e9f380", background: "#ffffff08", border: "1px solid #ffffff12" }}
                >
                  <Github size={11} /> Import from GitHub
                </button>
              </div>

              {/* GitHub import panel */}
              {ghOpen && (
                <div className="flex flex-col gap-3 p-4 rounded-2xl" style={{ background: "#ffffff06", border: "1px solid #ffffff10" }}>
                  <div className="flex gap-2">
                    <input
                      value={ghOwner} onChange={e => setGhOwner(e.target.value)}
                      placeholder="owner" data-testid="input-gh-owner"
                      className="flex-1 px-3 py-2 rounded-xl text-xs [font-family:'Inter',Helvetica] text-[#d4e9f3] placeholder-[#d4e9f333] outline-none"
                      style={{ background: "#ffffff08", border: "1px solid #ffffff12" }}
                    />
                    <span className="text-[#d4e9f344] self-center">/</span>
                    <input
                      value={ghRepo} onChange={e => setGhRepo(e.target.value)}
                      placeholder="repo" data-testid="input-gh-repo"
                      className="flex-1 px-3 py-2 rounded-xl text-xs [font-family:'Inter',Helvetica] text-[#d4e9f3] placeholder-[#d4e9f333] outline-none"
                      style={{ background: "#ffffff08", border: "1px solid #ffffff12" }}
                    />
                    <button
                      onClick={loadGithub} disabled={ghLoading} data-testid="button-gh-load"
                      className="px-3 py-2 rounded-xl text-xs [font-family:'Inter',Helvetica] font-semibold transition-all disabled:opacity-50"
                      style={{ background: "#83eef015", border: "1px solid #83eef030", color: "#83eef0" }}
                    >
                      {ghLoading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                    </button>
                  </div>
                  {ghError && <p className="text-xs [font-family:'Inter',Helvetica]" style={{ color: "#ff8a8a" }}>{ghError}</p>}
                  {ghItems.length > 0 && (
                    <>
                      <div className="flex gap-2">
                        {(["all", "issue", "pr"] as const).map(f => (
                          <button key={f} onClick={() => setGhFilter(f)}
                            className="px-2.5 py-1 rounded-full text-[10px] [font-family:'Inter',Helvetica] font-semibold transition-all capitalize"
                            style={{ background: ghFilter === f ? "#83eef020" : "transparent", border: `1px solid ${ghFilter === f ? "#83eef050" : "#ffffff15"}`, color: ghFilter === f ? "#83eef0" : "#d4e9f366" }}
                          >
                            {f === "pr" ? "Pull Requests" : f === "issue" ? "Issues" : "All"}
                          </button>
                        ))}
                      </div>
                      <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
                        {filteredGhItems.map((item) => {
                          const realIdx = ghItems.indexOf(item);
                          const checked = ghSelected.has(realIdx);
                          return (
                            <button
                              key={item.number}
                              data-testid={`button-gh-item-${item.number}`}
                              onClick={() => setGhSelected(prev => { const s = new Set(prev); if (s.has(realIdx)) s.delete(realIdx); else s.add(realIdx); return s; })}
                              className="flex items-start gap-2.5 px-3 py-2 rounded-xl border text-left transition-all"
                              style={{ background: checked ? "#83eef010" : "transparent", borderColor: checked ? "#83eef030" : "#ffffff08", color: "#d4e9f3cc" }}
                            >
                              <div className="w-3.5 h-3.5 rounded border flex-shrink-0 mt-0.5 flex items-center justify-center" style={{ borderColor: checked ? "#83eef0" : "#ffffff30" }}>
                                {checked && <div className="w-2 h-2 rounded-sm" style={{ background: "#83eef0" }} />}
                              </div>
                              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                {item.type === "pr" ? <GitPullRequest size={11} className="text-[#A6CE39] flex-shrink-0 mt-0.5" /> : <CircleDot size={11} className="text-[#83eef0] flex-shrink-0 mt-0.5" />}
                                <span className="[font-family:'Inter',Helvetica] text-xs truncate">
                                  <span className="text-[#d4e9f344]">#{item.number}</span> {item.title}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      {ghSelected.size > 0 && (
                        <button onClick={importSelected} data-testid="button-gh-import-selected"
                          className="flex items-center gap-1.5 justify-center py-2 rounded-xl text-xs [font-family:'Inter',Helvetica] font-semibold transition-all"
                          style={{ background: "#83eef018", border: "1px solid #83eef033", color: "#83eef0" }}
                        >
                          <Plus size={12} /> Add {ghSelected.size} selected as options
                        </button>
                      )}
                      {filteredGhItems.length === 0 && (
                        <p className="text-xs [font-family:'Inter',Helvetica] text-center py-3" style={{ color: "#d4e9f344" }}>
                          No open {ghFilter !== "all" ? ghFilter + "s" : "items"} found
                        </p>
                      )}
                    </>
                  )}
                  {!ghLoading && ghItems.length === 0 && !ghError && (
                    <p className="text-xs [font-family:'Inter',Helvetica] text-center py-2" style={{ color: "#d4e9f344" }}>
                      Click refresh to load items from {ghOwner}/{ghRepo}
                    </p>
                  )}
                </div>
              )}

              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={opt} onChange={e => setOption(i, e.target.value)}
                    placeholder={`Option ${i + 1}`} data-testid={`input-option-${i}`} maxLength={100}
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm [font-family:'Inter',Helvetica] text-[#d4e9f3] placeholder-[#d4e9f333] outline-none"
                    style={{ background: "#ffffff08", border: "1px solid #ffffff12" }}
                  />
                  {options.length > 2 && (
                    <button onClick={() => removeOption(i)} data-testid={`button-remove-option-${i}`} className="text-[#ff4a4a66] hover:text-[#ff4a4a] transition-colors">
                      <XCircle size={16} />
                    </button>
                  )}
                </div>
              ))}
              {options.length < 10 && (
                <button onClick={addOption} data-testid="button-add-option"
                  className="flex items-center gap-1.5 text-xs [font-family:'Inter',Helvetica] text-[#83eef066] hover:text-[#83eef0] transition-colors self-start"
                >
                  <Plus size={12} /> Add option
                </button>
              )}
            </div>

            {/* Start + End dates */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="[font-family:'Inter',Helvetica] text-xs font-semibold text-[#d4e9f380]">Starts</label>
                <input
                  type="datetime-local" value={startDate}
                  min={now15.toISOString().slice(0, 16)}
                  onChange={e => setStartDate(e.target.value)} data-testid="input-start-date"
                  className="px-3 py-2.5 rounded-xl text-xs [font-family:'Inter',Helvetica] text-[#d4e9f3] outline-none"
                  style={{ background: "#ffffff08", border: "1px solid #ffffff12", colorScheme: "dark" }}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="[font-family:'Inter',Helvetica] text-xs font-semibold text-[#d4e9f380]">Ends</label>
                <input
                  type="datetime-local" value={endDate}
                  min={startDate || now15.toISOString().slice(0, 16)}
                  onChange={e => setEndDate(e.target.value)} data-testid="input-end-date"
                  className="px-3 py-2.5 rounded-xl text-xs [font-family:'Inter',Helvetica] text-[#d4e9f3] outline-none"
                  style={{ background: "#ffffff08", border: "1px solid #ffffff12", colorScheme: "dark" }}
                />
              </div>
            </div>

            {/* Info banner */}
            <div className="flex items-start gap-2 p-3 rounded-xl text-[11px] [font-family:'Inter',Helvetica]" style={{ background: "#A6CE3910", border: "1px solid #A6CE3925", color: "#A6CE39cc" }}>
              <Info size={12} className="flex-shrink-0 mt-0.5" />
              <span>
                {strategy === "quadratic"
                  ? "Quadratic voting: cost = credits². Each voter gets 25 credits."
                  : strategy === "approval"
                  ? "Approval voting: voters approve as many options as they like."
                  : "Standard voting: each voter picks one option."}
                {censusMode === "base-members" && " Census uses Base network wallets (dynamic)."}
                {VOCDONI_ENV !== "prod" && " Staging faucet tokens are collected automatically."}
              </span>
            </div>

            {/* Error */}
            {phase === "error" && (
              <div className="flex items-start gap-2 p-3 rounded-xl text-xs [font-family:'Inter',Helvetica]" style={{ background: "#ff4a4a15", border: "1px solid #ff4a4a30", color: "#ff8a8a" }}>
                <AlertCircle size={13} className="flex-shrink-0 mt-0.5" /> {errorMsg}
              </div>
            )}

            <button
              onClick={handleCreate}
              disabled={!title.trim() || options.filter(o => o.trim()).length < 2}
              data-testid="button-create-proposal"
              className="flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-sm [font-family:'Inter',Helvetica] transition-all disabled:opacity-40"
              style={{ background: "linear-gradient(135deg, #83eef0 0%, #3fb0b3 100%)", color: "#00585a" }}
            >
              <Plus size={15} /> Create Proposal
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
  const MODES = [
    {
      icon: "✅",
      name: "Standard",
      desc: "One person, one vote. The option with the most votes wins.",
    },
    {
      icon: "🗳️",
      name: "Approval",
      desc: "Vote for as many options as you support. Results show total approvals per option.",
    },
    {
      icon: "⚡",
      name: "Quadratic",
      desc: "Allocate voting credits. Doubling impact costs 4× the credits — rewards broad consensus.",
    },
  ];
  return (
    <div
      className="mb-3 rounded-[16px] border border-[#83eef015] overflow-hidden"
      style={{ background: "rgba(0,8,12,0.5)" }}
    >
      <button
        onClick={() => setOpen(o => !o)}
        data-testid="button-how-voting-works"
        className="w-full flex items-center gap-2.5 px-4 py-3 text-left hover:bg-[#83eef006] transition-colors"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="#83eef066" strokeWidth="1.8"/>
          <path d="M12 8v4M12 16h.01" stroke="#83eef066" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        <span className="flex-1 text-xs [font-family:'Inter',Helvetica] text-[#d4e9f366] font-medium">How voting works</span>
        <svg
          width="13" height="13" viewBox="0 0 24 24" fill="none"
          className="text-[#d4e9f330] transition-transform"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && (
        <div className="px-4 pb-4 flex flex-col gap-3">
          <div className="h-px bg-[#83eef010]" />
          <p className="text-[11px] text-[#d4e9f350] [font-family:'Inter',Helvetica] leading-relaxed">
            MesoReef DAO votes are recorded on-chain via{" "}
            <a href="https://vocdoni.io" target="_blank" rel="noopener noreferrer" className="text-[#83eef0] no-underline font-semibold">Vocdoni</a>
            {" "}— a censorship-resistant, gasless governance protocol. Proposals support three voting strategies:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {MODES.map(m => (
              <div
                key={m.name}
                className="flex flex-col gap-1.5 p-3 rounded-[12px]"
                style={{ background: "rgba(131,238,240,0.04)", border: "1px solid rgba(131,238,240,0.1)" }}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-base">{m.icon}</span>
                  <span className="text-xs font-bold text-[#d4e9f3cc] [font-family:'Plus_Jakarta_Sans',Helvetica]">{m.name}</span>
                </div>
                <p className="text-[10.5px] text-[#d4e9f355] [font-family:'Inter',Helvetica] leading-relaxed">{m.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-[#d4e9f330] [font-family:'Inter',Helvetica]">
            You must be signed in to vote. A connected wallet may be required for some proposals.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export function Governance() {
  const { authenticated, login } = usePrivy();
  const { orcidAuthenticated } = useOrcidAuth();
  const { wallets } = useWallets();
  const isAuthed = authenticated || orcidAuthenticated;

  const [elections, setElections] = useState<VocdoniElection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "ended">("all");
  const [stratFilter, setStratFilter] = useState<VotingStrategy | "all">("all");
  const [voteTarget, setVoteTarget] = useState<VocdoniElection | null>(null);
  const [voted, setVoted] = useState<Record<string, boolean>>({});
  const [createOpen, setCreateOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  // Org address comes from the server — no need for VITE_ env var
  const [orgAddress, setOrgAddress] = useState<string>("");
  const [configLoaded, setConfigLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/governance/info")
      .then(r => r.json())
      .then((d: { orgAddress: string; env: string; configured: boolean }) => {
        setOrgAddress(d.orgAddress || "");
      })
      .catch(() => {})
      .finally(() => setConfigLoaded(true));
  }, []);

  const fetchElections = useCallback(async (pageNum = 0) => {
    if (!configLoaded) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/governance/elections?page=${pageNum}&limit=20`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `Server error ${res.status}`);
      const list: VocdoniElection[] = data.elections ?? [];

      // Fetch full details for each election (choices, results, etc.)
      const detailed = await Promise.allSettled(
        list.map(async (e) => {
          const r = await fetch(`/api/governance/elections/${e.electionId}`);
          return r.ok ? (r.json() as Promise<VocdoniElection>) : e;
        })
      );
      const full = detailed.map((r, i) => r.status === "fulfilled" ? r.value : list[i]);
      setElections(prev => pageNum === 0 ? full : [...prev, ...full]);
      setHasMore(!!data.hasMore);
    } catch (err: any) {
      console.error("[governance fetch]", err);
      setError(err.message || "Failed to load proposals.");
    } finally { setLoading(false); }
  }, [configLoaded]);

  useEffect(() => {
    if (configLoaded) fetchElections(0);
  }, [configLoaded, fetchElections]);

  const filtered = elections.filter(e => {
    if (filter === "active" && e.status?.toUpperCase() !== "ONGOING") return false;
    if (filter === "ended" && e.status?.toUpperCase() !== "ENDED") return false;
    if (stratFilter !== "all" && strategyFromMeta(e.meta) !== stratFilter) return false;
    return true;
  });

  const FILTER_TABS = [
    { key: "all" as const, label: "All" },
    { key: "active" as const, label: "Active" },
    { key: "ended" as const, label: "Ended" },
  ];
  const STRAT_TABS: { key: VotingStrategy | "all"; label: string }[] = [
    { key: "all", label: "Any" },
    { key: "standard", label: "Standard" },
    { key: "approval", label: "Approval" },
    { key: "quadratic", label: "Quadratic" },
  ];

  return (
    <div
      className="min-h-screen w-full"
      style={{ backgroundImage: `url(${coralBg})`, backgroundSize: "cover", backgroundPosition: "center", backgroundAttachment: "fixed", position: "relative" }}
    >
      {/* Overlay */}
      <div style={{ position: "fixed", inset: 0, background: "linear-gradient(180deg, rgba(0,8,12,0.88) 0%, rgba(0,19,28,0.80) 40%, rgba(0,8,12,0.94) 100%)", zIndex: 0, pointerEvents: "none" }} />

      <div style={{ position: "relative", zIndex: 1 }}>

        {/* ── Mobile top bar ───────────────────────────────────────────── */}
        <div className="flex items-center px-3 py-2 border-b border-[#ffffff08] md:hidden">
          <Link
            href="/"
            data-testid="link-back-home-governance"
            className="flex items-center justify-center w-10 h-10 rounded-full bg-[#ffffff06] border border-[#ffffff0d] text-[#d4e9f380] no-underline active:bg-[#ffffff10] transition-colors"
          >
            <ArrowLeft size={16} />
          </Link>
          <div className="flex-1 flex items-center justify-center gap-1.5">
            <Vote size={15} className="text-[#83eef0]" />
            <span className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-bold text-[#d4e9f3] text-[15px]">Governance</span>
          </div>
          {/* Spacer to balance the back button */}
          <div className="w-10" />
        </div>

        {/* ── Desktop top bar ──────────────────────────────────────────── */}
        <div className="hidden md:flex items-center gap-4 px-6 py-4 border-b border-[#ffffff08]">
          <Link href="/" data-testid="link-back-home-governance-desktop" className="flex items-center gap-2 text-[#d4e9f380] hover:text-[#d4e9f3] transition-colors no-underline">
            <ArrowLeft size={16} />
            <span className="[font-family:'Inter',Helvetica] text-sm">Back</span>
          </Link>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <Vote size={16} className="text-[#83eef0]" />
            <span className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-bold text-[#d4e9f3] text-base">Governance</span>
          </div>
          <div className="flex-1" />
          {authenticated && wallets.length > 0 && (
            <button
              onClick={() => setCreateOpen(true)} data-testid="button-new-proposal-desktop"
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs [font-family:'Inter',Helvetica] font-semibold transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #83eef0 0%, #3fb0b3 100%)", color: "#00585a" }}
            >
              <Plus size={13} /> New Proposal
            </button>
          )}
        </div>

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        {/* Mobile: minimal compact strip */}
        <div className="md:hidden px-4 pt-4 pb-3 text-center">
          <p className="[font-family:'Inter',Helvetica] text-[#9aaeb880] text-xs leading-relaxed">
            Vote on proposals that shape reef conservation.
          </p>
          {!isAuthed && (
            <button
              onClick={() => { try { login(); } catch { } }}
              data-testid="button-login-governance"
              className="mt-3 flex items-center justify-center gap-2 w-full px-5 py-3 rounded-2xl text-sm [font-family:'Inter',Helvetica] font-semibold active:opacity-80"
              style={{ background: "linear-gradient(170deg, #83eef0 0%, #3fb0b3 100%)", color: "#00585a" }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3" stroke="#00585a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Sign in to participate
            </button>
          )}
        </div>

        {/* Desktop: full hero */}
        <div className="hidden md:flex flex-col items-center gap-2 px-6 pt-8 pb-6 text-center">
          <div className="flex items-center gap-2.5">
            <Vote size={22} className="text-[#83eef0]" />
            <h1 className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-extrabold text-[#d4e9f3] text-2xl">
              MesoReef DAO Governance
            </h1>
          </div>
          <p className="[font-family:'Inter',Helvetica] text-[#9aaeb8] text-sm max-w-md">
            Vote on proposals shaping reef conservation. Powered by Vocdoni with standard, approval, and quadratic voting.
          </p>
          {!isAuthed && (
            <div className="mt-2 px-4 py-2 rounded-full" style={{ background: "#83eef010", border: "1px solid #83eef033" }}>
              <span className="[font-family:'Inter',Helvetica] text-[#83eef0] text-xs">
                Sign in and connect a wallet to participate in governance
              </span>
            </div>
          )}
        </div>

        {/* ── Content ──────────────────────────────────────────────────── */}
        <div className="max-w-3xl mx-auto px-3 md:px-4 pb-32 md:pb-16">
          {/* Show skeleton while config is loading */}
          {!configLoaded ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mt-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-44 rounded-[20px] animate-pulse" style={{ background: "#00080c80", border: "1px solid #ffffff06" }} />
              ))}
            </div>
          ) : !orgAddress ? (
            <div className="flex flex-col items-center gap-5 py-24 text-center">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #83eef015 0%, #3fb0b315 100%)", border: "1px solid #83eef030" }}
              >
                <Vote size={36} className="text-[#83eef060]" />
              </div>
              <div className="flex flex-col gap-2">
                <h2 className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-bold text-[#d4e9f3] text-xl">
                  DAO Governance Coming Soon
                </h2>
                <p className="[font-family:'Inter',Helvetica] text-[#9aaeb8] text-sm max-w-sm leading-relaxed">
                  MesoReef DAO governance is powered by{" "}
                  <a href="https://vocdoni.io" target="_blank" rel="noopener noreferrer" className="text-[#83eef0] font-semibold no-underline">Vocdoni</a>
                  {" "}— gasless, censorship-resistant on-chain voting. Proposals will appear here once the DAO is live on Base.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 mt-2">
                <a
                  href="https://vocdoni.io"
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs [font-family:'Inter',Helvetica] font-semibold no-underline transition-all hover:opacity-80"
                  style={{ background: "#83eef020", border: "1px solid #83eef040", color: "#83eef0" }}
                >
                  <ExternalLink size={11} /> Vocdoni Protocol
                </a>
                <a
                  href="https://app.vocdoni.io"
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs [font-family:'Inter',Helvetica] font-semibold no-underline transition-all hover:opacity-80"
                  style={{ background: "#ffffff08", border: "1px solid #ffffff18", color: "#d4e9f380" }}
                >
                  <ExternalLink size={11} /> Vocdoni App
                </a>
              </div>
              <HowVotingWorks />
            </div>
          ) : (
            <>
              {/* ── How Voting Works collapsible ── */}
              <HowVotingWorks />

              {/* ── Filter bar: horizontally scrollable on mobile ── */}
              <div className="flex gap-2 overflow-x-auto pb-1 mb-2" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
                {FILTER_TABS.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setFilter(tab.key)}
                    data-testid={`button-filter-${tab.key}`}
                    className="flex-none px-4 py-2 rounded-full text-xs [font-family:'Inter',Helvetica] font-semibold transition-all"
                    style={{ background: filter === tab.key ? "#83eef020" : "transparent", border: `1px solid ${filter === tab.key ? "#83eef050" : "#ffffff15"}`, color: filter === tab.key ? "#83eef0" : "#d4e9f366" }}
                  >
                    {tab.label}
                  </button>
                ))}
                <div className="flex-none w-px mx-1 self-stretch bg-[#ffffff10]" />
                {STRAT_TABS.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setStratFilter(tab.key)}
                    data-testid={`button-strat-filter-${tab.key}`}
                    className="flex-none px-3 py-2 rounded-full text-[10px] [font-family:'Inter',Helvetica] font-semibold transition-all"
                    style={{ background: stratFilter === tab.key ? "#ffffff15" : "transparent", border: `1px solid ${stratFilter === tab.key ? "#ffffff30" : "#ffffff10"}`, color: stratFilter === tab.key ? "#d4e9f3" : "#d4e9f344" }}
                  >
                    {tab.label}
                  </button>
                ))}
                {!loading && (
                  <span className="flex-none self-center ml-auto pl-2 [font-family:'Inter',Helvetica] text-[#d4e9f333] text-[10px] whitespace-nowrap">
                    {filtered.length} proposal{filtered.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {/* ── Loading skeletons ── */}
              {loading && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mt-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-44 rounded-[20px] animate-pulse" style={{ background: "#00080c80", border: "1px solid #ffffff06" }} />
                  ))}
                </div>
              )}

              {/* ── Error state ── */}
              {!loading && error && (
                <div className="flex flex-col items-center gap-3 py-16 text-center">
                  <AlertCircle size={32} className="text-[#ff4a4a50]" />
                  <p className="[font-family:'Inter',Helvetica] text-[#ff8a8a] text-sm">{error}</p>
                  <button onClick={() => fetchElections(0)} className="text-[#83eef0] text-xs [font-family:'Inter',Helvetica] underline">Try again</button>
                </div>
              )}

              {/* ── Empty state ── */}
              {!loading && !error && filtered.length === 0 && (
                <div className="flex flex-col items-center gap-3 py-16 text-center">
                  <BarChart2 size={36} className="text-[#d4e9f322]" />
                  <span className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-bold text-[#d4e9f366] text-base">No proposals yet</span>
                  <span className="[font-family:'Inter',Helvetica] text-[#d4e9f344] text-sm max-w-xs">
                    {authenticated && wallets.length > 0
                      ? "Create the first governance proposal."
                      : "Connect a wallet to create one."}
                  </span>
                </div>
              )}

              {/* ── Proposal cards ── */}
              {!loading && !error && filtered.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mt-3">
                  {filtered.map(e => (
                    <ProposalCard key={e.electionId} election={e} onVote={setVoteTarget} voted={!!voted[e.electionId]} />
                  ))}
                </div>
              )}

              {/* ── Load more ── */}
              {hasMore && !loading && (
                <div className="flex justify-center mt-5">
                  <button
                    onClick={() => { const next = page + 1; setPage(next); fetchElections(next); }}
                    data-testid="button-load-more"
                    className="px-6 py-2.5 rounded-full text-xs [font-family:'Inter',Helvetica] font-semibold transition-all"
                    style={{ border: "1px solid #83eef030", color: "#83eef0", background: "#83eef010" }}
                  >
                    Load more
                  </button>
                </div>
              )}

              {/* ── Footer ── */}
              <div className="flex items-center justify-center gap-3 mt-8 pb-2 opacity-40">
                <span className="[font-family:'Inter',Helvetica] text-[#d4e9f3] text-[10px]">Powered by</span>
                <a href="https://vocdoni.io" target="_blank" rel="noopener noreferrer" className="[font-family:'Inter',Helvetica] text-[#83eef0] text-[10px] font-semibold no-underline">Vocdoni</a>
                <span className="text-[#ffffff20]">·</span>
                <a href={`https://github.com/${DEFAULT_GH_OWNER}/${DEFAULT_GH_REPO}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 [font-family:'Inter',Helvetica] text-[#d4e9f380] text-[10px] no-underline">
                  <Github size={9} /> {DEFAULT_GH_OWNER}/{DEFAULT_GH_REPO}
                </a>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Mobile FAB: New Proposal ─────────────────────────────────── */}
      {authenticated && wallets.length > 0 && (
        <button
          onClick={() => setCreateOpen(true)}
          data-testid="button-new-proposal"
          aria-label="New Proposal"
          className="md:hidden fixed bottom-[88px] right-4 z-20 w-14 h-14 rounded-full flex items-center justify-center shadow-[0_4px_24px_rgba(131,238,240,0.35)] active:opacity-80 transition-all"
          style={{ background: "linear-gradient(135deg, #83eef0 0%, #3fb0b3 100%)" }}
        >
          <Plus size={22} style={{ color: "#00585a" }} />
        </button>
      )}

      {/* ── Modals ───────────────────────────────────────────────────── */}
      {voteTarget && (
        <VoteModal
          election={voteTarget} onClose={() => setVoteTarget(null)}
          onSuccess={() => { setVoted(prev => ({ ...prev, [voteTarget.electionId]: true })); fetchElections(0); }}
        />
      )}
      {createOpen && (
        <CreateModal orgAddress={orgAddress} onClose={() => setCreateOpen(false)} onCreated={() => fetchElections(0)} />
      )}

      <MobileBottomNav />
    </div>
  );
}
