import { Link } from "wouter";
import { useState, useEffect } from "react";
import { ArrowLeft, ExternalLink, FileText, Table2, Lock, Globe, Zap, Users, ImageIcon } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import { IPFSImageUpload } from "@/components/IPFSImageUpload";
import { ipfsPublicUrl } from "@/lib/ipfs";
import { FileverseWorkspacePanel } from "@/components/FileverseWorkspacePanel";

const PRIVY_ENABLED = !!import.meta.env.VITE_PRIVY_APP_ID;

const TOOLS = [
  {
    id: "ddocs",
    name: "dDocs",
    tagline: "Decentralized Document Editor",
    description:
      "Create, collaborate and share research documents — end-to-end encrypted, stored on IPFS. No account needed. Works like Google Docs but fully self-sovereign. Ideal for field reports, species assessments, and DAO proposals.",
    href: "https://ddocs.new",
    color: "#48dbfb",
    icon: <FileText size={28} strokeWidth={1.5} />,
    useCases: ["Field research reports", "Species monitoring logs", "DAO proposals & governance docs", "Reef restoration protocols"],
  },
  {
    id: "dsheets",
    name: "dSheets",
    tagline: "Decentralized Spreadsheet",
    description:
      "Query, read and manipulate data with a no-code interface. Built on the same privacy-first infrastructure as dDocs. Ideal for coral monitoring datasets, biodiversity records, and on-chain treasury data.",
    href: "https://dsheets.new",
    color: "#1dd1a1",
    icon: <Table2 size={28} strokeWidth={1.5} />,
    useCases: ["Coral health datasets", "Biodiversity species counts", "Reef monitoring time-series", "DAO treasury & on-chain data"],
  },
];

const PRINCIPLES = [
  { icon: <Lock size={16} />, label: "End-to-end encrypted" },
  { icon: <Globe size={16} />, label: "Stored on IPFS" },
  { icon: <Zap size={16} />, label: "No account required" },
  { icon: <Users size={16} />, label: "Real-time collaboration" },
];

export function WorkspacePage() {
  const [archivedImages, setArchivedImages] = useState<{ cid: string; localUrl: string; mimeType: string }[]>([]);
  const [privyToken, setPrivyToken] = useState<string | undefined>(undefined);

  const { authenticated, getAccessToken } = PRIVY_ENABLED
    ? usePrivy()
    : { authenticated: false, getAccessToken: async () => null as string | null };

  useEffect(() => {
    if (!authenticated) return;
    getAccessToken().then((t) => { if (t) setPrivyToken(t); }).catch(() => {});
  }, [authenticated]);

  function handleArchiveUpload(result: { cid: string; localUrl: string; mimeType: string }) {
    setArchivedImages(prev => {
      if (prev.some(img => img.cid === result.cid)) return prev;
      return [result, ...prev];
    });
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#00080c",
        fontFamily: "Inter, sans-serif",
        color: "#d4e9f3",
      }}
    >
      {/* ── Header ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "14px 24px",
        background: "rgba(0,19,28,0.97)",
        borderBottom: "1px solid rgba(131,238,240,0.12)",
        position: "sticky", top: 0, zIndex: 50,
      }}>
        <Link href="/">
          <button
            data-testid="workspace-back"
            style={{
              background: "rgba(131,238,240,0.08)", border: "1px solid rgba(131,238,240,0.18)",
              borderRadius: 10, padding: "8px 14px", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6,
              color: "#83eef0cc", fontSize: 12, fontWeight: 600,
            }}
          >
            <ArrowLeft size={14} color="#83eef0" /> Back
          </button>
        </Link>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#83eef0", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            Reef Workspace
          </div>
          <div style={{ fontSize: 9.5, color: "#d4e9f344", marginTop: 1 }}>
            Powered by Fileverse · Decentralised collaboration tools
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 20px 80px" }}>

        {/* ── Hero ── */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "rgba(131,238,240,0.06)", border: "1px solid rgba(131,238,240,0.15)",
            borderRadius: 24, padding: "6px 16px", marginBottom: 20,
          }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#1dd1a1", display: "inline-block" }}/>
            <span style={{ fontSize: 11, color: "#83eef0bb", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Fileverse · Open Source
            </span>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#d4e9f3", margin: "0 0 12px", lineHeight: 1.2 }}>
            Collaborate on coral science.<br />
            <span style={{ color: "#83eef0" }}>Privately. Decentralised.</span>
          </h1>
          <p style={{ fontSize: 14, color: "#9aaeb8", maxWidth: 520, margin: "0 auto 24px", lineHeight: 1.7 }}>
            MesoReef DAO's workspace is built on Fileverse — privacy-first, end-to-end encrypted
            collaboration tools that run on IPFS. No Google. No Microsoft. No central servers.
          </p>

          {/* Principles */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
            {PRINCIPLES.map(({ icon, label }) => (
              <div key={label} style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "rgba(131,238,240,0.05)", border: "1px solid rgba(131,238,240,0.12)",
                borderRadius: 20, padding: "5px 12px",
              }}>
                <span style={{ color: "#83eef0" }}>{icon}</span>
                <span style={{ fontSize: 11, color: "#83eef0aa" }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Wallet / Fileverse connection status ── */}
        <FileverseWorkspacePanel variant="page" />

        {/* ── Tool Cards ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20, marginBottom: 40 }}>
          {TOOLS.map((tool) => (
            <div
              key={tool.id}
              data-testid={`workspace-card-${tool.id}`}
              style={{
                background: `${tool.color}08`,
                border: `1px solid ${tool.color}25`,
                borderRadius: 20,
                padding: "24px",
                transition: "border-color 0.2s",
              }}
            >
              {/* Card header */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 16 }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                  background: `${tool.color}15`, border: `1px solid ${tool.color}30`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: tool.color,
                }}>
                  {tool.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                    <h2 style={{ fontSize: 20, fontWeight: 800, color: "#d4e9f3", margin: 0 }}>{tool.name}</h2>
                    <span style={{
                      fontSize: 10, fontWeight: 700, color: tool.color,
                      background: `${tool.color}18`, border: `1px solid ${tool.color}33`,
                      borderRadius: 20, padding: "2px 8px", letterSpacing: "0.04em",
                    }}>
                      Public Beta
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: `${tool.color}99`, margin: 0, fontWeight: 600 }}>{tool.tagline}</p>
                </div>
              </div>

              <p style={{ fontSize: 13.5, color: "#9aaeb8", lineHeight: 1.7, margin: "0 0 18px" }}>
                {tool.description}
              </p>

              {/* Use cases */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: `${tool.color}66`, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
                  Use cases for MesoReef DAO
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {tool.useCases.map((uc) => (
                    <span key={uc} style={{
                      fontSize: 11, color: `${tool.color}bb`,
                      background: `${tool.color}0d`, border: `1px solid ${tool.color}22`,
                      borderRadius: 20, padding: "3px 10px",
                    }}>{uc}</span>
                  ))}
                </div>
              </div>

              {/* Launch button */}
              <a
                href={tool.href}
                target="_blank"
                rel="noopener noreferrer"
                data-testid={`launch-${tool.id}`}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  background: `linear-gradient(135deg, ${tool.color}cc, ${tool.color}88)`,
                  color: "#00131c",
                  fontWeight: 700, fontSize: 13,
                  borderRadius: 12, padding: "11px 22px",
                  textDecoration: "none",
                  transition: "opacity 0.15s",
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
                onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
              >
                <ExternalLink size={14} />
                Open {tool.name}
              </a>
            </div>
          ))}
        </div>

        {/* ── Coral Reef Image Archive ── */}
        <div
          data-testid="workspace-image-archive"
          style={{
            background: "rgba(131,238,240,0.03)", border: "1px solid rgba(131,238,240,0.12)",
            borderRadius: 20, padding: "24px", marginBottom: 24,
          }}
        >
          {/* Section header */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12, flexShrink: 0,
              background: "rgba(255,190,105,0.1)", border: "1px solid rgba(255,190,105,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#ffbe69",
            }}>
              <ImageIcon size={20} strokeWidth={1.5} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: "#d4e9f3", margin: 0 }}>
                  Coral Reef Image Archive
                </h2>
                <span style={{
                  fontSize: 9, fontWeight: 700, color: "#ffbe69",
                  background: "rgba(255,190,105,0.12)", border: "1px solid rgba(255,190,105,0.25)",
                  borderRadius: 20, padding: "2px 8px", letterSpacing: "0.04em",
                }}>
                  IPFS · Helia
                </span>
              </div>
              <p style={{ fontSize: 12, color: "#9aaeb8", margin: "2px 0 0" }}>
                Pin field photos and reef imagery to IPFS — permanently addressable, censorship-resistant.
              </p>
            </div>
          </div>

          {/* Regen Reef Workspace — quick-launch inside archive section */}
          <div style={{ marginBottom: 16 }}>
            <div style={{
              fontSize: 9, fontWeight: 700, color: "#ffbe6955",
              letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8,
            }}>
              Regen Reef Workspace
            </div>
            <FileverseWorkspacePanel variant="page" />
          </div>

          {/* Upload zone */}
          <IPFSImageUpload
            label="Add reef image to IPFS"
            onUpload={handleArchiveUpload}
            showMapPin={true}
            privyToken={privyToken}
          />

          {/* Uploaded images grid */}
          {archivedImages.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div style={{
                fontSize: 9, fontWeight: 700, color: "#ffbe6955", letterSpacing: "0.1em",
                textTransform: "uppercase", marginBottom: 10,
              }}>
                Session archive — {archivedImages.length} image{archivedImages.length !== 1 ? "s" : ""}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 10 }}>
                {archivedImages.map((img) => (
                  <a
                    key={img.cid}
                    href={ipfsPublicUrl(img.cid)}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid={`archive-img-${img.cid.slice(-6)}`}
                    style={{ display: "block", textDecoration: "none", borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,190,105,0.15)" }}
                    title={img.cid}
                  >
                    <img
                      src={img.localUrl}
                      alt="Archived reef image"
                      style={{ width: "100%", aspectRatio: "1", objectFit: "cover", display: "block" }}
                    />
                    <div style={{
                      padding: "5px 7px", background: "rgba(0,8,12,0.6)",
                      fontSize: 8, color: "#ffbe6977", fontFamily: "monospace",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {img.cid.slice(0, 16)}…
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── About Fileverse ── */}
        <div style={{
          background: "rgba(131,238,240,0.04)", border: "1px solid rgba(131,238,240,0.1)",
          borderRadius: 16, padding: "20px 24px",
        }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: "#83eef055", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>
            About Fileverse
          </div>
          <p style={{ fontSize: 12.5, color: "#9aaeb8", lineHeight: 1.7, margin: "0 0 14px" }}>
            Fileverse is an end-to-end encrypted, decentralised alternative to Google Workspace and Microsoft Office.
            Built on open standards — IPFS, Ethereum — it guarantees data sovereignty and privacy by design.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {[
              { label: "GitHub", href: "https://github.com/fileverse" },
              { label: "fileverse.io", href: "https://fileverse.io" },
              { label: "ddocs.new", href: "https://ddocs.new" },
              { label: "dsheets.new", href: "https://dsheets.new" },
            ].map(({ label, href }) => (
              <a key={href} href={href} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 11, color: "#83eef088", textDecoration: "none" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#83eef0")}
                onMouseLeave={e => (e.currentTarget.style.color = "#83eef088")}
              >
                ↗ {label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
