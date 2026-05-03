import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";
import { useOrcidAuth } from "@/hooks/use-orcid-auth";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { Contribution } from "@shared/schema";

// ─── Helpers ───────────────────────────────────────────────────────────────────
function todayEpochStart() {
  return Math.floor(new Date().setHours(0, 0, 0, 0) / 1000);
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(131,238,240,0.1)" }}>
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{
          width: `${pct}%`,
          background: "linear-gradient(90deg, #83eef0 0%, #a6ce39 100%)",
        }}
      />
    </div>
  );
}

interface JourneyItem {
  done: boolean;
  label: string;
  detail?: string;
  action?: React.ReactNode;
  pts: number;
  emoji: string;
  daily?: boolean;
}

function JourneyRow({ item }: { item: JourneyItem }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[10px]"
        style={{
          background: item.done
            ? item.daily ? "rgba(166,206,57,0.12)" : "rgba(131,238,240,0.12)"
            : "rgba(255,255,255,0.04)",
          border: item.done
            ? item.daily ? "1.5px solid rgba(166,206,57,0.35)" : "1.5px solid rgba(131,238,240,0.35)"
            : "1.5px solid rgba(255,255,255,0.1)",
        }}
      >
        {item.done ? (
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
            <path d="M20 6L9 17l-5-5" stroke={item.daily ? "#a6ce39" : "#83eef0"} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <span style={{ fontSize: 9 }}>{item.emoji}</span>
        )}
      </div>

      <span
        className="flex-1 text-xs [font-family:'Inter',Helvetica] leading-relaxed"
        style={{ color: item.done ? "rgba(212,233,243,0.38)" : "rgba(212,233,243,0.85)" }}
      >
        {item.done ? <s>{item.label}</s> : item.label}
        {!item.done && item.detail && (
          <span className="block text-[9px]" style={{ color: "rgba(212,233,243,0.35)" }}>
            {item.detail}
          </span>
        )}
      </span>

      {!item.done && item.action}
      <span
        className="text-[10px] font-semibold whitespace-nowrap [font-family:'Plus_Jakarta_Sans',Helvetica]"
        style={{ color: item.done ? "rgba(131,238,240,0.2)" : "rgba(131,238,240,0.55)" }}
      >
        {item.done ? "✓" : `+${item.pts}`}
      </span>
    </div>
  );
}

// ─── Point legend row ──────────────────────────────────────────────────────────
function LegendItem({ emoji, label, pts, color = "#83eef0" }: { emoji: string; label: string; pts: number; color?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px]">{emoji}</span>
      <span className="flex-1 text-[10px] [font-family:'Inter',Helvetica]" style={{ color: "rgba(212,233,243,0.55)" }}>{label}</span>
      <span className="text-[10px] font-semibold [font-family:'Plus_Jakarta_Sans',Helvetica]" style={{ color }}>+{pts} pts</span>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export function JourneySection({ className }: { className?: string }) {
  const [collapsed, setCollapsed] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const { authenticated: privyAuthenticated, user } = usePrivy();
  const { orcidAuthenticated, orcidProfileId } = useOrcidAuth();
  const isAuthed = privyAuthenticated || orcidAuthenticated;

  const activeProfileId = orcidAuthenticated && !privyAuthenticated
    ? orcidProfileId
    : user?.id;

  const { data } = useQuery<any>({
    queryKey: ["/api/profiles", activeProfileId],
    enabled: isAuthed && !!activeProfileId,
  });

  const profile = data?.profile;
  const contributions: Contribution[] = data?.contributions ?? [];

  if (!isAuthed || !profile) return null;

  const today = todayEpochStart();
  const hasType = (type: string) => contributions.some(c => c.type === type);
  const hasDailyType = (type: string) => contributions.some(c => c.type === type && c.createdAt >= today);

  // ── Profile setup checks ────────────────────────────────────────────────────
  const hasName   = !!(profile.displayName && profile.displayName !== "Explorer" && profile.displayName !== "Researcher" && profile.displayName.length > 0);
  const hasBio    = !!(profile.bio && profile.bio.length >= 10);
  const hasOrcid  = !!profile.orcidId;
  const hasAvatar = !!(profile.avatarCid || profile.avatarUrl);
  const hasIpfs   = !!profile.ipfsCid;

  // ── Engagement checks ───────────────────────────────────────────────────────
  const hasSubmitted = hasType("submission");
  const hasVoted     = contributions.some(c => c.type.startsWith("vote_"));
  const cleanedToday = hasDailyType("clean");
  const askedToday   = hasDailyType("question");

  const profileItems: JourneyItem[] = [
    {
      done: hasName,
      label: "Set your display name",
      pts: 10,
      emoji: "✏️",
      action: (
        <Link href="/profile" className="text-[10px] text-[#83eef0] [font-family:'Inter',Helvetica] font-medium no-underline hover:underline">
          Set →
        </Link>
      ),
    },
    {
      done: hasBio,
      label: "Write a short bio",
      detail: "At least 10 characters",
      pts: 10,
      emoji: "📝",
      action: (
        <Link href="/profile" className="text-[10px] text-[#83eef0] [font-family:'Inter',Helvetica] font-medium no-underline hover:underline">
          Add →
        </Link>
      ),
    },
    {
      done: hasOrcid,
      label: "Link your ORCID researcher ID",
      pts: 25,
      emoji: "🔬",
      action: (
        <a href="/api/auth/orcid?mode=auth" className="text-[10px] text-[#A6CE39] [font-family:'Inter',Helvetica] font-medium no-underline hover:underline">
          Link →
        </a>
      ),
    },
    {
      done: hasAvatar,
      label: "Upload a profile photo",
      pts: 15,
      emoji: "🖼️",
      action: (
        <Link href="/profile" className="text-[10px] text-[#83eef0] [font-family:'Inter',Helvetica] font-medium no-underline hover:underline">
          Upload →
        </Link>
      ),
    },
    {
      done: hasIpfs,
      label: "Sync profile to IPFS",
      detail: "Decentralise your identity",
      pts: 30,
      emoji: "🌐",
      action: (
        <Link href="/profile" className="text-[10px] text-[#83eef0] [font-family:'Inter',Helvetica] font-medium no-underline hover:underline">
          Sync →
        </Link>
      ),
    },
  ];

  const engagementItems: JourneyItem[] = [
    {
      done: hasSubmitted,
      label: "Submit a reef image",
      detail: "Upload via the Curation page",
      pts: 20,
      emoji: "🪸",
      action: (
        <Link href="/curation" className="text-[10px] text-[#83eef0] [font-family:'Inter',Helvetica] font-medium no-underline hover:underline">
          Submit →
        </Link>
      ),
    },
    {
      done: hasVoted,
      label: "Vote on a governance proposal",
      detail: "Requires a connected wallet",
      pts: 15,
      emoji: "🗳️",
      action: (
        <Link href="/governance" className="text-[10px] text-[#83eef0] [font-family:'Inter',Helvetica] font-medium no-underline hover:underline">
          Vote →
        </Link>
      ),
    },
  ];

  const dailyItems: JourneyItem[] = [
    {
      done: cleanedToday,
      label: "Daily coral clean",
      detail: "Resets each day",
      pts: 10,
      emoji: "🧹",
      daily: true,
      action: (
        <Link href="/" className="text-[10px] text-[#a6ce39] [font-family:'Inter',Helvetica] font-medium no-underline hover:underline">
          Clean →
        </Link>
      ),
    },
    {
      done: askedToday,
      label: "Ask a question in the chat",
      detail: "Resets each day",
      pts: 10,
      emoji: "💬",
      daily: true,
      action: (
        <Link href="/" className="text-[10px] text-[#a6ce39] [font-family:'Inter',Helvetica] font-medium no-underline hover:underline">
          Ask →
        </Link>
      ),
    },
  ];

  const allProfileDone  = profileItems.every(i => i.done);
  const allEngageDone   = engagementItems.every(i => i.done);
  const allDailyDone    = dailyItems.every(i => i.done);

  const profileDone  = profileItems.filter(i => i.done).length;
  const engageDone   = engagementItems.filter(i => i.done).length;
  const dailyDone    = dailyItems.filter(i => i.done).length;
  const totalItems   = profileItems.length + engagementItems.length + dailyItems.length;
  const totalDone    = profileDone + engageDone + dailyDone;

  // Show a compact "all done" ribbon instead of hiding entirely, so daily tasks stay visible tomorrow
  const everythingDone = allProfileDone && allEngageDone && allDailyDone;

  return (
    <div
      className={className ?? "shrink-0 mx-3 md:mx-6 mt-3 md:mt-4 rounded-[20px] border border-[#83eef01a] overflow-hidden"}
      style={{ background: "rgba(0,8,12,0.7)", backdropFilter: "blur(12px)" }}
    >
      {/* Header */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#83eef006]"
        data-testid="button-journey-toggle"
      >
        <span className="text-base">🗺️</span>
        <div className="flex flex-col flex-1 min-w-0">
          <span className="font-semibold text-[#d4e9f3] text-sm [font-family:'Plus_Jakarta_Sans',Helvetica] leading-5">
            Your Regen Reef Journey
          </span>
          <div className="flex items-center gap-2 mt-1">
            <ProgressBar value={totalDone} max={totalItems} />
            <span className="text-[10px] text-[#d4e9f366] [font-family:'Inter',Helvetica] whitespace-nowrap">
              {totalDone}/{totalItems}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-[#d4e9f344] [font-family:'Inter',Helvetica]">
            {profile.points} pts
          </span>
          {collapsed
            ? <ChevronDown size={14} className="text-[#d4e9f340]" />
            : <ChevronUp   size={14} className="text-[#d4e9f340]" />
          }
        </div>
      </button>

      {!collapsed && (
        <div className="flex flex-col gap-0 px-4 pb-4">
          <div className="h-px w-full bg-[#83eef010]" />

          {everythingDone ? (
            <div className="flex items-center gap-2 py-3">
              <span className="text-base">🎉</span>
              <p className="text-xs [font-family:'Inter',Helvetica] text-[#a6ce39aa]">
                All journey steps complete for today. Come back tomorrow for your daily tasks!
              </p>
            </div>
          ) : (
            <>
              {/* Profile setup section */}
              {!allProfileDone && (
                <div className="flex flex-col gap-2.5 pt-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] uppercase tracking-widest text-[#d4e9f340] [font-family:'Inter',Helvetica]">Profile Setup</span>
                    <span className="text-[9px] text-[#83eef044] [font-family:'Inter',Helvetica]">{profileDone}/{profileItems.length}</span>
                  </div>
                  {profileItems.filter(i => !i.done).map((item, i) => (
                    <JourneyRow key={i} item={item} />
                  ))}
                </div>
              )}

              {/* Engagement section */}
              {!allEngageDone && (
                <div className="flex flex-col gap-2.5 pt-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] uppercase tracking-widest text-[#d4e9f340] [font-family:'Inter',Helvetica]">Community</span>
                    <span className="text-[9px] text-[#83eef044] [font-family:'Inter',Helvetica]">{engageDone}/{engagementItems.length}</span>
                  </div>
                  {engagementItems.filter(i => !i.done).map((item, i) => (
                    <JourneyRow key={i} item={item} />
                  ))}
                </div>
              )}

              {/* Daily section */}
              <div className="flex flex-col gap-2.5 pt-3">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] uppercase tracking-widest text-[#d4e9f340] [font-family:'Inter',Helvetica]">Daily</span>
                  <span className="text-[9px] text-[#a6ce3966] [font-family:'Inter',Helvetica]">{dailyDone}/{dailyItems.length} today</span>
                </div>
                {dailyItems.map((item, i) => (
                  <JourneyRow key={i} item={item} />
                ))}
              </div>
            </>
          )}

          {/* Points legend toggle */}
          <div className="h-px w-full bg-[#83eef010] mt-3" />
          <button
            onClick={() => setShowLegend(l => !l)}
            className="flex items-center gap-1.5 py-1.5 text-[9px] uppercase tracking-widest text-[#d4e9f344] hover:text-[#d4e9f380] [font-family:'Inter',Helvetica] transition-colors"
            data-testid="button-journey-legend"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
              <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            How points work
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" className={`transition-transform ${showLegend ? "rotate-180" : ""}`}>
              <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {showLegend && (
            <div className="flex flex-col gap-1.5 pb-1 rounded-xl bg-[#ffffff04] border border-[#ffffff08] px-3 py-2.5 mt-1">
              <p className="text-[9px] uppercase tracking-widest text-[#d4e9f333] [font-family:'Inter',Helvetica] mb-0.5">Points legend</p>
              <LegendItem emoji="🚀" label="First login"              pts={50} />
              <LegendItem emoji="✏️" label="Set display name"         pts={10} />
              <LegendItem emoji="📝" label="Write a bio"              pts={10} />
              <LegendItem emoji="🖼️" label="Upload avatar"            pts={15} />
              <LegendItem emoji="🔬" label="Link ORCID"               pts={25} color="#a6ce39" />
              <LegendItem emoji="🌐" label="Sync to IPFS"             pts={30} />
              <div className="h-px bg-[#ffffff08] my-0.5" />
              <LegendItem emoji="🪸" label="Submit reef image"        pts={20} />
              <LegendItem emoji="✅" label="Reef image approved"       pts={50} color="#a6ce39" />
              <LegendItem emoji="🔍" label="Curate an image"          pts={5} />
              <LegendItem emoji="🗳️" label="Vote on proposal"         pts={15} />
              <div className="h-px bg-[#ffffff08] my-0.5" />
              <LegendItem emoji="🧹" label="Daily coral clean"        pts={10} color="#a6ce39" />
              <LegendItem emoji="💬" label="Daily chat question"      pts={10} color="#a6ce39" />
            </div>
          )}

          {/* Quick nav */}
          <div className="flex items-center gap-2 flex-wrap pt-2">
            <span className="text-[10px] text-[#d4e9f340] [font-family:'Inter',Helvetica]">Explore:</span>
            {[
              { label: "Curation",    href: "/curation",    emoji: "🪸" },
              { label: "Governance",  href: "/governance",  emoji: "🗳️" },
              { label: "Community",   href: "/community",   emoji: "👥" },
              { label: "Reef Map",    href: "/map",         emoji: "🗺️" },
            ].map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-1 px-2 py-1 rounded-full no-underline text-[10px] [font-family:'Inter',Helvetica] text-[#d4e9f366] hover:text-[#83eef0] border border-[#ffffff0a] hover:border-[#83eef020] transition-colors"
              >
                <span>{link.emoji}</span>
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
