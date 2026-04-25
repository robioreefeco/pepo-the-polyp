import { useState, useEffect, useRef } from "react";
import { usePrivy, useLoginWithSiwe } from "@privy-io/react-auth";
import { X, Loader2, AlertCircle, ExternalLink } from "lucide-react";
import { OrcidIcon } from "./OrcidLoginButton";

// ─── EIP-6963 types ───────────────────────────────────────────────────────────

interface EIP6963ProviderInfo {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
}
interface EIP6963ProviderDetail {
  info: EIP6963ProviderInfo;
  provider: { request: (args: { method: string; params?: any[] }) => Promise<any> };
}

// ─── Wallet definitions ───────────────────────────────────────────────────────

interface WalletDef {
  id: string;
  name: string;
  desc: string;
  accent: string;
  clientType: string;
  /** EIP-6963 reverse-domain name for this wallet */
  rdns: string;
  /** Install URL shown when wallet is not detected */
  installUrl: string;
  icon: React.ReactNode;
}

const FEATURED_WALLETS: WalletDef[] = [
  {
    id: "metamask",
    name: "MetaMask",
    desc: "The most popular Ethereum wallet",
    accent: "#E2761B",
    clientType: "metamask",
    rdns: "io.metamask",
    installUrl: "https://metamask.io/download",
    icon: (
      <svg width="32" height="32" viewBox="0 0 35 33" fill="none">
        <path d="M32.958 1L19.48 10.858l2.45-5.813L32.958 1z" fill="#E17726" stroke="#E17726" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M2.042 1l13.365 9.957-2.33-5.912L2.042 1z" fill="#E27625" stroke="#E27625" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M28.178 23.533l-3.588 5.487 7.677 2.114 2.202-7.48-6.291-.121zM1.55 23.654l2.19 7.48 7.666-2.114-3.577-5.487-6.279.121z" fill="#E27625" stroke="#E27625" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M11.406 29.02l4.58-2.224-3.95-3.083-.63 5.307zM19.014 26.796l4.591 2.224-.642-5.307-3.95 3.083z" fill="#E27625" stroke="#E27625" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M19.256 22.01l-.88 4.544.627.44 3.95-3.083.12-3.118-3.817 1.217zM15.744 22.01l-3.808-1.218.099 3.118 3.95 3.083.638-.44-.88-4.543z" fill="#F5841F" stroke="#F5841F" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M32.012 16.44l-7.59-2.222 2.15 3.233-3.193 6.236 4.215-.055h6.29l-1.872-7.192zM10.978 14.218l-7.59 2.222-1.86 7.192h6.28l4.204.055-3.193-6.236 2.16-3.233z" fill="#F5841F" stroke="#F5841F" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    id: "coinbase",
    name: "Coinbase Wallet",
    desc: "Simple & secure self-custody",
    accent: "#0052FF",
    clientType: "coinbase_wallet",
    rdns: "com.coinbase.wallet",
    installUrl: "https://www.coinbase.com/wallet/downloads",
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <rect width="32" height="32" rx="10" fill="#0052FF"/>
        <path d="M16 6A10 10 0 106 16 10.01 10.01 0 0016 6zm0 18A8 8 0 1124 16 8 8 0 0116 24zm-3-8a3 3 0 106 0 3 3 0 00-6 0z" fill="white"/>
      </svg>
    ),
  },
  {
    id: "rabby",
    name: "Rabby Wallet",
    desc: "Multi-chain DeFi browser wallet",
    accent: "#8B5CF6",
    clientType: "injected",
    rdns: "io.rabby",
    installUrl: "https://rabby.io",
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <rect width="32" height="32" rx="10" fill="#8B5CF6"/>
        <ellipse cx="16" cy="13" rx="7" ry="8" fill="#C4B5FD"/>
        <ellipse cx="10" cy="8" rx="2.5" ry="4.5" fill="#C4B5FD"/>
        <ellipse cx="22" cy="8" rx="2.5" ry="4.5" fill="#C4B5FD"/>
        <ellipse cx="10" cy="7.5" rx="1.2" ry="3.5" fill="#8B5CF6"/>
        <ellipse cx="22" cy="7.5" rx="1.2" ry="3.5" fill="#8B5CF6"/>
        <circle cx="13" cy="14" r="1.5" fill="#5B21B6"/>
        <circle cx="19" cy="14" r="1.5" fill="#5B21B6"/>
        <path d="M13.5 17.5q2.5 2 5 0" stroke="#5B21B6" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
        <ellipse cx="16" cy="21" rx="5" ry="3" fill="#A78BFA"/>
        <path d="M11 21q-3 1-2 4t4 3" stroke="#C4B5FD" strokeWidth="1.1" strokeLinecap="round" fill="none"/>
        <path d="M21 21q3 1 2 4t-4 3" stroke="#C4B5FD" strokeWidth="1.1" strokeLinecap="round" fill="none"/>
      </svg>
    ),
  },
];

// ─── Main component ───────────────────────────────────────────────────────────

interface WalletPickerModalProps {
  onClose: () => void;
}

export function WalletPickerModal({ onClose }: WalletPickerModalProps) {
  const { login } = usePrivy();
  const [connecting, setConnecting] = useState<string | null>(null);
  const [error, setError]           = useState<string | null>(null);

  // EIP-6963 detected providers map: rdns → provider detail
  const [detected, setDetected] = useState<Map<string, EIP6963ProviderDetail>>(new Map());
  const detectedRef = useRef<Map<string, EIP6963ProviderDetail>>(new Map());

  useEffect(() => {
    const handle = (event: Event) => {
      const detail = (event as CustomEvent<EIP6963ProviderDetail>).detail;
      detectedRef.current = new Map(detectedRef.current.set(detail.info.rdns, detail));
      setDetected(new Map(detectedRef.current));
    };
    window.addEventListener("eip6963:announceProvider", handle as EventListener);
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    return () => window.removeEventListener("eip6963:announceProvider", handle as EventListener);
  }, []);

  const { generateSiweMessage, loginWithSiwe } = useLoginWithSiwe({
    onComplete: () => { setConnecting(null); onClose(); },
    onError:    (err) => {
      setConnecting(null);
      setError((err as any)?.message ?? "Authentication failed. Please try again.");
    },
  });

  // ── Headless SIWE with the wallet's specific EIP-6963 provider ─────────────
  const connectWallet = async (wallet: WalletDef) => {
    setError(null);

    // Prefer specific EIP-6963 provider; fall back to window.ethereum
    const providerDetail = detected.get(wallet.rdns);
    const eth = providerDetail?.provider ?? (window as any).ethereum;

    if (!eth) {
      setError(`${wallet.name} not found. Install it, then refresh and try again.`);
      return;
    }

    setConnecting(wallet.id);
    try {
      // 1. Unlock wallet & get address
      const accounts: string[] = await eth.request({ method: "eth_requestAccounts" });
      const address = accounts?.[0];
      if (!address) throw new Error("No account returned.");

      // 2. Detect chain
      const chainIdHex: string = await eth.request({ method: "eth_chainId" });
      const chainId = parseInt(chainIdHex, 16) || 1;

      // 3. Generate EIP-4361 SIWE message via Privy
      const message = await generateSiweMessage({
        address,
        chainId: `eip155:${chainId}` as `eip155:${number}`,
      });

      // 4. Sign — wallet popup opens, user clicks "Sign"
      const signature: string = await eth.request({
        method: "personal_sign",
        params: [message, address],
      });

      // 5. Exchange for a Privy session
      await loginWithSiwe({
        message,
        signature,
        walletClientType: wallet.clientType,
        connectorType:    "injected",
      });
      // onComplete → closes modal
    } catch (err: any) {
      const msg: string = err?.message ?? "";
      if (err?.code === 4001 || msg.toLowerCase().includes("reject") || msg.toLowerCase().includes("denied")) {
        setError("You declined the signature. Approve the sign request in your wallet to continue.");
      } else if (err?.code === -32002) {
        setError("A wallet request is already pending — check your wallet extension.");
      } else {
        setError(msg || "Connection failed. Please try again.");
      }
      setConnecting(null);
    }
  };

  const openPrivyModal = () => { onClose(); try { login(); } catch { /* */ } };
  const busy = connecting !== null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={busy ? undefined : onClose}
      />

      {/* Sheet */}
      <div
        data-testid="wallet-picker-modal"
        className="relative z-10 w-full sm:max-w-sm bg-[#060f12] border border-[#83eef018] rounded-t-3xl sm:rounded-3xl shadow-[0_-8px_60px_rgba(0,0,0,0.8)] overflow-hidden max-h-[92svh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 flex-shrink-0">
          <div>
            <h2 className="[font-family:'Inter',Helvetica] font-bold text-[#d4e9f3] text-lg">Connect Wallet</h2>
            <p className="[font-family:'Inter',Helvetica] text-[#d4e9f350] text-xs mt-0.5">MesoReef DAO · Coral Knowledge Network</p>
          </div>
          <button
            onClick={busy ? undefined : onClose}
            disabled={busy}
            data-testid="wallet-picker-close"
            className="w-8 h-8 rounded-full bg-[#ffffff0a] hover:bg-[#ffffff14] flex items-center justify-center transition-colors disabled:opacity-30"
          >
            <X size={15} className="text-[#d4e9f380]" />
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-4 mb-3 px-3 py-2.5 rounded-xl bg-[#ff4a4a0d] border border-[#ff4a4a30] flex items-start gap-2 flex-shrink-0">
            <AlertCircle size={13} className="text-[#ff8080] mt-0.5 flex-shrink-0" />
            <p className="[font-family:'Inter',Helvetica] text-[#ff9090] text-xs leading-relaxed">{error}</p>
          </div>
        )}

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-4 pb-6">

          {/* ── Featured wallets ── */}
          <div className="flex flex-col gap-2.5 mb-5">
            {FEATURED_WALLETS.map((w) => {
              const isAvailable = detected.has(w.rdns);
              const isLoading   = connecting === w.id;

              return (
                <FeaturedWalletRow
                  key={w.id}
                  wallet={w}
                  isAvailable={isAvailable}
                  isLoading={isLoading}
                  disabled={busy}
                  onConnect={() => connectWallet(w)}
                />
              );
            })}
          </div>

          {/* ── WalletConnect ── */}
          <div className="mb-5">
            <SectionDivider label="More wallets" />
            <button
              onClick={busy ? undefined : openPrivyModal}
              disabled={busy}
              data-testid="wallet-option-walletconnect"
              className="mt-2.5 flex items-center gap-3 w-full px-4 py-3 rounded-2xl border border-[#3B99FC1a] bg-[#3B99FC06] hover:bg-[#3B99FC0e] transition-colors text-left group disabled:opacity-50"
            >
              <div className="w-11 h-11 rounded-xl bg-[#3B99FC14] flex items-center justify-center flex-shrink-0">
                <svg width="26" height="26" viewBox="0 0 28 28" fill="none">
                  <rect width="28" height="28" rx="8" fill="#3B99FC"/>
                  <path d="M6.3 10.6C10.5 6.5 17.5 6.5 21.7 10.6l.5.5a.4.4 0 010 .57l-1.7 1.65a.21.21 0 01-.3 0l-.7-.68c-2.8-2.73-7.34-2.73-10.14 0l-.75.73a.21.21 0 01-.3 0L6.6 11.67a.4.4 0 010-.57l-.3-.5zm17.1 3.18l1.5 1.46a.4.4 0 010 .57l-6.74 6.58a.43.43 0 01-.61 0l-4.78-4.67a.1.1 0 00-.15 0l-4.78 4.67a.43.43 0 01-.61 0L1.1 15.81a.4.4 0 010-.57l1.5-1.46a.43.43 0 01.61 0l4.78 4.67c.04.04.11.04.15 0l4.78-4.67a.43.43 0 01.61 0l4.78 4.67c.04.04.11.04.15 0l4.78-4.67a.43.43 0 01.61 0z" fill="white"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="[font-family:'Inter',Helvetica] font-semibold text-[#d4e9f3] text-sm">WalletConnect</div>
                <div className="[font-family:'Inter',Helvetica] text-[#d4e9f350] text-xs mt-0.5">Ledger · Trezor · Binance · 300+ wallets</div>
              </div>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="text-[#3B99FC60] flex-shrink-0">
                <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          {/* ── ORCID ── */}
          <div className="mb-5">
            <SectionDivider label="Research identity" />
            <button
              onClick={busy ? undefined : () => { window.location.href = "/api/auth/orcid"; }}
              disabled={busy}
              data-testid="wallet-option-orcid"
              className="mt-2.5 flex items-center gap-3 w-full px-4 py-3 rounded-2xl border border-[#A6CE3922] bg-[#A6CE3908] hover:bg-[#A6CE3914] transition-colors text-left group disabled:opacity-50"
            >
              <div className="w-11 h-11 rounded-xl bg-[#A6CE3918] flex items-center justify-center flex-shrink-0">
                <OrcidIcon size={28} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="[font-family:'Inter',Helvetica] font-semibold text-[#d4e9f3] text-sm">ORCID iD</div>
                <div className="[font-family:'Inter',Helvetica] text-[#d4e9f350] text-xs mt-0.5">Researcher & scientist identity</div>
              </div>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="text-[#A6CE3960] flex-shrink-0">
                <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          {/* ── Other (email / social) ── */}
          <div>
            <SectionDivider label="Other sign-in" />
            <div className="grid grid-cols-3 gap-2 mt-2.5">
              {OTHER_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={busy ? undefined : openPrivyModal}
                  disabled={busy}
                  data-testid={`wallet-option-${opt.id}`}
                  className="flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl border border-[#ffffff0a] bg-[#ffffff04] hover:bg-[#ffffff0a] transition-colors disabled:opacity-50"
                >
                  <span style={{ color: opt.color }}>{opt.icon}</span>
                  <span className="[font-family:'Inter',Helvetica] text-[#d4e9f370] text-[10px] font-medium">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#ffffff08] flex-shrink-0">
          <p className="[font-family:'Inter',Helvetica] text-[#d4e9f328] text-[10px] text-center">
            By connecting you agree to MesoReef DAO terms of service
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Featured wallet row ──────────────────────────────────────────────────────

function FeaturedWalletRow({
  wallet, isAvailable, isLoading, disabled, onConnect,
}: {
  wallet: WalletDef;
  isAvailable: boolean;
  isLoading: boolean;
  disabled: boolean;
  onConnect: () => void;
}) {
  return (
    <button
      onClick={disabled ? undefined : onConnect}
      disabled={disabled}
      data-testid={`wallet-option-${wallet.id}`}
      className="flex items-center gap-3.5 w-full px-4 py-3.5 rounded-2xl border transition-all text-left group disabled:opacity-60"
      style={{
        background:  `${wallet.accent}08`,
        borderColor: `${wallet.accent}28`,
      }}
    >
      {/* Icon */}
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${wallet.accent}16` }}
      >
        {isLoading
          ? <Loader2 size={24} className="animate-spin text-[#83eef0]" />
          : wallet.icon}
      </div>

      {/* Label */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="[font-family:'Inter',Helvetica] font-semibold text-[#d4e9f3] text-sm leading-snug">
            {wallet.name}
          </span>
          {isAvailable && !isLoading && (
            <span
              className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider"
              style={{ background: `${wallet.accent}20`, color: wallet.accent }}
            >
              Detected
            </span>
          )}
        </div>
        <div className="[font-family:'Inter',Helvetica] text-[#d4e9f348] text-xs mt-0.5">
          {isLoading
            ? <span style={{ color: `${wallet.accent}cc` }}>Connecting… approve in wallet</span>
            : isAvailable
            ? wallet.desc
            : <span className="flex items-center gap-1 text-[#d4e9f340]">
                Not installed
                <ExternalLink size={9} />
              </span>
          }
        </div>
      </div>

      {/* Arrow */}
      {!isLoading && (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
          className="flex-shrink-0 transition-colors"
          style={{ color: isAvailable ? `${wallet.accent}80` : "#d4e9f320" }}>
          <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </button>
  );
}

// ─── Section divider ──────────────────────────────────────────────────────────

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-px flex-1 bg-[#ffffff0a]" />
      <span className="[font-family:'Inter',Helvetica] text-[#d4e9f328] text-[10px] uppercase tracking-widest">{label}</span>
      <div className="h-px flex-1 bg-[#ffffff0a]" />
    </div>
  );
}

// ─── Other sign-in options ────────────────────────────────────────────────────

const OTHER_OPTIONS = [
  { id: "email",   label: "Email",    color: "#83eef0",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { id: "google",  label: "Google",   color: "#4285F4",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg> },
  { id: "twitter", label: "Twitter",  color: "#d4e9f3",
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.743l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.912-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> },
  { id: "github",  label: "GitHub",   color: "#d4e9f3",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg> },
  { id: "linkedin",label: "LinkedIn", color: "#0A66C2",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="#0A66C2"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg> },
  { id: "sms",     label: "SMS",      color: "#83eef0",
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.79 10.6a19.79 19.79 0 01-3.07-8.67A2 2 0 012.7 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.61a16 16 0 006.29 6.29l.97-1.04a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg> },
];
