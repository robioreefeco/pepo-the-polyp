import { useState } from "react";
import { usePrivy, useLoginWithSiwe } from "@privy-io/react-auth";
import { X, Loader2, AlertCircle } from "lucide-react";
import { OrcidIcon } from "./OrcidLoginButton";

// ─── Brand SVG icons ──────────────────────────────────────────────────────────

function MetaMaskSVG() {
  return (
    <svg width="28" height="28" viewBox="0 0 35 33" fill="none">
      <path d="M32.958 1L19.48 10.858l2.45-5.813L32.958 1z" fill="#E17726" stroke="#E17726" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2.042 1l13.365 9.957-2.33-5.912L2.042 1z" fill="#E27625" stroke="#E27625" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M28.178 23.533l-3.588 5.487 7.677 2.114 2.202-7.48-6.291-.121zM1.55 23.654l2.19 7.48 7.666-2.114-3.577-5.487-6.279.121z" fill="#E27625" stroke="#E27625" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M11.406 29.02l4.58-2.224-3.95-3.083-.63 5.307zM19.014 26.796l4.591 2.224-.642-5.307-3.95 3.083z" fill="#E27625" stroke="#E27625" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M19.256 22.01l-.88 4.544.627.44 3.95-3.083.12-3.118-3.817 1.217zM15.744 22.01l-3.808-1.218.099 3.118 3.95 3.083.638-.44-.88-4.543z" fill="#F5841F" stroke="#F5841F" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M32.012 16.44l-7.59-2.222 2.15 3.233-3.193 6.236 4.215-.055h6.29l-1.872-7.192zM10.978 14.218l-7.59 2.222-1.86 7.192h6.28l4.204.055-3.193-6.236 2.16-3.233z" fill="#F5841F" stroke="#F5841F" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function CoinbaseSVG() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect width="28" height="28" rx="8" fill="#0052FF"/>
      <path d="M14 5A9 9 0 105 14 9.01 9.01 0 0014 5zm0 16.2A7.2 7.2 0 1121.2 14 7.2 7.2 0 0114 21.2zm-2.7-7.2a2.7 2.7 0 105.4 0 2.7 2.7 0 00-5.4 0z" fill="white"/>
    </svg>
  );
}

function BinanceSVG() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect width="28" height="28" rx="14" fill="#F3BA2F"/>
      <path d="M14 7l2 2-5 5 5 5-2 2-7-7 7-7zm0 0l-2 2 5 5-5 5 2 2 7-7-7-7z" fill="#1A1A1A"/>
      <path d="M14 11.5L16.5 14 14 16.5 11.5 14 14 11.5z" fill="#1A1A1A"/>
    </svg>
  );
}

function RabbySVG() {
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
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
  );
}

function BitsoSVG() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect width="28" height="28" rx="8" fill="#FF6600"/>
      <text x="14" y="19" textAnchor="middle" fontSize="13" fontWeight="bold" fill="white" fontFamily="Arial,sans-serif">₿</text>
    </svg>
  );
}

function WalletConnectSVG() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect width="28" height="28" rx="8" fill="#3B99FC"/>
      <path d="M6.3 10.6C10.5 6.5 17.5 6.5 21.7 10.6l.5.5a.4.4 0 010 .57l-1.7 1.65a.21.21 0 01-.3 0l-.7-.68c-2.8-2.73-7.34-2.73-10.14 0l-.75.73a.21.21 0 01-.3 0L6.6 11.67a.4.4 0 010-.57l-.3-.5zm17.1 3.18l1.5 1.46a.4.4 0 010 .57l-6.74 6.58a.43.43 0 01-.61 0l-4.78-4.67a.1.1 0 00-.15 0l-4.78 4.67a.43.43 0 01-.61 0L1.1 15.81a.4.4 0 010-.57l1.5-1.46a.43.43 0 01.61 0l4.78 4.67c.04.04.11.04.15 0l4.78-4.67a.43.43 0 01.61 0l4.78 4.67c.04.04.11.04.15 0l4.78-4.67a.43.43 0 01.61 0z" fill="white"/>
    </svg>
  );
}

function LedgerSVG() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect width="28" height="28" rx="8" fill="#000"/>
      <rect x="6" y="6" width="9" height="9" rx="1" fill="white"/>
      <rect x="6" y="17" width="16" height="5" rx="1" fill="white"/>
      <rect x="17" y="6" width="5" height="9" rx="1" fill="white"/>
    </svg>
  );
}

function TrezorSVG() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect width="28" height="28" rx="8" fill="#1DB954"/>
      <path d="M14 5.5c-3.5 0-6 2-6 4.5v1.5H6v9c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V11.5h-2V10c0-2.5-2.5-4.5-6-4.5zm0 2c2.2 0 4 1.1 4 2.5v1.5h-8V10c0-1.4 1.8-2.5 4-2.5zm0 7a2 2 0 110 4 2 2 0 010-4z" fill="white"/>
    </svg>
  );
}

// ─── Wallet definitions ───────────────────────────────────────────────────────

type WalletEntry = {
  id: string;
  name: string;
  desc: string;
  icon: React.ReactNode;
  accent: string;
  clientType: string;
  mode: "injected" | "walletconnect" | "privy";
};

const INJECTED_WALLETS: WalletEntry[] = [
  { id: "metamask",  name: "MetaMask",          desc: "Browser extension",         icon: <MetaMaskSVG />,  accent: "#E2761B", clientType: "metamask",        mode: "injected" },
  { id: "coinbase",  name: "Coinbase Wallet",    desc: "Browser · Mobile",          icon: <CoinbaseSVG />,  accent: "#0052FF", clientType: "coinbase_wallet", mode: "injected" },
  { id: "binance",   name: "Binance Web3",       desc: "Binance Web3 Wallet",       icon: <BinanceSVG />,   accent: "#F3BA2F", clientType: "binance",         mode: "injected" },
  { id: "rabby",     name: "Rabby Wallet",       desc: "Browser extension",         icon: <RabbySVG />,     accent: "#8B5CF6", clientType: "injected",        mode: "injected" },
  { id: "bitso",     name: "Bitso Wallet",       desc: "Bitso Web3 Wallet",         icon: <BitsoSVG />,     accent: "#FF6600", clientType: "injected",        mode: "injected" },
  { id: "wc",        name: "WalletConnect",      desc: "Any mobile wallet",         icon: <WalletConnectSVG />, accent: "#3B99FC", clientType: "wallet_connect", mode: "walletconnect" },
];

const HARDWARE_WALLETS: WalletEntry[] = [
  { id: "ledger",  name: "Ledger",  desc: "via WalletConnect", icon: <LedgerSVG />,  accent: "#BBBBBB", clientType: "wallet_connect", mode: "walletconnect" },
  { id: "trezor",  name: "Trezor",  desc: "via WalletConnect", icon: <TrezorSVG />,  accent: "#1DB954", clientType: "wallet_connect", mode: "walletconnect" },
];

// ─── Main Component ───────────────────────────────────────────────────────────

interface WalletPickerModalProps {
  onClose: () => void;
}

export function WalletPickerModal({ onClose }: WalletPickerModalProps) {
  const { login } = usePrivy();
  const [connecting, setConnecting] = useState<string | null>(null);
  const [error, setError]           = useState<string | null>(null);

  const { generateSiweMessage, loginWithSiwe } = useLoginWithSiwe({
    onComplete: () => { setConnecting(null); onClose(); },
    onError:    (err) => { setConnecting(null); setError((err as any)?.message ?? "Authentication failed. Please try again."); },
  });

  // ── Headless SIWE for injected browser wallets ────────────────────────────
  const handleInjected = async (wallet: WalletEntry) => {
    const eth = (window as any).ethereum;
    if (!eth) {
      setError(`No wallet extension detected. Please install ${wallet.name} and refresh.`);
      return;
    }

    setConnecting(wallet.id);
    setError(null);

    try {
      // 1. Request accounts — opens wallet popup
      const accounts: string[] = await eth.request({ method: "eth_requestAccounts" });
      const address = accounts[0];
      if (!address) throw new Error("No account returned from wallet.");

      // 2. Get current chain ID
      const chainIdHex: string = await eth.request({ method: "eth_chainId" });
      const chainId = parseInt(chainIdHex, 16);

      // 3. Generate SIWE message via Privy
      const message = await generateSiweMessage({
        address,
        chainId: `eip155:${chainId}` as `eip155:${number}`,
      });

      // 4. Request signature from wallet
      const signature: string = await eth.request({
        method: "personal_sign",
        params: [message, address],
      });

      // 5. Complete Privy authentication
      await loginWithSiwe({
        message,
        signature,
        walletClientType: wallet.clientType,
        connectorType:    "injected",
      });

      // onComplete closes modal
    } catch (err: any) {
      if (err?.code === 4001 || err?.message?.includes("rejected")) {
        setError("Signature rejected. Please approve the sign request in your wallet.");
      } else if (err?.code === -32002) {
        setError("A wallet request is already pending. Check your wallet extension.");
      } else {
        setError(err?.message ?? "Connection failed. Please try again.");
      }
      setConnecting(null);
    }
  };

  // ── WalletConnect / Ledger / Trezor → open Privy modal ───────────────────
  const handlePrivyModal = () => {
    onClose();
    try { login(); } catch { /* suppress */ }
  };

  // ── ORCID redirect ────────────────────────────────────────────────────────
  const handleOrcid = () => { window.location.href = "/api/auth/orcid"; };

  // ── Render wallet button ──────────────────────────────────────────────────
  const WalletButton = ({ w, layout = "row" }: { w: WalletEntry; layout?: "row" | "card" }) => {
    const isLoading = connecting === w.id;
    const disabled  = connecting !== null;

    const onClick = w.mode === "injected" ? () => handleInjected(w) : handlePrivyModal;

    if (layout === "card") {
      return (
        <button
          key={w.id}
          onClick={disabled ? undefined : onClick}
          disabled={disabled}
          data-testid={`wallet-option-${w.id}`}
          className="flex flex-col items-center gap-2 px-3 py-3.5 rounded-2xl border transition-colors disabled:opacity-50"
          style={{
            background:   `${w.accent}08`,
            borderColor:  `${w.accent}22`,
          }}
        >
          <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: `${w.accent}14` }}>
            {isLoading ? <Loader2 size={22} className="animate-spin text-[#83eef0]" /> : w.icon}
          </div>
          <div className="text-center">
            <div className="[font-family:'Inter',Helvetica] font-semibold text-[#d4e9f3] text-sm">{w.name}</div>
            <div className="[font-family:'Inter',Helvetica] text-[#d4e9f340] text-[10px] mt-0.5">{w.desc}</div>
          </div>
        </button>
      );
    }

    return (
      <button
        onClick={disabled ? undefined : onClick}
        disabled={disabled}
        data-testid={`wallet-option-${w.id}`}
        className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl border transition-colors text-left group disabled:opacity-50"
        style={{ background: `${w.accent}06`, borderColor: `${w.accent}1a` }}
      >
        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${w.accent}14` }}>
          {isLoading ? <Loader2 size={22} className="animate-spin text-[#83eef0]" /> : w.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="[font-family:'Inter',Helvetica] font-semibold text-[#d4e9f3] text-sm leading-snug">{w.name}</div>
          <div className="[font-family:'Inter',Helvetica] text-[#d4e9f350] text-xs mt-0.5">
            {isLoading ? <span className="text-[#83eef090]">Connecting…</span> : w.desc}
          </div>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-[#d4e9f320] group-hover:text-[#83eef060] transition-colors flex-shrink-0">
          <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={connecting ? undefined : onClose}
        data-testid="wallet-picker-backdrop"
      />

      {/* Sheet */}
      <div
        data-testid="wallet-picker-modal"
        className="relative z-10 w-full sm:max-w-md bg-[#060f12] border border-[#83eef018] rounded-t-3xl sm:rounded-3xl shadow-[0_-8px_60px_rgba(0,0,0,0.7)] overflow-hidden max-h-[92svh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
          <div>
            <h2 className="[font-family:'Inter',Helvetica] font-bold text-[#d4e9f3] text-lg leading-tight">
              Connect Wallet
            </h2>
            <p className="[font-family:'Inter',Helvetica] text-[#d4e9f360] text-xs mt-0.5">
              MesoReef DAO · Coral Knowledge Network
            </p>
          </div>
          <button
            onClick={connecting ? undefined : onClose}
            disabled={!!connecting}
            data-testid="wallet-picker-close"
            className="w-8 h-8 rounded-full bg-[#ffffff0a] hover:bg-[#ffffff14] flex items-center justify-center transition-colors disabled:opacity-40"
          >
            <X size={15} className="text-[#d4e9f380]" />
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mx-4 mb-1 px-3 py-2.5 rounded-xl bg-[#ff4a4a10] border border-[#ff4a4a30] flex items-start gap-2 flex-shrink-0">
            <AlertCircle size={14} className="text-[#ff8a8a] mt-0.5 flex-shrink-0" />
            <p className="[font-family:'Inter',Helvetica] text-[#ff9a9a] text-xs leading-relaxed">{error}</p>
          </div>
        )}

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-4 pb-6 pt-1">

          {/* ── EVM Wallets ── */}
          <div className="flex flex-col gap-2 mb-4">
            {INJECTED_WALLETS.map((w) => <WalletButton key={w.id} w={w} layout="row" />)}
          </div>

          {/* ── Hardware ── */}
          <div className="mb-4">
            <Divider label="Hardware Wallets" />
            <div className="grid grid-cols-2 gap-2 mt-2">
              {HARDWARE_WALLETS.map((w) => <WalletButton key={w.id} w={w} layout="card" />)}
            </div>
          </div>

          {/* ── ORCID ── */}
          <div className="mb-4">
            <Divider label="Research Identity" />
            <button
              onClick={connecting ? undefined : handleOrcid}
              disabled={!!connecting}
              data-testid="wallet-option-orcid"
              className="mt-2 flex items-center gap-3 w-full px-4 py-3 rounded-2xl border border-[#A6CE3922] bg-[#A6CE3908] hover:bg-[#A6CE3914] transition-colors text-left group disabled:opacity-50"
            >
              <div className="w-11 h-11 rounded-xl bg-[#A6CE3918] flex items-center justify-center flex-shrink-0">
                <OrcidIcon size={28} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="[font-family:'Inter',Helvetica] font-semibold text-[#d4e9f3] text-sm">ORCID iD</div>
                <div className="[font-family:'Inter',Helvetica] text-[#d4e9f350] text-xs mt-0.5">Researcher & scientist identity</div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-[#A6CE3960] group-hover:text-[#A6CE39] transition-colors flex-shrink-0">
                <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          {/* ── Other (email / social) ── */}
          <div>
            <Divider label="Other options" />
            <div className="grid grid-cols-2 gap-2 mt-2">
              {OTHER_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={connecting ? undefined : handlePrivyModal}
                  disabled={!!connecting}
                  data-testid={`wallet-option-${opt.id}`}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-[#ffffff0a] bg-[#ffffff04] hover:bg-[#ffffff0a] transition-colors disabled:opacity-50"
                >
                  <span style={{ color: opt.color }} className="flex-shrink-0">{opt.icon}</span>
                  <span className="[font-family:'Inter',Helvetica] text-[#d4e9f3a0] text-xs font-medium truncate">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#ffffff08] flex-shrink-0">
          <p className="[font-family:'Inter',Helvetica] text-[#d4e9f330] text-[10px] text-center leading-relaxed">
            By connecting you agree to the MesoReef DAO terms of service
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 px-1">
      <div className="h-px flex-1 bg-[#ffffff0a]" />
      <span className="[font-family:'Inter',Helvetica] text-[#d4e9f330] text-[10px] uppercase tracking-widest">{label}</span>
      <div className="h-px flex-1 bg-[#ffffff0a]" />
    </div>
  );
}

const OTHER_OPTIONS = [
  { id: "email",    label: "Email",      color: "#83eef0", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg> },
  { id: "google",   label: "Google",     color: "#4285F4", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg> },
  { id: "twitter",  label: "Twitter/X",  color: "#d4e9f3", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.743l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.912-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> },
  { id: "github",   label: "GitHub",     color: "#d4e9f3", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg> },
  { id: "linkedin", label: "LinkedIn",   color: "#0A66C2", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="#0A66C2"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg> },
  { id: "sms",      label: "SMS / Phone", color: "#83eef0", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.79 10.6a19.79 19.79 0 01-3.07-8.67A2 2 0 012.7 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.61a16 16 0 006.29 6.29l.97-1.04a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg> },
];
