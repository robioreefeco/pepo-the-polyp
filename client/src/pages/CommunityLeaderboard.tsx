import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { usePrivy } from "@privy-io/react-auth";
import { PRIVY_ENABLED } from "@/lib/privy";
import { Trophy, MessageCircle, Star, Users, ArrowLeft, Globe } from "lucide-react";
import type { LeaderboardEntry } from "@shared/schema";

// ─── ORCID badge ──────────────────────────────────────────────────────────────
function OrcidBadge({ orcidId }: { orcidId: string }) {
  if (!orcidId) return null;
  return (
    <a
      href={`https://orcid.org/${orcidId}`}
      target="_blank"
      rel="noopener noreferrer"
      title={`ORCID iD: ${orcidId}`}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full no-underline flex-shrink-0"
      style={{ background: "#a6ce3920", border: "1px solid #a6ce3940" }}
    >
      <svg width="10" height="10" viewBox="0 0 256 256" fill="none">
        <circle cx="128" cy="128" r="128" fill="#A6CE39"/>
        <path d="M86.3 186.2H70.9V79.1h15.4v107.1zM108.9 79.1h41.6c39.6 0 57 28.3 57 53.6 0 27.5-21.5 53.6-56.8 53.6h-41.8V79.1zm15.4 93.3h24.5c34.9 0 42.9-26.5 42.9-39.7 0-21.5-13.7-39.7-43.7-39.7h-23.7v79.4zM88.7 56.8c0 5.5-4.5 10.1-10.1 10.1s-10.1-4.6-10.1-10.1c0-5.6 4.5-10.1 10.1-10.1s10.1 4.5 10.1 10.1z" fill="white"/>
      </svg>
      <span className="[font-family:'Inter',Helvetica] text-[9px] font-semibold" style={{ color: "#a6ce39" }}>
        ORCID
      </span>
    </a>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function rankBadge(rank: number) {
  if (rank === 1) return { emoji: "🥇", color: "#FFD700" };
  if (rank === 2) return { emoji: "🥈", color: "#C0C0C0" };
  if (rank === 3) return { emoji: "🥉", color: "#CD7F32" };
  return { emoji: `#${rank}`, color: "#d4e9f366" };
}

function Avatar({ url, name, size = 40 }: { url?: string; name: string; size?: number }) {
  const initials = name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() || "?";
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        style={{ width: size, height: size }}
        className="rounded-full object-cover border border-[#83eef033] flex-shrink-0"
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-full bg-[#0a293380] border border-[#83eef033] flex items-center justify-center flex-shrink-0"
    >
      <span className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-bold text-[#83eef0] text-sm">
        {initials}
      </span>
    </div>
  );
}

// ─── Leaderboard panel ────────────────────────────────────────────────────────
function LeaderboardPanel({ entries, currentUserId }: { entries: LeaderboardEntry[]; currentUserId?: string }) {
  return (
    <aside className="w-full md:w-[280px] md:flex-none flex flex-col gap-3">
      <div className="flex items-center gap-2.5 px-1">
        <Trophy size={16} className="text-[#FFD700]" />
        <span className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-bold text-[#d4e9f3] text-base">
          Leaderboard
        </span>
        <span className="ml-auto [font-family:'Inter',Helvetica] text-[#d4e9f366] text-xs">
          {entries.length} contributors
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {entries.slice(0, 20).map((entry, i) => {
          const rank = i + 1;
          const badge = rankBadge(rank);
          const isMe = entry.id === currentUserId;
          return (
            <div
              key={entry.id}
              data-testid={`leaderboard-row-${entry.id}`}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-colors ${
                isMe
                  ? "bg-[#83eef010] border-[#83eef033]"
                  : "bg-[#00080c80] border-[#ffffff08] hover:border-[#83eef01a]"
              }`}
              style={isMe ? { boxShadow: "inset 0 2px 6px rgba(0,0,0,0.4)" } : {}}
            >
              {/* Rank */}
              <span
                className="w-7 text-center [font-family:'Plus_Jakarta_Sans',Helvetica] font-bold text-sm flex-shrink-0"
                style={{ color: badge.color }}
              >
                {badge.emoji}
              </span>

              {/* Avatar */}
              <Avatar url={entry.avatarUrl} name={entry.displayName} size={30} />

              {/* Name + stats */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-semibold text-[#d4e9f3] text-sm truncate">
                    {entry.displayName}
                  </span>
                  {isMe && (
                    <span className="text-[9px] [font-family:'Inter',Helvetica] text-[#83eef0] bg-[#83eef015] px-1.5 py-0.5 rounded-full border border-[#83eef030] flex-shrink-0">
                      you
                    </span>
                  )}
                  <OrcidBadge orcidId={entry.orcidId} />
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="[font-family:'Inter',Helvetica] text-[#83eef0] text-xs font-semibold">
                    {entry.points} pts
                  </span>
                  <span className="text-[#d4e9f333]">·</span>
                  <span className="[font-family:'Inter',Helvetica] text-[#d4e9f366] text-[10px]">
                    {entry.questionCount} questions
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {entries.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <Users size={28} className="text-[#d4e9f333]" />
            <span className="[font-family:'Inter',Helvetica] text-[#d4e9f366] text-sm">
              No contributors yet
            </span>
            <span className="[font-family:'Inter',Helvetica] text-[#d4e9f344] text-xs">
              Log in and ask Pepo a question to earn points!
            </span>
          </div>
        )}
      </div>
    </aside>
  );
}

// ─── Profile card ─────────────────────────────────────────────────────────────
function ProfileCard({ entry, rank }: { entry: LeaderboardEntry; rank: number }) {
  const badge = rankBadge(rank);
  return (
    <div
      data-testid={`profile-card-${entry.id}`}
      className="flex flex-col gap-4 p-5 rounded-3xl border border-[#ffffff08] bg-[#00080c80] hover:border-[#83eef01a] transition-colors"
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="relative flex-shrink-0">
          <Avatar url={entry.avatarUrl} name={entry.displayName} size={48} />
          <span
            className="absolute -bottom-1 -right-1 text-[11px] [font-family:'Plus_Jakarta_Sans',Helvetica] font-bold leading-none"
            style={{ color: badge.color }}
          >
            {rank <= 3 ? badge.emoji : ""}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-bold text-[#d4e9f3] text-base truncate">
              {entry.displayName}
            </span>
            <OrcidBadge orcidId={entry.orcidId} />
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="[font-family:'Inter',Helvetica] text-[#83eef0] text-xs font-semibold">
              {entry.points} pts
            </span>
            <span className="text-[#d4e9f333]">·</span>
            <span className="[font-family:'Inter',Helvetica] text-[#d4e9f366] text-xs">
              Rank #{rank}
            </span>
          </div>
        </div>
      </div>

      {/* Tags */}
      {entry.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {entry.tags.slice(0, 4).map((tag: string) => (
            <span
              key={tag}
              className="[font-family:'Inter',Helvetica] text-[10px] text-[#83eef0] bg-[#83eef010] border border-[#83eef025] px-2 py-0.5 rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col items-center gap-0.5 p-2.5 rounded-xl bg-[#83eef008] border border-[#83eef012]">
          <MessageCircle size={13} className="text-[#83eef080]" />
          <span className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-bold text-[#83eef0] text-sm">
            {entry.questionCount}
          </span>
          <span className="[font-family:'Inter',Helvetica] text-[#d4e9f366] text-[9px]">Questions</span>
        </div>
        <div className="flex flex-col items-center gap-0.5 p-2.5 rounded-xl bg-[#83eef008] border border-[#83eef012]">
          <Star size={13} className="text-[#FFD700]" />
          <span className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-bold text-[#83eef0] text-sm">
            {entry.points}
          </span>
          <span className="[font-family:'Inter',Helvetica] text-[#d4e9f366] text-[9px]">Points</span>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export function CommunityLeaderboard() {
  const { user, authenticated } = PRIVY_ENABLED
    ? // eslint-disable-next-line react-hooks/rules-of-hooks
      usePrivy()
    : { user: null, authenticated: false };

  const { data: leaderboard = [], isLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/leaderboard"],
    refetchInterval: 30_000,
  });

  const currentUserId = user?.id;

  return (
    <div
      className="min-h-screen w-full"
      style={{
        background: "linear-gradient(180deg, #00131c 0%, #00080c 100%)",
      }}
    >
      {/* Top bar */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-[#ffffff08]">
        <Link
          href="/"
          data-testid="link-back-home"
          className="flex items-center gap-2 text-[#d4e9f380] hover:text-[#d4e9f3] transition-colors no-underline"
        >
          <ArrowLeft size={16} />
          <span className="[font-family:'Inter',Helvetica] text-sm">Back</span>
        </Link>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <Users size={16} className="text-[#83eef0]" />
          <span className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-bold text-[#d4e9f3] text-base">
            Community
          </span>
        </div>
        <div className="flex-1" />
      </div>

      {/* Hero */}
      <div className="flex flex-col items-center gap-2 px-6 pt-8 pb-6 text-center">
        <div className="flex items-center gap-2.5">
          <Trophy size={22} className="text-[#FFD700]" />
          <h1 className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-extrabold text-[#d4e9f3] text-2xl">
            Reef Contributors
          </h1>
        </div>
        <p className="[font-family:'Inter',Helvetica] text-[#9aaeb8] text-sm max-w-md">
          Every question asked earns points. The most curious explorers rise to the top of the Reef Knowledge Network.
        </p>
        {!authenticated && (
          <div className="mt-2 px-4 py-2 rounded-full bg-[#83eef010] border border-[#83eef033]">
            <span className="[font-family:'Inter',Helvetica] text-[#83eef0] text-xs">
              Log in and ask Pepo a question to join the leaderboard
            </span>
          </div>
        )}
      </div>

      {/* Main layout: left = leaderboard, right = profile cards */}
      <div className="flex flex-col md:flex-row gap-6 px-4 md:px-8 pb-16 max-w-6xl mx-auto">

        {/* Left: Leaderboard */}
        {isLoading ? (
          <aside className="w-full md:w-[280px] flex flex-col gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-14 rounded-2xl bg-[#00080c80] border border-[#ffffff06] animate-pulse" />
            ))}
          </aside>
        ) : (
          <LeaderboardPanel entries={leaderboard} currentUserId={currentUserId} />
        )}

        {/* Right: Profile grid */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-4 px-1">
            <Globe size={15} className="text-[#d4e9f366]" />
            <span className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-semibold text-[#d4e9f3] text-sm">
              Explorer Profiles
            </span>
            <span className="[font-family:'Inter',Helvetica] text-[#d4e9f344] text-xs ml-auto">
              {leaderboard.length} members
            </span>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-48 rounded-3xl bg-[#00080c80] border border-[#ffffff06] animate-pulse" />
              ))}
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-20 text-center">
              <Users size={40} className="text-[#d4e9f322]" />
              <span className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-bold text-[#d4e9f366] text-lg">
                No profiles yet
              </span>
              <span className="[font-family:'Inter',Helvetica] text-[#d4e9f344] text-sm max-w-xs">
                Be the first to explore the Reef Knowledge Network and earn contribution points.
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {leaderboard.map((entry, i) => (
                <ProfileCard key={entry.id} entry={entry} rank={i + 1} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
