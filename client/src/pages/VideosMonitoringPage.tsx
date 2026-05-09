import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { ApplicationHeaderSection } from "./sections/ApplicationHeaderSection";
import { ExplorerNavigationSidebarSection } from "./sections/ExplorerNavigationSidebarSection";
import { ExternalLink, Github, GitCommit, Star, GitFork, Play, Layers, Map, BarChart3, ChevronDown, ChevronUp, Video } from "lucide-react";
import type { ReefVideo } from "@shared/schema";

function formatDate(ts: number) {
  return new Date(ts * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// ─── Types ─────────────────────────────────────────────────────────────────────
interface DeepReefMapInfo {
  repo: {
    stargazers_count: number;
    forks_count: number;
    description: string;
    open_issues_count: number;
    pushed_at: string;
    html_url: string;
    language: string;
  };
  commits: Array<{
    sha: string;
    commit: {
      message: string;
      author: { name: string; date: string };
    };
    html_url: string;
    author?: { login: string; avatar_url: string };
  }>;
  releases: Array<{
    tag_name: string;
    name: string;
    published_at: string;
    html_url: string;
    body: string;
  }>;
}

// ─── Benthic classes from Coralscapes / DeepReefMap outputs ───────────────────
const BENTHIC_CLASSES = [
  { label: "Hard Coral",              color: "#f97316", pct: 28, icon: "🪸" },
  { label: "Soft Coral",             color: "#a78bfa", pct: 12, icon: "🌊" },
  { label: "Crustose Coralline Algae", color: "#ec4899", pct: 15, icon: "🔴" },
  { label: "Macroalgae",             color: "#22c55e", pct: 18, icon: "🌿" },
  { label: "Turf Algae",             color: "#84cc16", pct: 10, icon: "🟢" },
  { label: "Rubble",                 color: "#94a3b8", pct: 8,  icon: "🪨" },
  { label: "Sand",                   color: "#fbbf24", pct: 6,  icon: "🏖️" },
  { label: "Other",                  color: "#64748b", pct: 3,  icon: "🔵" },
];

const PIPELINE_STEPS = [
  {
    num: "01",
    icon: <Play size={18} />,
    title: "Input Video",
    desc: "Underwater footage from GoPro Hero or calibrated camera — ideally 10–60s clips in linear (non-fisheye) mode.",
    color: "#83eef0",
  },
  {
    num: "02",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
        <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    title: "Frame Rectification",
    desc: "Camera profiles correct lens distortion. Supports GoPro Hero 10 built-in; custom calibration via COLMAP for other rigs.",
    color: "#a78bfa",
  },
  {
    num: "03",
    icon: <Layers size={18} />,
    title: "Depth + Segmentation",
    desc: "SC-SfMLearner (fast, CPU-ok) or LoGeR (GPU, high quality) estimates depth & pose. Coralscapes ViT segments benthic classes.",
    color: "#f97316",
  },
  {
    num: "04",
    icon: <Map size={18} />,
    title: "Export & Visualise",
    desc: "Outputs a semantic 3D point cloud (.ply), ortho-mosaic image, benthic_cover.json, and an interactive 3D viser viewer.",
    color: "#4ade80",
  },
];

const OUTPUT_CARDS = [
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#83eef0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: "Semantic 3D Point Cloud",
    ext: ".ply",
    desc: "Each point carries a benthic class label. Open in Meshlab or CloudCompare for 3D inspection.",
    color: "#83eef0",
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="18" height="18" rx="2" stroke="#a78bfa" strokeWidth="1.8"/>
        <path d="M3 9h18M9 3v18" stroke="#a78bfa" strokeWidth="1.8" strokeLinecap="round"/>
        <circle cx="15" cy="15" r="2" fill="#a78bfa" fillOpacity="0.4" stroke="#a78bfa" strokeWidth="1.2"/>
      </svg>
    ),
    title: "Ortho-Mosaic Image",
    ext: "ortho.png",
    desc: "Top-down composite image of the entire surveyed reef patch — geo-referenced for GIS integration.",
    color: "#a78bfa",
  },
  {
    icon: <BarChart3 size={28} color="#4ade80" />,
    title: "Benthic Cover Stats",
    ext: ".json",
    desc: "Per-class cover percentages (hard coral, algae, rubble, sand…) for rapid ecological assessment.",
    color: "#4ade80",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return "today";
  if (d === 1) return "yesterday";
  if (d < 30) return `${d}d ago`;
  const m = Math.floor(d / 30);
  return `${m}mo ago`;
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-[#ffffff0d] ${className}`}
      style={{ background: "rgba(0,8,12,0.65)", backdropFilter: "blur(12px)" }}
    >
      {children}
    </div>
  );
}

// ─── Benthic Bar ──────────────────────────────────────────────────────────────
function BenthicCoverChart({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
  return (
    <Card>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#ffffff04] transition-colors rounded-2xl"
      >
        <div className="flex items-center gap-3">
          <BarChart3 size={18} color="#83eef0" />
          <span className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-bold text-[#d4e9f3] text-sm">
            Benthic Cover Classes
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full [font-family:'Inter',Helvetica]"
            style={{ background: "rgba(131,238,240,0.1)", border: "1px solid rgba(131,238,240,0.2)", color: "#83eef0" }}>
            Example output
          </span>
        </div>
        {expanded ? <ChevronUp size={16} color="#d4e9f366" /> : <ChevronDown size={16} color="#d4e9f366" />}
      </button>

      {expanded && (
        <div className="px-5 pb-5 flex flex-col gap-3">
          {/* Stacked bar */}
          <div className="w-full h-4 rounded-full overflow-hidden flex">
            {BENTHIC_CLASSES.map(c => (
              <div
                key={c.label}
                style={{ width: `${c.pct}%`, background: c.color }}
                title={`${c.label}: ${c.pct}%`}
              />
            ))}
          </div>

          {/* Legend */}
          <div className="grid grid-cols-2 gap-2">
            {BENTHIC_CLASSES.map(c => (
              <div key={c.label} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: c.color }} />
                <span className="text-[11px] [font-family:'Inter',Helvetica]" style={{ color: "rgba(212,233,243,0.7)" }}>
                  {c.label}
                </span>
                <span className="ml-auto text-[11px] font-semibold [font-family:'Plus_Jakarta_Sans',Helvetica]"
                  style={{ color: c.color }}>
                  {c.pct}%
                </span>
              </div>
            ))}
          </div>

          <p className="text-[10px] [font-family:'Inter',Helvetica]" style={{ color: "rgba(212,233,243,0.3)" }}>
            Example output from a 30-second GoPro Hero 10 clip processed with DeepReefMap v1.0. Real outputs vary by site.
          </p>
        </div>
      )}
    </Card>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export function VideosMonitoringPage() {
  const [benthicExpanded, setBenthicExpanded] = useState(true);
  const [pipelineExpanded, setPipelineExpanded] = useState(true);

  const { data, isLoading } = useQuery<DeepReefMapInfo>({
    queryKey: ["/api/deepreefmap/info"],
    staleTime: 5 * 60_000,
  });

  const { data: approvedVideos = [] } = useQuery<ReefVideo[]>({
    queryKey: ["/api/reef-videos"],
    staleTime: 60_000,
  });

  const repo = data?.repo;
  const commits = data?.commits ?? [];
  const release = data?.releases?.[0];

  return (
    <div className="flex flex-col relative bg-[#00080c] h-screen overflow-hidden">
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(131,238,240,0.04) 0%, transparent 70%)" }} />

      <ApplicationHeaderSection />

      <div className="flex flex-row relative self-stretch w-full flex-1 min-h-0 overflow-hidden">
        <div className="hidden md:flex md:flex-col shrink-0">
          <ExplorerNavigationSidebarSection />
        </div>

        <main className="flex-1 overflow-y-auto px-4 md:px-8 py-6 pb-24 md:pb-8">

          {/* ── Hero ──────────────────────────────────────────────────────── */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(131,238,240,0.12)", border: "1px solid rgba(131,238,240,0.25)" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="3" fill="#83eef0" fillOpacity="0.8"/>
                    <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"
                      stroke="#83eef0" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                </div>
                <h1 className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-bold text-[#d4e9f3] text-xl md:text-2xl leading-tight">
                  Video Monitor
                </h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full [font-family:'Inter',Helvetica] font-semibold"
                  style={{ background: "rgba(131,238,240,0.1)", border: "1px solid rgba(131,238,240,0.25)", color: "#83eef0" }}>
                  DeepReefMap
                </span>
              </div>

              <p className="[font-family:'Inter',Helvetica] text-sm leading-relaxed max-w-xl"
                style={{ color: "rgba(212,233,243,0.65)" }}>
                {repo?.description ?? "Rapid 3D semantic mapping of coral reefs from underwater videos — by EPFL ECEO."}
              </p>

              {/* Repo meta pills */}
              <div className="flex flex-wrap items-center gap-2 mt-1">
                {isLoading ? (
                  <div className="h-6 w-48 rounded-full bg-[#ffffff08] animate-pulse" />
                ) : (
                  <>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] [font-family:'Inter',Helvetica]"
                      style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)", color: "#fbbf24" }}>
                      <Star size={10} /> {repo?.stargazers_count ?? "—"} stars
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] [font-family:'Inter',Helvetica]"
                      style={{ background: "rgba(131,238,240,0.08)", border: "1px solid rgba(131,238,240,0.2)", color: "#83eef0cc" }}>
                      <GitFork size={10} /> {repo?.forks_count ?? "—"} forks
                    </span>
                    {release && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] [font-family:'Inter',Helvetica]"
                        style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", color: "#4ade80" }}>
                        🏷️ {release.tag_name}
                      </span>
                    )}
                    {repo?.pushed_at && (
                      <span className="text-[11px] [font-family:'Inter',Helvetica]"
                        style={{ color: "rgba(212,233,243,0.3)" }}>
                        Updated {timeAgo(repo.pushed_at)}
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* CTA buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <a
                href="https://github.com/ECEO-EPFL/deepreefmap"
                target="_blank"
                rel="noopener noreferrer"
                data-testid="link-deepreefmap-github"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm [font-family:'Inter',Helvetica] font-semibold no-underline transition-all hover:opacity-90"
                style={{ background: "rgba(131,238,240,0.12)", border: "1px solid rgba(131,238,240,0.3)", color: "#83eef0" }}
              >
                <Github size={14} /> View on GitHub
              </a>
              <a
                href="https://besjournals.onlinelibrary.wiley.com/doi/full/10.1111/2041-210X.14307"
                target="_blank"
                rel="noopener noreferrer"
                data-testid="link-deepreefmap-paper"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm [font-family:'Inter',Helvetica] font-semibold no-underline transition-all hover:opacity-90"
                style={{ background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.3)", color: "#a78bfa" }}
              >
                <ExternalLink size={14} /> Research Paper
              </a>
            </div>
          </div>

          {/* ── Demo GIF + Pipeline ─────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">

            {/* Demo GIF card */}
            <Card className="overflow-hidden">
              <div className="relative aspect-video bg-[#0a1a1f] flex items-center justify-center">
                <img
                  src="https://raw.githubusercontent.com/ECEO-EPFL/deepreefmap/main/assets/deepreefmap_view_3d_2x.gif"
                  alt="DeepReefMap 3D semantic reef viewer"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 pointer-events-none"
                  style={{ background: "linear-gradient(to top, rgba(0,8,12,0.6) 0%, transparent 40%)" }} />
                <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
                  <span className="text-xs [font-family:'Inter',Helvetica] font-semibold text-[#d4e9f3cc]">
                    Interactive 3D semantic viewer
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full [font-family:'Inter',Helvetica]"
                    style={{ background: "rgba(0,8,12,0.8)", border: "1px solid rgba(131,238,240,0.2)", color: "#83eef0" }}>
                    LIVE DEMO
                  </span>
                </div>
              </div>
              <div className="px-5 py-4">
                <p className="text-xs [font-family:'Inter',Helvetica]" style={{ color: "rgba(212,233,243,0.55)" }}>
                  DeepReefMap renders a navigable 3D point cloud where every point carries a benthic class label —
                  enabling rapid, reproducible reef health assessments from a single video transect.
                </p>
              </div>
            </Card>

            {/* Input demo */}
            <Card className="overflow-hidden">
              <div className="relative aspect-video bg-[#0a1a1f] flex items-center justify-center">
                <img
                  src="https://raw.githubusercontent.com/ECEO-EPFL/deepreefmap/main/assets/demo_input.gif"
                  alt="Example input clip — 10s GoPro Hero 10"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 pointer-events-none"
                  style={{ background: "linear-gradient(to top, rgba(0,8,12,0.6) 0%, transparent 40%)" }} />
                <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
                  <span className="text-xs [font-family:'Inter',Helvetica] font-semibold text-[#d4e9f3cc]">
                    Example input — 10s GoPro Hero 10
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full [font-family:'Inter',Helvetica]"
                    style={{ background: "rgba(0,8,12,0.8)", border: "1px solid rgba(249,115,22,0.3)", color: "#f97316" }}>
                    INPUT
                  </span>
                </div>
              </div>
              <div className="px-5 py-4">
                <p className="text-xs [font-family:'Inter',Helvetica]" style={{ color: "rgba(212,233,243,0.55)" }}>
                  From one short underwater video, DeepReefMap reconstructs the reef in 3D, segments all
                  benthic substrate classes, and exports analysis-ready data products.
                </p>
              </div>
            </Card>
          </div>

          {/* ── Output products ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            {OUTPUT_CARDS.map(c => (
              <Card key={c.title} className="p-5 flex flex-col gap-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${c.color}12`, border: `1px solid ${c.color}30` }}>
                  {c.icon}
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-bold text-[#d4e9f3] text-sm">{c.title}</span>
                  </div>
                  <code className="text-[10px] px-1.5 py-0.5 rounded [font-family:'JetBrains_Mono',monospace]"
                    style={{ background: `${c.color}10`, color: c.color }}>{c.ext}</code>
                  <p className="text-[11px] [font-family:'Inter',Helvetica] leading-relaxed mt-1"
                    style={{ color: "rgba(212,233,243,0.55)" }}>{c.desc}</p>
                </div>
              </Card>
            ))}
          </div>

          {/* ── Benthic cover chart ──────────────────────────────────────────── */}
          <div className="mb-4">
            <BenthicCoverChart expanded={benthicExpanded} onToggle={() => setBenthicExpanded(v => !v)} />
          </div>

          {/* ── Pipeline ────────────────────────────────────────────────────── */}
          <Card className="mb-4">
            <button
              onClick={() => setPipelineExpanded(v => !v)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#ffffff04] transition-colors rounded-2xl"
            >
              <div className="flex items-center gap-3">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12h14M12 5l7 7-7 7" stroke="#83eef0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-bold text-[#d4e9f3] text-sm">
                  Processing Pipeline
                </span>
              </div>
              {pipelineExpanded ? <ChevronUp size={16} color="#d4e9f366" /> : <ChevronDown size={16} color="#d4e9f366" />}
            </button>

            {pipelineExpanded && (
              <div className="px-5 pb-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {PIPELINE_STEPS.map((step, i) => (
                  <div key={step.num} className="flex flex-col gap-3 p-4 rounded-xl"
                    style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${step.color}18` }}>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: `${step.color}15`, color: step.color }}>
                        {step.icon}
                      </div>
                      <span className="text-[10px] font-bold [font-family:'JetBrains_Mono',monospace]"
                        style={{ color: `${step.color}88` }}>{step.num}</span>
                    </div>
                    <div>
                      <p className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-bold text-[#d4e9f3] text-sm mb-1">{step.title}</p>
                      <p className="text-[11px] [font-family:'Inter',Helvetica] leading-relaxed"
                        style={{ color: "rgba(212,233,243,0.5)" }}>{step.desc}</p>
                    </div>
                    {i < PIPELINE_STEPS.length - 1 && (
                      <div className="hidden lg:flex absolute right-0 top-1/2 -translate-y-1/2 text-[#ffffff20]">→</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* ── Latest commits + release ─────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">

            {/* Commits feed */}
            <Card className="lg:col-span-2 p-5 flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <GitCommit size={16} color="#83eef0" />
                <span className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-bold text-[#d4e9f3] text-sm">
                  Latest Commits
                </span>
                <a href="https://github.com/ECEO-EPFL/deepreefmap/commits/main"
                  target="_blank" rel="noopener noreferrer"
                  className="ml-auto no-underline"
                  data-testid="link-deepreefmap-commits">
                  <ExternalLink size={13} color="#d4e9f333" />
                </a>
              </div>

              {isLoading ? (
                <div className="flex flex-col gap-2">
                  {[1,2,3].map(i => (
                    <div key={i} className="h-12 rounded-xl bg-[#ffffff05] animate-pulse" />
                  ))}
                </div>
              ) : commits.length === 0 ? (
                <p className="text-xs text-[#d4e9f340] [font-family:'Inter',Helvetica]">Unable to load commits</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {commits.map(c => (
                    <a
                      key={c.sha}
                      href={c.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-testid={`link-commit-${c.sha.slice(0,7)}`}
                      className="flex items-start gap-3 p-3 rounded-xl no-underline transition-all group"
                      style={{ border: "1px solid rgba(255,255,255,0.04)" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(131,238,240,0.04)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "")}
                    >
                      {c.author?.avatar_url ? (
                        <img src={c.author.avatar_url} alt="" className="w-6 h-6 rounded-full flex-shrink-0 mt-0.5" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-[#ffffff10] flex-shrink-0 mt-0.5 flex items-center justify-center">
                          <span className="text-[9px] text-[#d4e9f350]">{c.commit.author.name[0]}</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs [font-family:'Inter',Helvetica] text-[#d4e9f3cc] leading-snug line-clamp-2 group-hover:text-[#d4e9f3] transition-colors">
                          {c.commit.message.split('\n')[0]}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="text-[10px] text-[#83eef066] [font-family:'JetBrains_Mono',monospace]">
                            {c.sha.slice(0, 7)}
                          </code>
                          <span className="text-[10px] text-[#d4e9f330] [font-family:'Inter',Helvetica]">
                            {c.commit.author.name} · {timeAgo(c.commit.author.date)}
                          </span>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </Card>

            {/* Sidebar: release + links */}
            <div className="flex flex-col gap-4">
              {/* Latest release */}
              <Card className="p-5 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm">🏷️</span>
                  <span className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-bold text-[#d4e9f3] text-sm">Latest Release</span>
                </div>
                {isLoading ? (
                  <div className="h-16 rounded-xl bg-[#ffffff05] animate-pulse" />
                ) : release ? (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold [font-family:'Plus_Jakarta_Sans',Helvetica] text-[#4ade80]">
                        {release.tag_name}
                      </span>
                      <span className="text-[10px] [font-family:'Inter',Helvetica] text-[#d4e9f340]">
                        {timeAgo(release.published_at)}
                      </span>
                    </div>
                    <p className="text-[11px] [font-family:'Inter',Helvetica] leading-relaxed"
                      style={{ color: "rgba(212,233,243,0.5)" }}>
                      {release.body?.split('\n').slice(0, 3).join(' ').slice(0, 120) + "…"}
                    </p>
                    <a
                      href={release.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-testid="link-deepreefmap-release"
                      className="text-[11px] [font-family:'Inter',Helvetica] font-semibold no-underline text-[#4ade80] hover:opacity-80 transition-opacity"
                    >
                      View release notes →
                    </a>
                  </>
                ) : (
                  <p className="text-xs text-[#d4e9f340] [font-family:'Inter',Helvetica]">No releases found</p>
                )}
              </Card>

              {/* Quick links */}
              <Card className="p-5 flex flex-col gap-3">
                <span className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-bold text-[#d4e9f3] text-sm">Resources</span>
                {[
                  { label: "GitHub Repository",  href: "https://github.com/ECEO-EPFL/deepreefmap",                                          color: "#83eef0", icon: <Github size={13} /> },
                  { label: "Research Paper",      href: "https://besjournals.onlinelibrary.wiley.com/doi/full/10.1111/2041-210X.14307",        color: "#a78bfa", icon: <ExternalLink size={13} /> },
                  { label: "Coralscapes Dataset", href: "https://huggingface.co/EPFL-ECEO",                                                   color: "#f97316", icon: <ExternalLink size={13} /> },
                  { label: "LoGeR Backbone",      href: "https://github.com/Junyi42/LoGeR",                                                   color: "#4ade80", icon: <Github size={13} /> },
                  { label: "EPFL ECEO Lab",       href: "https://www.epfl.ch/labs/eceo/",                                                     color: "#fbbf24", icon: <ExternalLink size={13} /> },
                ].map(link => (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid={`link-resource-${link.label.toLowerCase().replace(/ /g, '-')}`}
                    className="flex items-center gap-2 text-[11px] [font-family:'Inter',Helvetica] no-underline transition-opacity hover:opacity-80"
                    style={{ color: link.color }}
                  >
                    {link.icon}
                    {link.label}
                  </a>
                ))}
              </Card>
            </div>
          </div>

          {/* ── Submitted Surveys ────────────────────────────────────────────── */}
          <div className="flex flex-col gap-3 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(108,92,231,0.12)", border: "1px solid rgba(108,92,231,0.25)" }}>
                  <Video size={14} color="#a29bfe" />
                </div>
                <span className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-semibold text-[#d4e9f3] text-sm">
                  Community Video Surveys
                </span>
                {approvedVideos.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] [font-family:'Inter',Helvetica] font-semibold"
                    style={{ background: "rgba(108,92,231,0.15)", border: "1px solid rgba(162,155,254,0.3)", color: "#a29bfe" }}>
                    {approvedVideos.length} published
                  </span>
                )}
              </div>
              <Link href="/curation" data-testid="link-submit-video-survey"
                className="text-[11px] [font-family:'Inter',Helvetica] font-semibold no-underline transition-opacity hover:opacity-80 flex items-center gap-1"
                style={{ color: "#a29bfe" }}>
                Submit yours →
              </Link>
            </div>

            {approvedVideos.length === 0 ? (
              <div className="rounded-xl border border-[#a29bfe15] bg-[#ffffff04] px-5 py-8 flex flex-col items-center gap-3 text-center">
                <span className="text-3xl">🎥</span>
                <p className="[font-family:'Inter',Helvetica] text-[#d4e9f355] text-sm">
                  No approved video surveys yet.{" "}
                  <Link href="/curation" className="text-[#a29bfe] no-underline hover:text-[#c3baff] transition-colors">
                    Be the first to contribute!
                  </Link>
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {approvedVideos.map(vid => (
                  <div key={vid.id} data-testid={`card-survey-${vid.id}`}
                    className="rounded-xl border border-[#a29bfe18] bg-[#ffffff06] backdrop-blur-sm overflow-hidden flex flex-col">
                    {/* Video placeholder */}
                    <div className="aspect-video bg-[#0a0520] flex flex-col items-center justify-center gap-1.5">
                      <span className="text-3xl">🎥</span>
                      <a href={`https://teal-advisory-zebra-284.mypinata.cloud/ipfs/${vid.cid}`}
                        target="_blank" rel="noopener noreferrer"
                        data-testid={`link-survey-ipfs-${vid.id}`}
                        className="text-[9px] px-2 py-0.5 rounded-full no-underline transition-opacity hover:opacity-80 [font-family:'Inter',Helvetica] font-mono"
                        style={{ background: "rgba(162,155,254,0.12)", border: "1px solid rgba(162,155,254,0.25)", color: "#a29bfe" }}>
                        View on IPFS ↗
                      </a>
                      {vid.durationSecs ? (
                        <span className="text-[10px] [font-family:'Inter',Helvetica]" style={{ color: "rgba(212,233,243,0.4)" }}>
                          {Math.floor(vid.durationSecs / 60)}m {vid.durationSecs % 60}s
                        </span>
                      ) : null}
                    </div>
                    {/* Info */}
                    <div className="px-3 py-3 flex flex-col gap-1 flex-1">
                      <p className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-semibold text-[#d4e9f3] text-xs leading-snug m-0 truncate">
                        {vid.title || <span className="italic" style={{ color: "rgba(212,233,243,0.35)" }}>Untitled Survey</span>}
                      </p>
                      {vid.description && (
                        <p className="[font-family:'Inter',Helvetica] text-[10px] leading-relaxed m-0 line-clamp-2"
                          style={{ color: "rgba(212,233,243,0.5)" }}>
                          {vid.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-auto pt-2 flex-wrap">
                        <span className="text-[9px] [font-family:'Inter',Helvetica]" style={{ color: "rgba(131,238,240,0.5)" }}>
                          📍 {Number(vid.latitude).toFixed(3)}, {Number(vid.longitude).toFixed(3)}
                        </span>
                        {vid.depthM ? (
                          <span className="text-[9px] [font-family:'Inter',Helvetica]" style={{ color: "rgba(212,233,243,0.35)" }}>
                            ↓ {vid.depthM}m
                          </span>
                        ) : null}
                        <span className="text-[9px] [font-family:'Inter',Helvetica] ml-auto" style={{ color: "rgba(212,233,243,0.3)" }}>
                          {formatDate(vid.createdAt)}
                        </span>
                      </div>
                      {vid.author && (
                        <span className="text-[9px] [font-family:'Inter',Helvetica]" style={{ color: "rgba(212,233,243,0.35)" }}>
                          by {vid.author}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Attribution ──────────────────────────────────────────────────── */}
          <Card className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(131,238,240,0.08)", border: "1px solid rgba(131,238,240,0.15)" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"
                  fill="#83eef0" fillOpacity="0.7"/>
              </svg>
            </div>
            <p className="text-[11px] [font-family:'Inter',Helvetica] leading-relaxed flex-1"
              style={{ color: "rgba(212,233,243,0.45)" }}>
              DeepReefMap is developed by{" "}
              <a href="https://github.com/josauder" target="_blank" rel="noopener noreferrer"
                className="text-[#83eef0cc] no-underline hover:text-[#83eef0]">Jonathan Sauder</a>{" "}
              and{" "}
              <a href="https://github.com/HuguesSib" target="_blank" rel="noopener noreferrer"
                className="text-[#83eef0cc] no-underline hover:text-[#83eef0]">Hugues Sibille</a>{" "}
              at EPFL ECEO Lab, published in Methods in Ecology and Evolution (2024). Licensed Apache-2.0.
              Integrated here to support MesoReefDAO's reef monitoring and scientific contribution goals.
            </p>
            <a
              href="https://besjournals.onlinelibrary.wiley.com/doi/full/10.1111/2041-210X.14307"
              target="_blank"
              rel="noopener noreferrer"
              data-testid="link-cite-paper"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] [font-family:'Inter',Helvetica] font-semibold no-underline flex-shrink-0 transition-opacity hover:opacity-80"
              style={{ background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.25)", color: "#a78bfa" }}
            >
              <ExternalLink size={11} /> Cite paper
            </a>
          </Card>

        </main>
      </div>

      <MobileBottomNav />
    </div>
  );
}
