import { Link } from "wouter";
import { ExplorerNavigationSidebarSection } from "./sections/ExplorerNavigationSidebarSection";
import { ApplicationHeaderSection } from "./sections/ApplicationHeaderSection";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { BarChart2, Users, Vote, Map, Video, Camera, Thermometer, Layers, Activity, Heart } from "lucide-react";

// ─── Framework data from the Regen Reef Socio-Ecological Index ─────────────────
const DIMENSIONS = [
  {
    id: "abiotic",
    dimension: "Abiotic Stability",
    subtitle: "The Foundation",
    focus: "Physical and chemical environment.",
    kpis: [
      "Thermal Stress (SST/DHW)",
      "Water Quality (Turbidity/Nutrients)",
      "Ocean Chemistry (pH)",
      "Hydrodynamics",
    ],
    goal: 'To ensure the environmental "envelope" is stable enough to support life.',
    color: "#38bdf8",
    bg: "rgba(56,189,248,0.06)",
    border: "rgba(56,189,248,0.25)",
    Icon: Thermometer,
    emoji: "🌊",
  },
  {
    id: "structural",
    dimension: "Structural Integrity",
    subtitle: "The Skeleton",
    focus: "The physical architecture of the reef.",
    kpis: [
      "Benthic cover (coral vs. algae)",
      "Coral Diversity",
      "Rugosity (3D complexity)",
    ],
    goal: "To rebuild the physical habitat required for diverse marine species.",
    color: "#f97316",
    bg: "rgba(249,115,22,0.06)",
    border: "rgba(249,115,22,0.25)",
    Icon: Layers,
    emoji: "🪸",
  },
  {
    id: "functional",
    dimension: "Functional Integrity",
    subtitle: "The Pulse",
    focus: "Biological processes and life cycles.",
    kpis: [
      "Coral Recruitment (new babies)",
      "Coral Health (disease/bleaching)",
      "Fish Biomass",
      "Connectivity",
    ],
    goal: "To restore a self-sustaining ecosystem that can grow and seed other reefs.",
    color: "#22c55e",
    bg: "rgba(34,197,94,0.06)",
    border: "rgba(34,197,94,0.25)",
    Icon: Activity,
    emoji: "🐟",
  },
  {
    id: "social",
    dimension: "Social & Economic",
    subtitle: "The Heart",
    focus: "The human-reef relationship.",
    kpis: [
      "Stewardship",
      "Capacity Building",
      "User Satisfaction",
      "Governance",
      "Economic Benefits",
    ],
    goal: 'To create a "feedback loop" where the community protects the reef that provides for them.',
    color: "#c084fc",
    bg: "rgba(192,132,252,0.06)",
    border: "rgba(192,132,252,0.25)",
    Icon: Heart,
    emoji: "❤️",
  },
];

// ─── App verticals that feed data into the RRI ─────────────────────────────────
const VERTICALS = [
  {
    id: "knowledge",
    title: "Knowledge Graph",
    subtitle: "165+ reef research episodes",
    description: "The DeSci knowledge layer indexing peer-reviewed research, species data, and reef episodes into a queryable graph - powering evidence-based RRI assessment.",
    href: "/",
    color: "#83eef0",
    bg: "rgba(131,238,240,0.06)",
    border: "rgba(131,238,240,0.2)",
    Icon: BarChart2,
    tags: ["Research", "Taxonomy", "Journals", "Wikipedia"],
    rriLink: ["Structural Integrity", "Functional Integrity"],
  },
  {
    id: "community",
    title: "Community",
    subtitle: "Citizen Science",
    description: "Volunteer monitoring, community stewardship tracking, and capacity-building metrics - feeding directly into the Social & Economic dimension of the RRI.",
    href: "/community",
    color: "#a78bfa",
    bg: "rgba(167,139,250,0.06)",
    border: "rgba(167,139,250,0.2)",
    Icon: Users,
    tags: ["Stewardship", "Leaderboard", "Profiles", "Points"],
    rriLink: ["Social & Economic", "Functional Integrity"],
  },
  {
    id: "governance",
    title: "Governance",
    subtitle: "DAO Voting via Vocdoni",
    description: "Decentralized governance proposals and voting - ensuring community participation in reef restoration decisions and creating accountability loops.",
    href: "/governance",
    color: "#fbbf24",
    bg: "rgba(251,191,36,0.06)",
    border: "rgba(251,191,36,0.2)",
    Icon: Vote,
    tags: ["Vocdoni", "Proposals", "Voting", "DAO"],
    rriLink: ["Social & Economic", "Abiotic Stability"],
  },
  {
    id: "reefmap",
    title: "Reef Map",
    subtitle: "Photos, Videos and Monitoring",
    description: "Geo-referenced photo and video surveys classified by DeepReefMap AI for benthic cover, coral health, invertebrates, environmental variables, and fish indicators.",
    href: "/reef-map",
    color: "#22c55e",
    bg: "rgba(34,197,94,0.06)",
    border: "rgba(34,197,94,0.2)",
    Icon: Map,
    tags: ["Ecology", "Coral", "Fish", "Invertebrates", "Video AI"],
    rriLink: ["Abiotic Stability", "Structural Integrity", "Functional Integrity"],
    subLinks: [
      { label: "Reef Map", href: "/reef-map", Icon: Map },
      { label: "Video Monitor", href: "/videos", Icon: Video },
      { label: "Photo Curation", href: "/curation", Icon: Camera },
    ],
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────
export function RegenReefIndexPage() {
  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-[#00080c]">
      <ApplicationHeaderSection />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="hidden md:flex flex-shrink-0 h-full">
          <ExplorerNavigationSidebarSection />
        </div>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 pb-24 md:pb-8">

            {/* Header */}
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(131,238,240,0.1)", border: "1px solid rgba(131,238,240,0.25)" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M18 20V10M12 20V4M6 20v-6" stroke="#83eef0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div>
                  <span className="[font-family:'Inter',Helvetica] text-[10px] font-semibold uppercase tracking-widest text-[#83eef080] block">
                    Framework
                  </span>
                  <h1 className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-bold text-[#d4e9f3] text-2xl md:text-3xl leading-tight">
                    Regen Reef Index
                  </h1>
                </div>
              </div>

              <div className="p-5 rounded-2xl" style={{ background: "rgba(131,238,240,0.04)", border: "1px solid rgba(131,238,240,0.12)" }}>
                <p className="[font-family:'Inter',Helvetica] text-[#d4e9f3b2] text-sm leading-relaxed">
                  The <span className="text-[#83eef0] font-semibold">Regen Reef Index (RRI)</span> is a holistic measurement framework designed to evaluate the success of coral reef restoration by bridging the gap between biological health and human well-being. Unlike traditional metrics that focus solely on coral growth or survival, the RRI treats reefs as{" "}
                  <span className="text-[#a78bfa] font-medium">socio-ecological systems (SES)</span>, acknowledging that a reef cannot truly "regenerate" without the support and prosperity of the local community.
                </p>
              </div>
            </div>

            {/* Framework table - cards */}
            <section className="mb-10">
              <h2 className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-semibold text-[#d4e9f3] text-base mb-1">
                The Regen Reef Socio-Ecological Index
              </h2>
              <p className="[font-family:'Inter',Helvetica] text-[#d4e9f360] text-xs mb-4">
                Four interconnected dimensions - each measuring a critical layer of reef regeneration.
              </p>

              {/* Desktop table */}
              <div className="hidden md:block rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(131,238,240,0.1)" }}>
                {/* Table header */}
                <div className="grid grid-cols-[200px_1fr_1.6fr_1.4fr] gap-0"
                  style={{ background: "rgba(131,238,240,0.05)", borderBottom: "1px solid rgba(131,238,240,0.1)" }}>
                  {["Dimension", "Monitoring Focus", "Key Performance Indicators (KPIs)", "Regenerative Goal"].map(h => (
                    <div key={h} className="px-4 py-3">
                      <span className="[font-family:'Inter',Helvetica] text-[10px] font-semibold uppercase tracking-widest text-[#83eef080]">{h}</span>
                    </div>
                  ))}
                </div>

                {/* Table rows */}
                {DIMENSIONS.map((d, i) => (
                  <div
                    key={d.id}
                    className="grid grid-cols-[200px_1fr_1.6fr_1.4fr] gap-0"
                    style={{
                      background: i % 2 === 0 ? "rgba(0,8,12,0.4)" : "rgba(0,8,12,0.2)",
                      borderBottom: i < DIMENSIONS.length - 1 ? "1px solid rgba(131,238,240,0.06)" : "none",
                    }}
                  >
                    {/* Dimension */}
                    <div className="px-4 py-4 flex items-start gap-3" style={{ borderLeft: `3px solid ${d.color}` }}>
                      <d.Icon size={16} style={{ color: d.color, flexShrink: 0, marginTop: 2 }} />
                      <div>
                        <p className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-bold text-[#d4e9f3] text-sm leading-snug">{d.dimension}</p>
                        <p className="[font-family:'Inter',Helvetica] text-[10px] font-medium mt-0.5" style={{ color: d.color }}>{d.emoji} {d.subtitle}</p>
                      </div>
                    </div>

                    {/* Focus */}
                    <div className="px-4 py-4 flex items-start">
                      <p className="[font-family:'Inter',Helvetica] text-[#d4e9f380] text-xs leading-relaxed">{d.focus}</p>
                    </div>

                    {/* KPIs */}
                    <div className="px-4 py-4 flex items-start">
                      <ul className="flex flex-col gap-1">
                        {d.kpis.map(k => (
                          <li key={k} className="flex items-start gap-1.5">
                            <span className="mt-1.5 w-1 h-1 rounded-full flex-shrink-0" style={{ background: d.color }} />
                            <span className="[font-family:'Inter',Helvetica] text-[#d4e9f3b2] text-xs leading-relaxed">{k}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Goal */}
                    <div className="px-4 py-4 flex items-start">
                      <p className="[font-family:'Inter',Helvetica] text-[#d4e9f380] text-xs leading-relaxed italic">{d.goal}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Mobile cards */}
              <div className="flex flex-col gap-3 md:hidden">
                {DIMENSIONS.map(d => (
                  <div key={d.id} className="rounded-2xl p-4" style={{ background: d.bg, border: `1px solid ${d.border}` }}>
                    <div className="flex items-center gap-2 mb-3">
                      <d.Icon size={16} style={{ color: d.color }} />
                      <div>
                        <p className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-bold text-[#d4e9f3] text-sm">{d.dimension}</p>
                        <p className="[font-family:'Inter',Helvetica] text-[10px] font-medium" style={{ color: d.color }}>{d.emoji} {d.subtitle}</p>
                      </div>
                    </div>
                    <p className="[font-family:'Inter',Helvetica] text-[#d4e9f380] text-xs mb-2 leading-relaxed">{d.focus}</p>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {d.kpis.map(k => (
                        <span key={k} className="text-[10px] [font-family:'Inter',Helvetica] px-2 py-0.5 rounded-full"
                          style={{ background: `${d.color}18`, border: `1px solid ${d.color}40`, color: d.color }}>
                          {k}
                        </span>
                      ))}
                    </div>
                    <p className="[font-family:'Inter',Helvetica] text-[#d4e9f360] text-[11px] leading-relaxed italic">{d.goal}</p>
                  </div>
                ))}
              </div>

            </section>

            {/* Platform Verticals */}
            <section>
              <h2 className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-semibold text-[#d4e9f3] text-base mb-1">
                Platform Verticals
              </h2>
              <p className="[font-family:'Inter',Helvetica] text-[#d4e9f360] text-xs mb-5">
                Four pillars that collectively feed data and community action into the Regen Reef Index.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {VERTICALS.map((v, idx) => (
                  <div
                    key={v.id}
                    className="rounded-2xl p-5 flex flex-col gap-4 relative overflow-hidden"
                    style={{ background: v.bg, border: `1px solid ${v.border}` }}
                  >
                    {/* Number */}
                    <div className="absolute top-4 right-4 text-[40px] font-black leading-none select-none pointer-events-none"
                      style={{ color: `${v.color}10` }}>
                      {idx + 1}
                    </div>

                    {/* Header */}
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: `${v.color}15`, border: `1px solid ${v.color}30` }}>
                        <v.Icon size={18} style={{ color: v.color }} />
                      </div>
                      <div>
                        <p className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-bold text-[#d4e9f3] text-base leading-snug">{v.title}</p>
                        <p className="[font-family:'Inter',Helvetica] text-[11px] font-medium mt-0.5" style={{ color: v.color }}>{v.subtitle}</p>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="[font-family:'Inter',Helvetica] text-[#d4e9f380] text-xs leading-relaxed">{v.description}</p>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5">
                      {v.tags.map(tag => (
                        <span key={tag} className="text-[10px] [font-family:'Inter',Helvetica] px-2 py-0.5 rounded-full"
                          style={{ background: `${v.color}10`, border: `1px solid ${v.color}25`, color: `${v.color}cc` }}>
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* RRI dimensions this feeds */}
                    <div>
                      <p className="[font-family:'Inter',Helvetica] text-[9px] uppercase tracking-widest text-[#d4e9f340] mb-1.5 font-semibold">Feeds into RRI</p>
                      <div className="flex flex-wrap gap-1.5">
                        {v.rriLink.map(dim => {
                          const d = DIMENSIONS.find(d => d.dimension === dim);
                          return (
                            <span key={dim} className="text-[10px] [font-family:'Inter',Helvetica] px-2 py-0.5 rounded-full font-medium"
                              style={{ background: `${d?.color}15`, border: `1px solid ${d?.color}35`, color: d?.color }}>
                              {dim}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* Action links */}
                    <div className="flex flex-wrap items-center gap-2 mt-auto">
                      {"subLinks" in v && v.subLinks ? (
                        v.subLinks.map(sl => (
                          <Link
                            key={sl.href}
                            href={sl.href}
                            data-testid={`link-rri-vertical-${sl.label.toLowerCase().replace(/\s/g, "-")}`}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs [font-family:'Inter',Helvetica] font-medium transition-all no-underline"
                            style={{ background: `${v.color}15`, border: `1px solid ${v.color}35`, color: v.color }}
                          >
                            <sl.Icon size={12} />
                            {sl.label}
                          </Link>
                        ))
                      ) : (
                        <Link
                          href={v.href}
                          data-testid={`link-rri-vertical-${v.id}`}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs [font-family:'Inter',Helvetica] font-semibold transition-all no-underline"
                          style={{ background: `${v.color}20`, border: `1px solid ${v.color}40`, color: v.color }}
                        >
                          <v.Icon size={13} />
                          Open {v.title}
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>

          </div>
        </main>
      </div>

      <MobileBottomNav />
    </div>
  );
}
