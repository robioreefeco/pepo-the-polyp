import { usePrivy, useWallets } from "@privy-io/react-auth";
import { Link, useSearch } from "wouter";
import { PRIVY_ENABLED } from "@/lib/privy";
import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useCeramicProfile } from "@/hooks/use-ceramic-profile";
import { ceramicStreamUrl } from "@/lib/ceramic";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { useOrcidAuth } from "@/hooks/use-orcid-auth";
import { OrcidLoginButton } from "@/components/OrcidLoginButton";

// ─── Icons ────────────────────────────────────────────────────────────────────
function BackIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function CopyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/>
      <path d="M5 15H4C2.9 15 2 14.1 2 13V4C2 2.9 2.9 2 4 2H13C14.1 2 15 2.9 15 4V5" stroke="currentColor" strokeWidth="2"/>
    </svg>
  );
}
function WalletIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path d="M21 18V19C21 20.1 20.1 21 19 21H5C3.89 21 3 20.1 3 19V5C3 3.9 3.89 3 5 3H19C20.1 3 21 3.9 21 5V6H12C10.89 6 10 6.9 10 8V16C10 17.1 10.89 18 12 18H21ZM12 16H22V8H12V16ZM16 13.5C15.17 13.5 14.5 12.83 14.5 12C14.5 11.17 15.17 10.5 16 10.5C16.83 10.5 17.5 11.17 17.5 12C17.5 12.83 16.83 13.5 16 13.5Z" fill="currentColor"/>
    </svg>
  );
}
function ShieldIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path d="M12 2L3 7V12C3 16.55 6.84 20.74 12 22C17.16 20.74 21 16.55 21 12V7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function UploadIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points="17 8 12 3 7 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="12" y1="3" x2="12" y2="15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  );
}
function LinkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
function MapPinIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2"/>
    </svg>
  );
}
function GoogleIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}
function XIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.743l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.912-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  );
}
function LinkedInIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="#0A66C2">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────
const SPECIALIZATIONS = [
  "Coral Biology", "Marine Ecology", "Climate Science", "DeSci",
  "Ocean Conservation", "Reef Monitoring", "Genomics", "Data Science",
  "DAO Governance", "Regenerative Finance",
];

const DEFAULT_BIO = "";

// ─── Guest view ───────────────────────────────────────────────────────────────
function GuestView({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-8 py-16 px-4">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-[#06232c] border-2 border-[#83eef04c] flex items-center justify-center overflow-hidden">
            <img src="/figmaAssets/pepo-the-polyp-mascot.png" alt="Pepo" className="w-full h-full object-cover" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#83eef0] flex items-center justify-center shadow-lg">
            <span className="text-[#00585a] font-bold text-sm">?</span>
          </div>
        </div>
        <div className="flex flex-col items-center gap-2 text-center">
          <h2 className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-bold text-[#d4e9f3] text-2xl">
            Create your Profile
          </h2>
          <p className="[font-family:'Inter',Helvetica] text-[#d4e9f380] text-sm max-w-sm leading-6">
            Sign in to build your MesoReef DAO identity — upload a photo, write your bio, and connect your research credentials.
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-3 items-center w-full max-w-xs">
        <button
          onClick={onLogin}
          data-testid="button-guest-login"
          className="w-full px-8 py-3 rounded-xl bg-[linear-gradient(170deg,rgba(131,238,240,1)_0%,rgba(63,176,179,1)_100%)] hover:opacity-90 transition-opacity [font-family:'Inter',Helvetica] font-semibold text-[#00585a] text-sm shadow-lg"
        >
          Log in / Sign up
        </button>
        <div className="flex items-center gap-3 w-full">
          <div className="flex-1 h-px bg-[#ffffff15]" />
          <span className="[font-family:'Inter',Helvetica] text-[#d4e9f340] text-xs">or</span>
          <div className="flex-1 h-px bg-[#ffffff15]" />
        </div>
        <OrcidLoginButton className="w-full" label="Sign in with ORCID iD" size="md" />
        <p className="[font-family:'Inter',Helvetica] text-[#d4e9f333] text-[10px] text-center leading-4">
          ORCID provides researchers with a permanent digital identifier.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg w-full mt-4">
        {[
          { icon: "🪸", title: "Reef Score", desc: "Track your conservation contributions" },
          { icon: "🔬", title: "Research ID", desc: "Link your ORCID and publications" },
          { icon: "🗳️", title: "DAO Voting", desc: "Participate in governance decisions" },
        ].map((f) => (
          <div key={f.title} className="flex flex-col gap-2 p-4 rounded-2xl bg-[#ffffff06] border border-[#83eef015] text-center">
            <span className="text-2xl">{f.icon}</span>
            <span className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-semibold text-[#d4e9f3] text-xs">{f.title}</span>
            <span className="[font-family:'Inter',Helvetica] text-[#d4e9f350] text-[10px] leading-4">{f.desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Photo upload zone ────────────────────────────────────────────────────────
function PhotoUpload({
  image, onChange,
}: { image: string | null; onChange: (url: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) { alert("Image must be under 5 MB."); return; }
    const reader = new FileReader();
    reader.onload = (e) => onChange(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className={`relative group cursor-pointer transition-all ${dragging ? "scale-105" : ""}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        data-testid="input-photo-upload"
      >
        {/* Avatar ring */}
        <div className={`w-28 h-28 rounded-full overflow-hidden border-2 transition-colors ${dragging ? "border-[#83eef0]" : "border-[#83eef04c] group-hover:border-[#83eef099]"} bg-[#06232c] shadow-[0_0_24px_rgba(131,238,240,0.15)]`}>
          {image ? (
            <img src={image} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-[#83eef060] group-hover:text-[#83eef0b2] transition-colors">
              <UploadIcon />
              <span className="[font-family:'Inter',Helvetica] text-[9px] text-center px-2 leading-3">
                Drop or click
              </span>
            </div>
          )}
        </div>

        {/* Edit badge */}
        <div className={`absolute bottom-0.5 right-0.5 w-8 h-8 rounded-full flex items-center justify-center border-2 border-[#00080c] transition-colors shadow-md ${image ? "bg-[#3fb0b3]" : "bg-[#3fb0b380] group-hover:bg-[#3fb0b3]"}`}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path d="M23 19C23 19.5304 22.7893 20.0391 22.4142 20.4142C22.0391 20.7893 21.5304 21 21 21H3C2.46957 21 1.96086 20.7893 1.58579 20.4142C1.21071 20.0391 1 19.5304 1 19V8C1 7.46957 1.21071 6.96086 1.58579 6.58579C1.96086 6.21071 2.46957 6 3 6H7L9 3H15L17 6H21C21.5304 6 22.0391 6.21071 22.4142 6.58579C22.7893 6.96086 23 7.46957 23 8V19Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="12" cy="13" r="3" stroke="white" strokeWidth="2"/>
          </svg>
        </div>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onInputChange} />
      </div>
      <div className="flex flex-col items-center gap-1">
        <p className="[font-family:'Inter',Helvetica] text-[#d4e9f3b2] text-xs font-medium">Profile Photo</p>
        <p className="[font-family:'Inter',Helvetica] text-[#d4e9f350] text-[10px]">JPG, PNG, GIF · max 5 MB</p>
      </div>
    </div>
  );
}

// ─── Field wrapper ────────────────────────────────────────────────────────────
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <label className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-semibold text-[#d4e9f3b2] text-xs uppercase tracking-wider">
          {label}
        </label>
        {hint && <span className="[font-family:'Inter',Helvetica] text-[#d4e9f340] text-[10px]">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

const inputCls = "w-full bg-[#00000050] border border-[#83eef020] rounded-2xl px-4 py-3 text-[#d4e9f3] [font-family:'Inter',Helvetica] text-sm placeholder:text-[#d4e9f330] outline-none focus:border-[#83eef066] transition-colors";

// ─── Connected Accounts mini-panel ────────────────────────────────────────────
function LinkedAccountsRow({ user }: { user: any }) {
  const { linkGoogle, linkTwitter, linkLinkedIn, linkEmail, linkWallet } = usePrivy();
  const linked = user?.linkedAccounts ?? [];

  const has = (type: string) => linked.some((a: any) => a.type === type);

  const accounts = [
    { type: "email", icon: <span className="text-[#83eef0] text-[9px] font-bold">@</span>, label: "Email", onLink: linkEmail },
    { type: "google_oauth", icon: <GoogleIcon />, label: "Google", onLink: linkGoogle },
    { type: "twitter_oauth", icon: <XIcon />, label: "X", onLink: linkTwitter },
    { type: "linkedin_oauth", icon: <LinkedInIcon />, label: "LinkedIn", onLink: linkLinkedIn },
    { type: "wallet", icon: <WalletIcon />, label: "Wallet", onLink: () => linkWallet() },
  ];

  return (
    <div className="flex flex-col gap-2">
      <label className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-semibold text-[#d4e9f3b2] text-xs uppercase tracking-wider">
        Linked Accounts
      </label>
      <div className="flex flex-wrap gap-2">
        {accounts.map((a) => (
          has(a.type) ? (
            <div
              key={a.type}
              data-testid={`status-linked-${a.type}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#83eef015] border border-[#83eef033] text-[#83eef0]"
              title={`${a.label} connected`}
            >
              {a.icon}
              <span className="[font-family:'Inter',Helvetica] text-[10px]">{a.label}</span>
              <CheckIcon />
            </div>
          ) : (
            <button
              key={a.type}
              onClick={a.onLink}
              data-testid={`button-link-${a.type}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#ffffff08] border border-[#ffffff12] text-[#d4e9f366] hover:text-[#d4e9f3b2] hover:bg-[#ffffff10] transition-colors"
              title={`Link ${a.label}`}
            >
              {a.icon}
              <span className="[font-family:'Inter',Helvetica] text-[10px]">{a.label}</span>
              <PlusIcon />
            </button>
          )
        ))}
      </div>
    </div>
  );
}

// ─── Wallet row ───────────────────────────────────────────────────────────────
function WalletsRow({ wallets }: { wallets: any[] }) {
  const { linkWallet } = usePrivy();
  const [copied, setCopied] = useState<string | null>(null);

  function copy(addr: string) {
    navigator.clipboard.writeText(addr);
    setCopied(addr);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-semibold text-[#d4e9f3b2] text-xs uppercase tracking-wider">
          Wallets
        </label>
        <button
          onClick={() => linkWallet()}
          data-testid="button-add-wallet"
          className="flex items-center gap-1 px-3 py-1 rounded-full bg-[#83eef010] border border-[#83eef020] text-[#83eef0b2] hover:text-[#83eef0] hover:bg-[#83eef01a] text-[10px] [font-family:'Inter',Helvetica] transition-colors"
        >
          <PlusIcon />Add Wallet
        </button>
      </div>
      {wallets.length === 0 ? (
        <p className="[font-family:'Inter',Helvetica] text-[#d4e9f340] text-xs italic">No wallets connected yet.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {wallets.map((w) => (
            <div key={w.address} className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#ffffff06] border border-[#ffffff0a]">
              <div className="flex items-center gap-2 text-[#d4e9f380]">
                <WalletIcon />
                <span className="[font-family:'Inter',Helvetica] text-xs font-mono text-[#d4e9f3b2]">
                  {w.address.slice(0, 8)}…{w.address.slice(-6)}
                </span>
                <span className="[font-family:'Inter',Helvetica] text-[9px] text-[#d4e9f340] capitalize">
                  {w.walletClientType === "privy" ? "embedded" : w.walletClientType}
                </span>
              </div>
              <button
                onClick={() => copy(w.address)}
                data-testid={`button-copy-wallet-${w.address.slice(-4)}`}
                className="p-1.5 rounded-lg text-[#83eef066] hover:text-[#83eef0] transition-colors"
              >
                {copied === w.address ? <CheckIcon /> : <CopyIcon />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main dashboard ───────────────────────────────────────────────────────────
export function UserProfileDashboard() {
  const { ready, authenticated: privyAuthenticated, user, login, logout: privyLogout, getAccessToken } = PRIVY_ENABLED
    ? usePrivy()
    : { ready: true, authenticated: false, user: null, login: () => {}, logout: () => {}, getAccessToken: async () => null };
  const { wallets } = PRIVY_ENABLED
    ? useWallets()
    : { wallets: [] as any[] };

  const ceramic = PRIVY_ENABLED
    ? useCeramicProfile()
    : { did: null, isAuthenticated: false, authenticate: async () => null, saveProfile: async () => null, loadProfile: async () => null, authLoading: false, syncLoading: false, error: null };

  const {
    orcidAuthenticated,
    orcidId: sessionOrcidId,
    orcidName: sessionOrcidName,
    profileId: orcidProfileId,
    logout: orcidLogout,
  } = useOrcidAuth();

  const authenticated = privyAuthenticated || orcidAuthenticated;

  function logout() {
    if (orcidAuthenticated) orcidLogout();
    if (privyAuthenticated) privyLogout();
  }

  const searchStr = useSearch();

  // ── Local state ──
  const [saved, setSaved] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState(DEFAULT_BIO);
  const [location, setLocation] = useState("");
  const [website, setWebsite] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // ORCID from URL callback, session, or persisted DB
  const [orcidId, setOrcidId] = useState<string | null>(null);
  const [orcidName, setOrcidName] = useState<string | null>(null);
  const [orcidError, setOrcidError] = useState<string | null>(null);

  // Ceramic + IDX
  const [ceramicStreamId, setCeramicStreamId] = useState<string | null>(null);
  const [ceramicSynced, setCeramicSynced] = useState(false);

  // The active profile ID — Privy user ID, or ORCID-prefixed ID for ORCID-only logins
  const activeProfileId = orcidAuthenticated && !privyAuthenticated
    ? orcidProfileId
    : user?.id;

  // Load persisted profile (including ORCID) from backend
  const { data: savedProfile } = useQuery<any>({
    queryKey: ["/api/profiles", activeProfileId],
    enabled: !!activeProfileId,
  });

  // Hydrate ORCID + Ceramic from DB on mount
  useEffect(() => {
    if (savedProfile?.profile?.orcidId && !orcidId) {
      setOrcidId(savedProfile.profile.orcidId);
      setOrcidName(savedProfile.profile.orcidName || null);
    }
    if (savedProfile?.profile?.ceramicStreamId) {
      setCeramicStreamId(savedProfile.profile.ceramicStreamId);
    }
  }, [savedProfile]);

  // Hydrate from ORCID session (standalone ORCID login)
  useEffect(() => {
    if (sessionOrcidId && !orcidId) {
      setOrcidId(sessionOrcidId);
      setOrcidName(sessionOrcidName || null);
    }
  }, [sessionOrcidId, sessionOrcidName]);

  // Load from localStorage on mount
  useEffect(() => {
    setProfileImage(localStorage.getItem("pepo_profile_image") || null);
    setDisplayName(localStorage.getItem("pepo_display_name") || "");
    setBio(localStorage.getItem("pepo_profile_bio") || DEFAULT_BIO);
    setLocation(localStorage.getItem("pepo_location") || "");
    setWebsite(localStorage.getItem("pepo_website") || "");
    const tags = localStorage.getItem("pepo_tags");
    if (tags) setSelectedTags(JSON.parse(tags));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(searchStr);
    const id = params.get("orcid_id"), name = params.get("orcid_name"), err = params.get("orcid_error");
    const authSuccess = params.get("orcid_auth");

    // orcid_auth=success — returned from standalone ORCID login flow, refresh session
    if (authSuccess === "success") {
      window.history.replaceState({}, "", "/profile");
      queryClient.invalidateQueries({ queryKey: ["/api/auth/orcid/session"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leaderboard"] });
    }

    // orcid_id param — returned from ORCID link-only flow (Privy user linking ORCID)
    if (id) {
      const decoded = name ? decodeURIComponent(name) : null;
      setOrcidId(id);
      setOrcidName(decoded);
      window.history.replaceState({}, "", "/profile");

      // Auto-persist to backend if authenticated with Privy
      (async () => {
        try {
          const token = await getAccessToken();
          if (!token) return;
          await fetch("/api/profiles/orcid", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-privy-token": token },
            body: JSON.stringify({ orcidId: id, orcidName: decoded || "" }),
          });
          queryClient.invalidateQueries({ queryKey: ["/api/leaderboard"] });
          queryClient.invalidateQueries({ queryKey: ["/api/profiles"] });
        } catch {
          // non-blocking — local state is already set
        }
      })();
    }
    if (err) { setOrcidError(err); window.history.replaceState({}, "", "/profile"); }
  }, [searchStr]);

  // Derive identity
  const linked = user?.linkedAccounts ?? [];
  const emailAcct = linked.find((a: any) => a.type === "email") as any;
  const googleAcct = linked.find((a: any) => a.type === "google_oauth") as any;
  const twitterAcct = linked.find((a: any) => a.type === "twitter_oauth") as any;
  const walletAddr = wallets[0]?.address ?? user?.wallet?.address ?? null;

  const authName =
    orcidAuthenticated && !privyAuthenticated
      ? (sessionOrcidName || orcidId || "Researcher")
      : twitterAcct?.username ? `@${twitterAcct.username}` :
        emailAcct?.address ?? googleAcct?.email?.split("@")[0] ??
        (walletAddr ? walletAddr.slice(0, 6) + "…" + walletAddr.slice(-4) : "");

  const shownName = displayName || authName || "Explorer";

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  function handlePhotoChange(url: string) {
    setProfileImage(url);
    localStorage.setItem("pepo_profile_image", url);
  }

  async function handleSave() {
    localStorage.setItem("pepo_display_name", displayName);
    localStorage.setItem("pepo_profile_bio", bio);
    localStorage.setItem("pepo_location", location);
    localStorage.setItem("pepo_website", website);
    localStorage.setItem("pepo_tags", JSON.stringify(selectedTags));

    if (orcidAuthenticated && !privyAuthenticated) {
      try {
        await fetch("/api/profiles/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ displayName, bio, location, website, tags: selectedTags }),
        });
        queryClient.invalidateQueries({ queryKey: ["/api/profiles", activeProfileId] });
        queryClient.invalidateQueries({ queryKey: ["/api/leaderboard"] });
      } catch {
        // non-blocking — local save succeeded
      }
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  async function handleSyncToCeramic() {
    if (!user?.id) return;
    const streamId = await ceramic.saveProfile(
      { displayName, bio, location, website, tags: selectedTags, orcidId: orcidId || "", orcidName: orcidName || "" },
      ceramicStreamId
    );
    if (!streamId) return;
    setCeramicStreamId(streamId);
    // Persist stream ID + DID to backend
    try {
      const token = await getAccessToken();
      if (!token) return;
      await fetch("/api/profiles/ceramic", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-privy-token": token },
        body: JSON.stringify({ ceramicStreamId: streamId, ceramicDid: ceramic.did || "" }),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/profiles"] });
      setCeramicSynced(true);
      setTimeout(() => setCeramicSynced(false), 4000);
    } catch {
      // non-blocking
    }
  }

  return (
    <div className="flex flex-col items-start relative bg-[#00080c] min-h-screen w-full">
      {/* Background */}
      <img className="absolute w-full h-full top-0 left-0 object-cover pointer-events-none" alt="" src="/figmaAssets/coral-microbiome-bg.jpg" />
      <div className="absolute w-full h-full top-0 left-0 pointer-events-none bg-[#00080c]/80" />

      <div className="relative z-10 w-full flex flex-col min-h-screen">

        {/* Top bar */}
        <div className="flex items-center justify-between px-4 md:px-8 py-4 border-b border-[#ffffff0d] backdrop-blur-md bg-[#00080c50]">
          <Link href="/" data-testid="link-back-home" className="flex items-center gap-2 text-[#83eef0b2] hover:text-[#83eef0] transition-colors no-underline">
            <BackIcon />
            <span className="[font-family:'Inter',Helvetica] text-sm">Back</span>
          </Link>
          <img src="/figmaAssets/mesoreef-dao-logo-new.png" alt="MesoReef DAO" className="h-8 w-auto object-contain" />
          {authenticated ? (
            <button
              onClick={logout}
              data-testid="button-sign-out"
              className="px-4 py-2 rounded-full bg-[#83eef01a] border border-[#83eef033] text-[#83eef0] [font-family:'Inter',Helvetica] text-sm hover:bg-[#83eef033] transition-colors"
            >Sign Out</button>
          ) : (
            <button
              onClick={login}
              data-testid="button-login-header"
              className="px-4 py-2 rounded-full bg-[linear-gradient(170deg,rgba(131,238,240,1)_0%,rgba(63,176,179,1)_100%)] text-[#00585a] [font-family:'Inter',Helvetica] text-sm font-medium hover:opacity-90 transition-opacity"
            >Log in</button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 max-w-5xl mx-auto w-full px-4 md:px-6 py-8 flex flex-col gap-6 pb-24">
          {!ready ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 rounded-full border-2 border-[#83eef0] border-t-transparent animate-spin" />
            </div>
          ) : !authenticated ? (
            <GuestView onLogin={login} />
          ) : (
            <>
              {/* Page heading */}
              <div className="flex flex-col gap-1">
                <h1 className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-bold text-[#d4e9f3] text-2xl">My Profile</h1>
                <p className="[font-family:'Inter',Helvetica] text-[#d4e9f366] text-sm">
                  Your MesoReef DAO identity visible to the reef community.
                </p>
              </div>

              {/* Two-column layout */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* LEFT — Preview card */}
                <div className="flex flex-col gap-5">
                  {/* Profile card preview */}
                  <div className="flex flex-col items-center gap-4 p-6 rounded-3xl bg-[#ffffff08] border border-[#83eef01a] backdrop-blur-sm text-center">
                    <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-[#83eef04c] bg-[#06232c] shadow-[0_0_20px_rgba(131,238,240,0.2)]">
                      {profileImage ? (
                        <img src={profileImage} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <img src="/figmaAssets/pepo-the-polyp-mascot.png" alt="Avatar" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5 w-full">
                      <span data-testid="text-preview-name" className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-bold text-[#d4e9f3] text-lg truncate px-2">
                        {shownName}
                      </span>
                      {location && (
                        <span className="flex items-center justify-center gap-1 [font-family:'Inter',Helvetica] text-[#d4e9f366] text-xs">
                          <MapPinIcon />{location}
                        </span>
                      )}
                      {bio && (
                        <p className="[font-family:'Inter',Helvetica] text-[#d4e9f380] text-xs leading-5 mt-1 line-clamp-3 text-left px-1">
                          {bio}
                        </p>
                      )}
                      {selectedTags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 justify-center mt-2">
                          {selectedTags.slice(0, 4).map((t) => (
                            <span key={t} className="px-2 py-0.5 rounded-full text-[9px] [font-family:'Inter',Helvetica] font-medium bg-[#83eef015] text-[#83eef0] border border-[#83eef030]">
                              {t}
                            </span>
                          ))}
                          {selectedTags.length > 4 && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] [font-family:'Inter',Helvetica] text-[#d4e9f340]">
                              +{selectedTags.length - 4}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Status badges — real data only */}
                    {(wallets.length > 0 || orcidId) && (
                      <div className="flex flex-wrap gap-1.5 justify-center w-full pt-2 border-t border-[#ffffff08]">
                        {wallets.length > 0 && (
                          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#ffffff0a] border border-[#ffffff12] text-[#d4e9f380] [font-family:'Inter',Helvetica] text-[10px]">
                            <WalletIcon />{wallets.length} Wallet{wallets.length > 1 ? "s" : ""}
                          </span>
                        )}
                        {orcidId && (
                          <span className="px-2.5 py-1 rounded-full bg-[#a6ce3915] border border-[#a6ce3933] text-[#a6ce39] [font-family:'Inter',Helvetica] text-[10px] font-semibold">
                            ORCID iD
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Reef Score widget */}
                  <div className="flex flex-col gap-3 p-5 rounded-3xl bg-[#ffffff08] border border-[#83eef01a] backdrop-blur-sm" data-testid="card-reef-score">
                    <div className="flex items-center justify-between">
                      <span className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-semibold text-[#d4e9f3b2] text-xs uppercase tracking-wider">Reef Score</span>
                      <span className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-bold text-[#83eef0] text-lg" data-testid="text-total-points">
                        {savedProfile?.profile?.points ?? 0} pts
                      </span>
                    </div>

                    {/* Points breakdown rows */}
                    <div className="flex flex-col gap-2 pt-1 border-t border-[#ffffff08]">
                      {[
                        { label: "First login", pts: "+50", note: "one-time", color: "#83eef0" },
                        { label: "Daily sign-in", pts: "+10", note: "per day", color: "#83eef0" },
                        { label: "🪸 Clean a Coral", pts: "+10", note: "per day", color: "#83eef0" },
                        { label: "Ask Pepo a question", pts: "+10", note: "per day", color: "#83eef0" },
                        { label: "ORCID verification", pts: "+25", note: "one-time", color: "#a6ce39" },
                        { label: "Link ORCID to profile", pts: "+25", note: "one-time", color: "#a6ce39" },
                      ].map((row) => (
                        <div key={row.label} className="flex items-center justify-between gap-2">
                          <span className="[font-family:'Inter',Helvetica] text-[#d4e9f380] text-[11px]">{row.label}</span>
                          <div className="flex items-center gap-1.5">
                            <span className="[font-family:'Inter',Helvetica] font-semibold text-[11px]" style={{ color: row.color }}>{row.pts}</span>
                            <span className="[font-family:'Inter',Helvetica] text-[#d4e9f330] text-[10px]">{row.note}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {!orcidId && (
                      <a href="/api/auth/orcid" className="mt-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#a6ce3910] border border-[#a6ce3930] hover:bg-[#a6ce3920] transition-colors no-underline" data-testid="link-verify-orcid">
                        <span className="[font-family:'Inter',Helvetica] font-semibold text-[#a6ce39] text-xs">Verify with ORCID iD</span>
                        <span className="[font-family:'Inter',Helvetica] text-[#a6ce3980] text-xs">+25 pts</span>
                      </a>
                    )}
                  </div>

                </div>

                {/* RIGHT — Edit form */}
                <div className="lg:col-span-2 flex flex-col gap-5">

                  {/* Photo + Name section */}
                  <div className="flex flex-col gap-5 p-5 md:p-6 rounded-3xl bg-[#ffffff08] border border-[#83eef01a] backdrop-blur-sm">
                    <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
                      <PhotoUpload image={profileImage} onChange={handlePhotoChange} />
                      <div className="flex flex-col gap-4 flex-1 w-full">
                        <Field label="Display Name" hint="How others see you">
                          <input
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder={authName || "Your name or handle"}
                            maxLength={60}
                            data-testid="input-display-name"
                            className={inputCls}
                          />
                        </Field>
                        <Field label="Location" hint="Optional">
                          <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#d4e9f340]">
                              <MapPinIcon />
                            </div>
                            <input
                              type="text"
                              value={location}
                              onChange={(e) => setLocation(e.target.value)}
                              placeholder="e.g. Belize, Caribbean"
                              maxLength={60}
                              data-testid="input-location"
                              className={`${inputCls} pl-9`}
                            />
                          </div>
                        </Field>
                      </div>
                    </div>
                  </div>

                  {/* About / Bio */}
                  <div className="flex flex-col gap-4 p-5 md:p-6 rounded-3xl bg-[#ffffff08] border border-[#83eef01a] backdrop-blur-sm">
                    <Field label="About / Bio" hint={`${bio.length}/500`}>
                      <textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        maxLength={500}
                        rows={5}
                        placeholder="Tell the reef community about yourself — your research focus, conservation work, or what brought you to the MesoAmerican Reef…"
                        data-testid="input-bio"
                        className={`${inputCls} resize-none leading-6`}
                      />
                    </Field>
                    <Field label="Website / Link" hint="Optional">
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#d4e9f340]">
                          <LinkIcon />
                        </div>
                        <input
                          type="url"
                          value={website}
                          onChange={(e) => setWebsite(e.target.value)}
                          placeholder="https://yoursite.org"
                          maxLength={120}
                          data-testid="input-website"
                          className={`${inputCls} pl-9`}
                        />
                      </div>
                    </Field>
                  </div>

                  {/* Specializations */}
                  <div className="flex flex-col gap-4 p-5 md:p-6 rounded-3xl bg-[#ffffff08] border border-[#83eef01a] backdrop-blur-sm">
                    <Field label="Specializations" hint="Pick up to 5">
                      <div className="flex flex-wrap gap-2">
                        {SPECIALIZATIONS.map((tag) => {
                          const active = selectedTags.includes(tag);
                          const maxed = selectedTags.length >= 5 && !active;
                          return (
                            <button
                              key={tag}
                              onClick={() => !maxed && toggleTag(tag)}
                              data-testid={`button-tag-${tag.replace(/\s+/g, "-").toLowerCase()}`}
                              disabled={maxed}
                              className={`px-3 py-1.5 rounded-full text-xs [font-family:'Inter',Helvetica] font-medium border transition-all ${
                                active
                                  ? "bg-[#83eef020] border-[#83eef066] text-[#83eef0] shadow-[0_0_8px_rgba(131,238,240,0.2)]"
                                  : maxed
                                  ? "border-[#ffffff08] text-[#d4e9f320] cursor-not-allowed"
                                  : "border-[#ffffff12] text-[#d4e9f366] hover:border-[#83eef033] hover:text-[#d4e9f3b2] hover:bg-[#83eef008]"
                              }`}
                            >
                              {active && <span className="mr-1">✓</span>}{tag}
                            </button>
                          );
                        })}
                      </div>
                    </Field>
                  </div>

                  {/* Linked accounts + Wallets */}
                  <div className="flex flex-col gap-5 p-5 md:p-6 rounded-3xl bg-[#ffffff08] border border-[#83eef01a] backdrop-blur-sm">
                    <div className="flex items-center gap-2 text-[#d4e9f3b2] mb-1">
                      <ShieldIcon />
                      <span className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-semibold text-sm">Identity & Accounts</span>
                    </div>
                    <LinkedAccountsRow user={user} />
                    <WalletsRow wallets={wallets} />

                    {/* ORCID */}
                    <div className="flex flex-col gap-2">
                      <label className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-semibold text-[#d4e9f3b2] text-xs uppercase tracking-wider">ORCID iD</label>
                      {orcidId ? (
                        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#a6ce3910] border border-[#a6ce3930]">
                          <span className="text-[#a6ce39] font-bold text-sm [font-family:'Inter',Helvetica]">iD</span>
                          {orcidName && <span className="text-[#d4e9f3] text-xs [font-family:'Inter',Helvetica]">{orcidName}</span>}
                          <span className="text-[#d4e9f366] text-[10px] font-mono [font-family:'Inter',Helvetica]">{orcidId}</span>
                          <span className="ml-auto text-[#a6ce39] text-[10px] [font-family:'Inter',Helvetica]">Verified</span>
                        </div>
                      ) : (
                        <a
                          href="/api/auth/orcid?link=1"
                          data-testid="link-connect-orcid"
                          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#a6ce3908] border border-[#a6ce3920] hover:bg-[#a6ce3915] hover:border-[#a6ce3933] transition-colors no-underline"
                        >
                          <span className="w-6 h-6 rounded-full bg-[#a6ce3920] flex items-center justify-center text-[#a6ce39] font-bold text-[10px] [font-family:'Inter',Helvetica]">iD</span>
                          <span className="text-[#a6ce39b2] text-xs [font-family:'Inter',Helvetica] flex-1">Connect ORCID iD</span>
                          <PlusIcon />
                        </a>
                      )}
                      {orcidError && <p className="text-red-400 text-[10px] [font-family:'Inter',Helvetica]">Error: {orcidError}</p>}
                    </div>

                    {/* ── Ceramic + IDX Storage ─────────────────────────────── */}
                    <div className="flex flex-col gap-3 pt-3 border-t border-[#ffffff08]">
                      <div className="flex items-center justify-between">
                        <label className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-semibold text-[#d4e9f3b2] text-xs uppercase tracking-wider flex items-center gap-2">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#83eef0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          Ceramic Storage
                        </label>
                        {ceramicStreamId && (
                          <span className="px-2 py-0.5 rounded-full bg-[#83eef015] border border-[#83eef033] text-[#83eef0] [font-family:'Inter',Helvetica] text-[9px] font-semibold">
                            DECENTRALISED
                          </span>
                        )}
                      </div>

                      {ceramic.did && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#83eef008] border border-[#83eef020]">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#83eef0" strokeWidth="2"/><path d="M12 8v4l3 3" stroke="#83eef0" strokeWidth="2" strokeLinecap="round"/></svg>
                          <span className="[font-family:'Inter',Helvetica] text-[#83eef0b2] text-[9px] font-mono truncate flex-1" data-testid="text-ceramic-did">
                            {ceramic.did}
                          </span>
                        </div>
                      )}

                      {ceramicStreamId ? (
                        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[#83eef00d] border border-[#83eef020]">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="#83eef0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          <div className="flex flex-col flex-1 min-w-0">
                            <span className="[font-family:'Inter',Helvetica] text-[#83eef0] text-[10px] font-medium">Profile synced</span>
                            <span className="[font-family:'Inter',Helvetica] text-[#d4e9f350] text-[9px] font-mono truncate" data-testid="text-ceramic-stream-id">
                              {ceramicStreamId}
                            </span>
                          </div>
                          <a
                            href={ceramicStreamUrl(ceramicStreamId)}
                            target="_blank"
                            rel="noopener noreferrer"
                            data-testid="link-ceramic-explorer"
                            className="text-[#83eef066] hover:text-[#83eef0] transition-colors"
                            title="View on Cerscan"
                          >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><polyline points="15 3 21 3 21 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><line x1="10" y1="14" x2="21" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                          </a>
                        </div>
                      ) : (
                        <p className="[font-family:'Inter',Helvetica] text-[#d4e9f340] text-[10px] leading-4">
                          Sync your profile to Ceramic to store it on a decentralised network that you own and control.
                        </p>
                      )}

                      {ceramic.error && (
                        <p className="[font-family:'Inter',Helvetica] text-red-400 text-[10px]">{ceramic.error}</p>
                      )}

                      <button
                        onClick={handleSyncToCeramic}
                        disabled={ceramic.authLoading || ceramic.syncLoading}
                        data-testid="button-sync-ceramic"
                        className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl [font-family:'Inter',Helvetica] text-xs font-medium transition-all border ${
                          ceramicSynced
                            ? "bg-[#83eef015] border-[#83eef033] text-[#83eef0]"
                            : ceramic.authLoading || ceramic.syncLoading
                            ? "bg-[#83eef008] border-[#83eef015] text-[#83eef050] cursor-not-allowed"
                            : "bg-[#83eef010] border-[#83eef030] text-[#83eef0b2] hover:bg-[#83eef01a] hover:text-[#83eef0] hover:border-[#83eef05a]"
                        }`}
                      >
                        {ceramic.authLoading ? (
                          <><div className="w-3 h-3 rounded-full border border-[#83eef0] border-t-transparent animate-spin" />Signing in…</>
                        ) : ceramic.syncLoading ? (
                          <><div className="w-3 h-3 rounded-full border border-[#83eef0] border-t-transparent animate-spin" />Syncing…</>
                        ) : ceramicSynced ? (
                          <><svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>Synced to Ceramic!</>
                        ) : (
                          <><svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>{ceramicStreamId ? "Re-sync to Ceramic" : "Sync to Ceramic"}</>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Save button */}
                  <div className="flex items-center justify-between gap-4">
                    <p className="[font-family:'Inter',Helvetica] text-[#d4e9f340] text-xs">
                      Profile data is saved locally on this device.
                    </p>
                    <button
                      onClick={handleSave}
                      data-testid="button-save-profile"
                      className={`flex items-center gap-2 px-8 py-3 rounded-full [font-family:'Inter',Helvetica] font-semibold text-sm transition-all ${
                        saved
                          ? "bg-[#83eef030] border border-[#83eef066] text-[#83eef0]"
                          : "bg-[linear-gradient(170deg,rgba(131,238,240,1)_0%,rgba(63,176,179,1)_100%)] text-[#00585a] hover:opacity-90 shadow-[0_4px_20px_rgba(131,238,240,0.25)]"
                      }`}
                    >
                      {saved ? <><CheckIcon />Saved!</> : "Save Profile"}
                    </button>
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

      <MobileBottomNav />
    </div>
  );
}
