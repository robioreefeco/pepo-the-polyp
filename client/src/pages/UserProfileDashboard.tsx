import { usePrivy } from "@privy-io/react-auth";
import { Link, useSearch } from "wouter";
import { PRIVY_ENABLED } from "@/lib/privy";
import { useState, useEffect, useRef } from "react";

function BackIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/>
      <path d="M5 15H4C2.9 15 2 14.1 2 13V4C2 2.9 2.9 2 4 2H13C14.1 2 15 2.9 15 4V5" stroke="currentColor" strokeWidth="2"/>
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M21 18V19C21 20.1 20.1 21 19 21H5C3.89 21 3 20.1 3 19V5C3 3.9 3.89 3 5 3H19C20.1 3 21 3.9 21 5V6H12C10.89 6 10 6.9 10 8V16C10 17.1 10.89 18 12 18H21ZM12 16H22V8H12V16ZM16 13.5C15.17 13.5 14.5 12.83 14.5 12C14.5 11.17 15.17 10.5 16 10.5C16.83 10.5 17.5 11.17 17.5 12C17.5 12.83 16.83 13.5 16 13.5Z" fill="currentColor"/>
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M12 2L3 7V12C3 16.55 6.84 20.74 12 22C17.16 20.74 21 16.55 21 12V7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function ActivityIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function CoralIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M12 22V12M12 12C12 12 8 9 8 5C8 3 10 2 12 2C14 2 16 3 16 5C16 9 12 12 12 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12 12C12 12 6 14 4 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M12 12C12 12 18 14 20 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M18.5 2.5C18.8978 2.10217 19.4374 1.87868 20 1.87868C20.5626 1.87868 21.1022 2.10217 21.5 2.5C21.8978 2.89782 22.1213 3.43739 22.1213 4C22.1213 4.56261 21.8978 5.10218 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M23 19C23 19.5304 22.7893 20.0391 22.4142 20.4142C22.0391 20.7893 21.5304 21 21 21H3C2.46957 21 1.96086 20.7893 1.58579 20.4142C1.21071 20.0391 1 19.5304 1 19V8C1 7.46957 1.21071 6.96086 1.58579 6.58579C1.96086 6.21071 2.46957 6 3 6H7L9 3H15L17 6H21C21.5304 6 22.0391 6.21071 22.4142 6.58579C22.7893 6.96086 23 7.46957 23 8V19Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="12" cy="13" r="4" stroke="white" strokeWidth="2"/>
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

const DEFAULT_BIO = "Explorer and contributor to the MesoAmerican Reef knowledge network. Passionate about coral conservation, DeSci, and regenerative ocean economies.";

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

  // Profile image — stored in localStorage as base64
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bio — stored in localStorage
  const [bio, setBio] = useState(DEFAULT_BIO);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioInput, setBioInput] = useState(DEFAULT_BIO);

  const searchStr = useSearch();

  // Load persisted profile data on mount
  useEffect(() => {
    const savedImage = localStorage.getItem("pepo_profile_image");
    if (savedImage) setProfileImage(savedImage);

    const savedBio = localStorage.getItem("pepo_profile_bio");
    if (savedBio) {
      setBio(savedBio);
      setBioInput(savedBio);
    }
  }, []);

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

  // Handle profile image upload
  function handleAvatarClick() {
    fileInputRef.current?.click();
  }

  function handleImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be under 5 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setProfileImage(dataUrl);
      localStorage.setItem("pepo_profile_image", dataUrl);
    };
    reader.readAsDataURL(file);
    // Reset so the same file can be re-selected
    e.target.value = "";
  }

  // Bio editing
  function startEditBio() {
    setBioInput(bio);
    setIsEditingBio(true);
  }

  function saveBio() {
    const trimmed = bioInput.trim() || DEFAULT_BIO;
    setBio(trimmed);
    setBioInput(trimmed);
    localStorage.setItem("pepo_profile_bio", trimmed);
    setIsEditingBio(false);
  }

  function cancelEditBio() {
    setBioInput(bio);
    setIsEditingBio(false);
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
        <div className="flex items-center justify-between px-4 md:px-8 py-4 border-b border-[#ffffff0d] backdrop-blur-md bg-[#00080c60]">
          <Link href="/" className="flex items-center gap-2 text-[#83eef0b2] hover:text-[#83eef0] transition-colors no-underline">
            <BackIcon />
            <span className="[font-family:'Inter',Helvetica] text-sm">Back</span>
          </Link>
          <img src="/figmaAssets/mesoreef-dao-logo-new.png" alt="MesoReef DAO" className="h-8 w-auto object-contain" />
          {authenticated ? (
            <button
              onClick={logout}
              className="px-4 md:px-5 py-2 rounded-full bg-[#83eef01a] border border-[#83eef033] text-[#83eef0] [font-family:'Inter',Helvetica] text-sm hover:bg-[#83eef033] transition-colors"
            >
              Sign Out
            </button>
          ) : (
            <button
              onClick={login}
              className="px-4 md:px-5 py-2 rounded-full bg-[linear-gradient(170deg,rgba(131,238,240,1)_0%,rgba(63,176,179,1)_100%)] text-[#00585a] [font-family:'Inter',Helvetica] text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Log in
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 max-w-4xl mx-auto w-full px-4 md:px-6 py-8 md:py-10 flex flex-col gap-6 md:gap-8 pb-24 md:pb-10">
          {!ready ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 rounded-full border-2 border-[#83eef0] border-t-transparent animate-spin" />
            </div>
          ) : !authenticated ? (
            <GuestView onLogin={login} />
          ) : (
            <>
              {/* Profile card */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 p-5 md:p-6 rounded-3xl bg-[#ffffff08] border border-[#83eef01a] backdrop-blur-sm">

                {/* Avatar with upload overlay */}
                <div className="relative flex-shrink-0 group cursor-pointer" onClick={handleAvatarClick} title="Change profile photo">
                  <div className="w-20 h-20 rounded-full bg-[#06232c] border-2 border-[#83eef04c] overflow-hidden">
                    {profileImage ? (
                      <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <img src="/figmaAssets/pepo-the-polyp-mascot.png" alt="Avatar" className="w-full h-full object-cover" />
                    )}
                  </div>
                  {/* Camera overlay on hover */}
                  <div className="absolute inset-0 rounded-full bg-[#00000080] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <CameraIcon />
                  </div>
                  {/* Small camera badge */}
                  <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-[#3fb0b3] border-2 border-[#00080c] flex items-center justify-center">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                      <path d="M23 19C23 19.5304 22.7893 20.0391 22.4142 20.4142C22.0391 20.7893 21.5304 21 21 21H3C2.46957 21 1.96086 20.7893 1.58579 20.4142C1.21071 20.0391 1 19.5304 1 19V8C1 7.46957 1.21071 6.96086 1.58579 6.58579C1.96086 6.21071 2.46957 6 3 6H7L9 3H15L17 6H21C21.5304 6 22.0391 6.21071 22.4142 6.58579C22.7893 6.96086 23 7.46957 23 8V19Z" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="12" cy="13" r="3" stroke="white" strokeWidth="2.5"/>
                    </svg>
                  </div>
                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageFile}
                  />
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

              {/* About / Bio — editable */}
              <div className="flex flex-col gap-3 p-5 rounded-3xl bg-[#ffffff08] border border-[#83eef01a] backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <span className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-semibold text-[#d4e9f3b2] text-sm">About</span>
                  {!isEditingBio ? (
                    <button
                      onClick={startEditBio}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#83eef010] border border-[#83eef020] text-[#83eef0b2] hover:text-[#83eef0] hover:bg-[#83eef01a] transition-colors [font-family:'Inter',Helvetica] text-xs"
                    >
                      <PencilIcon />
                      Edit
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={cancelEditBio}
                        className="px-3 py-1 rounded-full bg-[#ffffff0a] border border-[#ffffff15] text-[#d4e9f380] hover:text-[#d4e9f3] transition-colors [font-family:'Inter',Helvetica] text-xs"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={saveBio}
                        className="px-3 py-1 rounded-full bg-[linear-gradient(170deg,rgba(131,238,240,1)_0%,rgba(63,176,179,1)_100%)] text-[#00585a] [font-family:'Inter',Helvetica] text-xs font-medium hover:opacity-90 transition-opacity"
                      >
                        Save
                      </button>
                    </div>
                  )}
                </div>

                {isEditingBio ? (
                  <textarea
                    value={bioInput}
                    onChange={(e) => setBioInput(e.target.value)}
                    maxLength={400}
                    rows={4}
                    placeholder="Tell the reef community about yourself..."
                    className="w-full bg-[#00000040] border border-[#83eef033] rounded-2xl px-4 py-3 text-[#d4e9f3] [font-family:'Inter',Helvetica] text-sm leading-6 placeholder:text-[#d4e9f340] outline-none focus:border-[#83eef066] resize-none transition-colors"
                  />
                ) : (
                  <p className="[font-family:'Inter',Helvetica] text-[#d4e9f380] text-sm leading-6">
                    {bio || <span className="italic text-[#d4e9f340]">No description yet — click Edit to add one.</span>}
                  </p>
                )}

                {isEditingBio && (
                  <span className="[font-family:'Inter',Helvetica] text-[#d4e9f340] text-[10px] self-end">
                    {bioInput.length}/400
                  </span>
                )}
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
            </>
          )}
        </div>

        {/* Footer */}
        <div className="relative z-10 flex items-center justify-center py-4 border-t border-[#ffffff08]">
          <span className="[font-family:'Inter',Helvetica] text-[#d4e9f333] text-[10px]">
            MesoReef DAO · Powered by{" "}
            <a href="https://bonfires.ai" target="_blank" rel="noopener noreferrer" className="text-[#d4e9f355] hover:text-[#d4e9f3] transition-colors">
              Bonfires.ai
            </a>
          </span>
        </div>
      </div>
    </div>
  );
}
