import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";
import { useOrcidAuth } from "@/hooks/use-orcid-auth";
import { ChevronDown, ChevronUp } from "lucide-react";

interface Profile {
  displayName: string;
  bio: string;
  orcidId: string;
  avatarCid: string;
  avatarUrl: string;
  points: number;
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(131,238,240,0.1)" }}>
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{
          width: `${pct}%`,
          background: "linear-gradient(90deg, #83eef0 0%, #3fb0b3 100%)",
        }}
      />
    </div>
  );
}

interface CheckItem {
  done: boolean;
  label: string;
  action?: React.ReactNode;
  pts: number;
}

function CheckRow({ item }: { item: CheckItem }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center"
        style={{
          background: item.done ? "rgba(131,238,240,0.15)" : "rgba(255,255,255,0.04)",
          border: item.done ? "1.5px solid rgba(131,238,240,0.4)" : "1.5px solid rgba(255,255,255,0.1)",
        }}
      >
        {item.done && (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
            <path d="M20 6L9 17l-5-5" stroke="#83eef0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <span
        className="flex-1 text-xs [font-family:'Inter',Helvetica] leading-relaxed"
        style={{ color: item.done ? "rgba(212,233,243,0.5)" : "rgba(212,233,243,0.85)" }}
      >
        {item.done ? <s>{item.label}</s> : item.label}
      </span>
      {!item.done && item.action}
      {!item.done && (
        <span className="text-[10px] font-semibold text-[#83eef066] [font-family:'Plus_Jakarta_Sans',Helvetica] whitespace-nowrap">
          +{item.pts} pts
        </span>
      )}
    </div>
  );
}

export function JourneySection() {
  const [collapsed, setCollapsed] = useState(false);
  const { authenticated: privyAuthenticated } = usePrivy();
  const { orcidAuthenticated } = useOrcidAuth();
  const isAuthed = privyAuthenticated || orcidAuthenticated;

  const { data: profile } = useQuery<Profile>({
    queryKey: ["/api/profiles/me"],
    enabled: isAuthed,
  });

  if (!isAuthed || !profile) return null;

  const hasName = profile.displayName && profile.displayName !== "Explorer" && profile.displayName !== "Researcher";
  const hasBio = profile.bio && profile.bio.length > 10;
  const hasOrcid = !!profile.orcidId;
  const hasAvatar = !!(profile.avatarCid || profile.avatarUrl);

  const checks: CheckItem[] = [
    {
      done: hasName,
      label: "Set your display name",
      action: (
        <Link
          href="/profile"
          className="text-[10px] text-[#83eef0] [font-family:'Inter',Helvetica] font-medium no-underline hover:underline"
        >
          Set →
        </Link>
      ),
      pts: 0,
    },
    {
      done: hasBio,
      label: "Write a short bio",
      action: (
        <Link
          href="/profile"
          className="text-[10px] text-[#83eef0] [font-family:'Inter',Helvetica] font-medium no-underline hover:underline"
        >
          Add →
        </Link>
      ),
      pts: 0,
    },
    {
      done: hasOrcid,
      label: "Link your ORCID researcher ID",
      action: (
        <a
          href="/api/auth/orcid?mode=auth"
          className="text-[10px] text-[#A6CE39] [font-family:'Inter',Helvetica] font-medium no-underline hover:underline"
        >
          Link →
        </a>
      ),
      pts: 25,
    },
    {
      done: hasAvatar,
      label: "Upload a profile photo",
      action: (
        <Link
          href="/profile"
          className="text-[10px] text-[#83eef0] [font-family:'Inter',Helvetica] font-medium no-underline hover:underline"
        >
          Upload →
        </Link>
      ),
      pts: 0,
    },
  ];

  const completedCount = checks.filter((c) => c.done).length;
  const totalCount = checks.length;
  const allDone = completedCount === totalCount;

  if (allDone) return null;

  return (
    <div
      className="shrink-0 mx-3 md:mx-6 mt-3 md:mt-4 rounded-[20px] border border-[#83eef01a] overflow-hidden"
      style={{ background: "rgba(0,8,12,0.7)", backdropFilter: "blur(12px)" }}
    >
      {/* Header row */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#83eef006]"
        data-testid="button-journey-toggle"
      >
        <span className="text-base">🗺️</span>
        <div className="flex flex-col flex-1 min-w-0">
          <span className="font-semibold text-[#d4e9f3] text-sm [font-family:'Plus_Jakarta_Sans',Helvetica] leading-5">
            Your Reef Journey
          </span>
          <div className="flex items-center gap-2 mt-1">
            <ProgressBar value={completedCount} max={totalCount} />
            <span className="text-[10px] text-[#d4e9f366] [font-family:'Inter',Helvetica] whitespace-nowrap">
              {completedCount}/{totalCount}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-[#d4e9f344] [font-family:'Inter',Helvetica]">
            {profile.points} pts
          </span>
          {collapsed ? (
            <ChevronDown size={14} className="text-[#d4e9f340]" />
          ) : (
            <ChevronUp size={14} className="text-[#d4e9f340]" />
          )}
        </div>
      </button>

      {/* Checklist */}
      {!collapsed && (
        <div className="flex flex-col gap-2.5 px-4 pb-4">
          <div className="h-px w-full bg-[#83eef010]" />
          {checks.map((item, i) => (
            <CheckRow key={i} item={item} />
          ))}

          {/* Quick nav row */}
          <div className="h-px w-full bg-[#83eef010] mt-1" />
          <div className="flex items-center gap-2 flex-wrap pt-0.5">
            <span className="text-[10px] text-[#d4e9f340] [font-family:'Inter',Helvetica]">Quick links:</span>
            {[
              { label: "Governance", href: "/governance", emoji: "🗳️" },
              { label: "Community", href: "/community", emoji: "👥" },
              { label: "Workspace", href: "/workspace", emoji: "📁" },
              { label: "Reef Map", href: "/map", emoji: "🗺️" },
            ].map((link) => (
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
