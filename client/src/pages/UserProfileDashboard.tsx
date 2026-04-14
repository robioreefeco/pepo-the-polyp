import { usePrivy } from "@privy-io/react-auth";
import { Link, useSearch } from "wouter";
import { PRIVY_ENABLED } from "@/lib/privy";
import { useState, useEffect } from "react";

function BackIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/>
      <path d="M5 15H4C2.9 15 2 14.1 2 13V4C2 2.9 2.9 2 4 2H13C14.1 2 15 2.9 15 4V5" stroke="currentColor" strokeWidth="2"/>
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M21 18V19C21 20.1 20.1 21 19 21H5C3.89 21 3 20.1 3 19V5C3 3.9 3.89 3 5 3H19C20.1 3 21 3.9 21 5V6H12C10.89 6 10 6.9 10 8V16C10 17.1 10.89 18 12 18H21ZM12 16H22V8H12V16ZM16 13.5C15.17 13.5 14.5 12.83 14.5 12C14.5 11.17 15.17 10.5 16 10.5C16.83 10.5 17.5 11.17 17.5 12C17.5 12.83 16.83 13.5 16 13.5Z" fill="currentColor"/>
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L3 7V12C3 16.55 6.84 20.74 12 22C17.16 20.74 21 16.55 21 12V7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function ActivityIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function CoralIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 22V12M12 12C12 12 8 9 8 5C8 3 10 2 12 2C14 2 16 3 16 5C16 9 12 12 12 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12 12C12 12 6 14 4 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M12 12C12 12 18 14 20 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

const recentActivity = [
  { label: "Submitted reef observation", time: "2h ago", type: "coral" },
  { label: "Voted on Proposal #42 — Thermal Buffer Zone", time: "1d ago", type: "shield" },
  { label: "Connected Phantom wallet", time: "3d ago", type: "wallet" },
  { label: "Joined MesoReef DAO", time: "7d ago", type: "shield" },
];

const badges = [
  { label: "Reef Mapper", color: "#83eef0" },
  { label: "Early Explorer", color: "#f0a83a" },
  { label: "DAO Voter", color: "#a883f0" },
];

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col gap-1 px-5 py-4 rounded-2xl bg-[#ffffff08] border border-[#83eef01a] backdrop-blur-sm">
      <span className="[font-family:'Inter',Helvetica] text-[#d4e9f380] text-xs">{label}</span>
      <span className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-bold text-[#83eef0] text-2xl">{value}</span>
      {sub && <span className="[font-family:'Inter',Helvetica] text-[#d4e9f350] text-[10px]">{sub}</span>}
    </div>
  );
}

function GuestView({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-6 py-20">
      <div className="w-20 h-20 rounded-full bg-[#06232c] border border-[#83eef04c] flex items-center justify-center overflow-hidden">
        <img src="/figmaAssets/pepo-the-polyp-mascot.png" alt="Pepo" className="w-full h-full object-cover" />
      </div>
      <div className="flex flex-col items-center gap-2">
        <h2 className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-bold text-[#d4e9f3] text-xl">Sign in to view your profile</h2>
        <p className="[font-family:'Inter',Helvetica] text-[#d4e9f380] text-sm text-center max-w-xs">
          Connect your wallet, email, or social account to access your MesoReef DAO dashboard.
        </p>
      </div>
      <button
        onClick={onLogin}
        className="px-8 py-3 rounded-full bg-[linear-gradient(170deg,rgba(131,238,240,1)_0%,rgba(63,176,179,1)_100%)] hover:opacity-90 transition-opacity [font-family:'Inter',Helvetica] font-medium text-[#00585a] text-sm"
      >
        Log in / Sign up
      </button>
    </div>
  );
}

export function UserProfileDashboard() {
  const { ready, authenticated, user, login, logout } = PRIVY_ENABLED
    ? usePrivy()
    : { ready: true, authenticated: false, user: null, login: () => {}, logout: () => {} };

  const [copied, setCopied] = useState(false);
  const [orcidId, setOrcidId] = useState<string | null>(null);
  const [orcidName, setOrcidName] = useState<string | null>(null);
  const [orcidError, setOrcidError] = useState<string | null>(null);

  const searchStr = useSearch();

  useEffect(() => {
    const params = new URLSearchParams(searchStr);
    const id = params.get("orcid_id");
    const name = params.get("orcid_name");
    const err = params.get("orcid_error");
    if (id) {
      setOrcidId(id);
      setOrcidName(name ? decodeURIComponent(name) : null);
      window.history.replaceState({}, "", "/profile");
    }
    if (err) {
      setOrcidError(err);
      window.history.replaceState({}, "", "/profile");
    }
  }, [searchStr]);

  const walletAddr = user?.wallet?.address ?? null;
  const email = user?.email?.address ?? null;
  const displayName = email ?? (walletAddr ? walletAddr.slice(0, 6) + "..." + walletAddr.slice(-4) : "Explorer");
  const shortWallet = walletAddr ? walletAddr.slice(0, 8) + "..." + walletAddr.slice(-6) : null;

  function copyWallet() {
    if (walletAddr) {
      navigator.clipboard.writeText(walletAddr);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function connectOrcid() {
    window.location.href = "/api/auth/orcid";
  }

  function getActivityIcon(type: string) {
    if (type === "wallet") return <WalletIcon />;
    if (type === "shield") return <ShieldIcon />;
    return <CoralIcon />;
  }

  return (
    <div className="flex flex-col items-start relative bg-[#00080c] min-h-screen w-full">
      <img
        className="absolute w-full h-full top-0 left-0 object-cover pointer-events-none"
        alt="Background"
        src="/figmaAssets/coral-microbiome-bg.jpg"
      />
      <div className="absolute w-full h-full top-0 left-0 pointer-events-none bg-[#00080c]/75" />

      <div className="relative z-10 w-full flex flex-col min-h-screen">
        {/* Top bar */}
        <div className="flex items-center justify-between px-8 py-4 border-b border-[#ffffff0d] backdrop-blur-md bg-[#00080c60]">
          <Link href="/" className="flex items-center gap-2 text-[#83eef0b2] hover:text-[#83eef0] transition-colors no-underline">
            <BackIcon />
            <span className="[font-family:'Inter',Helvetica] text-sm">Back to App</span>
          </Link>
          <img src="/figmaAssets/mesoreef-dao-logo-new.png" alt="MesoReef DAO" className="h-8 w-auto object-contain" />
          {authenticated ? (
            <button
              onClick={logout}
              className="px-5 py-2 rounded-full bg-[#83eef01a] border border-[#83eef033] text-[#83eef0] [font-family:'Inter',Helvetica] text-sm hover:bg-[#83eef033] transition-colors"
            >
              Sign Out
            </button>
          ) : (
            <button
              onClick={login}
              className="px-5 py-2 rounded-full bg-[linear-gradient(170deg,rgba(131,238,240,1)_0%,rgba(63,176,179,1)_100%)] text-[#00585a] [font-family:'Inter',Helvetica] text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Log in
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 max-w-4xl mx-auto w-full px-6 py-10 flex flex-col gap-8">
          {!ready ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 rounded-full border-2 border-[#83eef0] border-t-transparent animate-spin" />
            </div>
          ) : !authenticated ? (
            <GuestView onLogin={login} />
          ) : (
            <>
              {/* Profile card */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 p-6 rounded-3xl bg-[#ffffff08] border border-[#83eef01a] backdrop-blur-sm">
                <div className="w-20 h-20 rounded-full bg-[#06232c] border-2 border-[#83eef04c] flex-shrink-0 overflow-hidden">
                  <img src="/figmaAssets/pepo-the-polyp-mascot.png" alt="Avatar" className="w-full h-full object-cover" />
                </div>
                <div className="flex flex-col gap-2 flex-1 min-w-0">
                  <h1 className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-bold text-[#d4e9f3] text-2xl truncate">
                    {displayName}
                  </h1>
                  <div className="flex flex-wrap gap-2">
                    {badges.map((b) => (
                      <span
                        key={b.label}
                        className="px-3 py-0.5 rounded-full text-[10px] [font-family:'Inter',Helvetica] font-medium border"
                        style={{ color: b.color, borderColor: b.color + "55", backgroundColor: b.color + "15" }}
                      >
                        {b.label}
                      </span>
                    ))}
                  </div>
                  {shortWallet && (
                    <button
                      onClick={copyWallet}
                      className="flex items-center gap-1.5 text-[#d4e9f366] hover:text-[#d4e9f3] transition-colors w-fit"
                    >
                      <WalletIcon />
                      <span className="[font-family:'Inter',Helvetica] text-xs font-mono">{shortWallet}</span>
                      <CopyIcon />
                      {copied && <span className="text-[#83eef0] text-[10px]">Copied!</span>}
                    </button>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="px-3 py-1 rounded-full bg-[#83eef01a] border border-[#83eef033] text-[#83eef0] [font-family:'Inter',Helvetica] text-xs">
                    Active Member
                  </span>
                  <span className="[font-family:'Inter',Helvetica] text-[#d4e9f350] text-[10px]">MesoReef DAO</span>
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard label="Reef Score" value="742" sub="Top 12%" />
                <StatCard label="Contributions" value="28" sub="This month" />
                <StatCard label="DAO Votes" value="14" sub="Lifetime" />
                <StatCard label="Points" value="1,240" sub="Lifetime" />
              </div>

              {/* Linked accounts + Activity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Linked accounts */}
                <div className="flex flex-col gap-4 p-5 rounded-3xl bg-[#ffffff08] border border-[#83eef01a] backdrop-blur-sm">
                  <div className="flex items-center gap-2 text-[#d4e9f3b2]">
                    <ShieldIcon />
                    <span className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-semibold text-sm">Connected Accounts</span>
                  </div>
                  <div className="flex flex-col gap-3">
                    {email && (
                      <div className="flex items-center justify-between py-2 border-b border-[#ffffff08]">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[#83eef020] flex items-center justify-center">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="#83eef0" strokeWidth="2"/><polyline points="22,6 12,13 2,6" stroke="#83eef0" strokeWidth="2"/></svg>
                          </div>
                          <span className="[font-family:'Inter',Helvetica] text-[#d4e9f3] text-sm">{email}</span>
                        </div>
                        <span className="text-[#83eef0] text-[10px] [font-family:'Inter',Helvetica]">Verified</span>
                      </div>
                    )}
                    {walletAddr && (
                      <div className="flex items-center justify-between py-2 border-b border-[#ffffff08]">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[#83eef020] flex items-center justify-center text-[#83eef0]">
                            <WalletIcon />
                          </div>
                          <span className="[font-family:'Inter',Helvetica] text-[#d4e9f3] text-sm font-mono">
                            {walletAddr.slice(0, 6)}…{walletAddr.slice(-4)}
                          </span>
                        </div>
                        <span className="text-[#83eef0] text-[10px] [font-family:'Inter',Helvetica]">Connected</span>
                      </div>
                    )}
                    {/* ORCID */}
                    {orcidId ? (
                      <div className="flex items-center justify-between py-2 border-b border-[#ffffff08]">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[#a6ce3920] flex items-center justify-center">
                            <span className="text-[#a6ce39] font-bold text-[10px]">iD</span>
                          </div>
                          <div className="flex flex-col">
                            {orcidName && <span className="[font-family:'Inter',Helvetica] text-[#d4e9f3] text-xs">{orcidName}</span>}
                            <span className="[font-family:'Inter',Helvetica] text-[#d4e9f366] text-[10px] font-mono">{orcidId}</span>
                          </div>
                        </div>
                        <span className="text-[#a6ce39] text-[10px] [font-family:'Inter',Helvetica]">ORCID</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between py-2 border-b border-[#ffffff08]">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[#a6ce3920] flex items-center justify-center">
                            <span className="text-[#a6ce39] font-bold text-[10px]">iD</span>
                          </div>
                          <span className="[font-family:'Inter',Helvetica] text-[#d4e9f380] text-sm">ORCID iD</span>
                        </div>
                        <button
                          onClick={connectOrcid}
                          className="px-3 py-1 rounded-full bg-[#a6ce3920] border border-[#a6ce3933] text-[#a6ce39] [font-family:'Inter',Helvetica] text-[10px] hover:bg-[#a6ce3930] transition-colors"
                        >
                          Connect
                        </button>
                      </div>
                    )}
                    {orcidError && (
                      <p className="[font-family:'Inter',Helvetica] text-red-400 text-[10px]">ORCID error: {orcidError}</p>
                    )}
                    {!email && !walletAddr && !orcidId && (
                      <p className="[font-family:'Inter',Helvetica] text-[#d4e9f350] text-xs">No linked accounts yet.</p>
                    )}
                  </div>
                </div>

                {/* Recent activity */}
                <div className="flex flex-col gap-4 p-5 rounded-3xl bg-[#ffffff08] border border-[#83eef01a] backdrop-blur-sm">
                  <div className="flex items-center gap-2 text-[#d4e9f3b2]">
                    <ActivityIcon />
                    <span className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-semibold text-sm">Recent Activity</span>
                  </div>
                  <div className="flex flex-col gap-3">
                    {recentActivity.map((item, i) => (
                      <div key={i} className="flex items-start gap-3 py-1.5 border-b border-[#ffffff08] last:border-0">
                        <div className="w-6 h-6 rounded-full bg-[#83eef015] flex items-center justify-center flex-shrink-0 text-[#83eef0] mt-0.5">
                          {getActivityIcon(item.type)}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="[font-family:'Inter',Helvetica] text-[#d4e9f3b2] text-xs leading-4">{item.label}</span>
                          <span className="[font-family:'Inter',Helvetica] text-[#d4e9f350] text-[10px]">{item.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bio / about section */}
              <div className="flex flex-col gap-3 p-5 rounded-3xl bg-[#ffffff08] border border-[#83eef01a] backdrop-blur-sm">
                <span className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-semibold text-[#d4e9f3b2] text-sm">About</span>
                <p className="[font-family:'Inter',Helvetica] text-[#d4e9f380] text-sm leading-6">
                  Explorer and contributor to the MesoAmerican Reef knowledge network. Passionate about coral conservation, DeSci, and regenerative ocean economies.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="relative z-10 flex items-center justify-center py-4 border-t border-[#ffffff08]">
          <span className="[font-family:'Inter',Helvetica] text-[#d4e9f333] text-[10px]">
            MesoReef DAO · Powered by{" "}
            <a href="https://bonfires.ai" target="_blank" rel="noopener noreferrer" className="underline text-[#d4e9f355] hover:text-[#d4e9f3]">
              Bonfires.ai
            </a>
          </span>
        </div>
      </div>
    </div>
  );
}
