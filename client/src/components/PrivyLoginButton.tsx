import { usePrivy, useWallets } from "@privy-io/react-auth";
import { Button } from "@/components/ui/button";
import { ChevronDown, LogOut } from "lucide-react";

function MetaMaskIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 35 33" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M32.958 1L19.48 10.858l2.45-5.813L32.958 1z" fill="#E17726" stroke="#E17726" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2.042 1l13.365 9.957-2.33-5.912L2.042 1z" fill="#E27625" stroke="#E27625" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M28.178 23.533l-3.588 5.487 7.677 2.114 2.202-7.48-6.291-.121zM1.55 23.654l2.19 7.48 7.666-2.114-3.577-5.487-6.279.121z" fill="#E27625" stroke="#E27625" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M11.406 29.02l4.58-2.224-3.95-3.083-.63 5.307zM19.014 26.796l4.591 2.224-.642-5.307-3.95 3.083z" fill="#E27625" stroke="#E27625" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M19.256 22.01l-.88 4.544.627.44 3.95-3.083.12-3.118-3.817 1.217zM15.744 22.01l-3.808-1.218.099 3.118 3.95 3.083.638-.44-.88-4.543z" fill="#F5841F" stroke="#F5841F" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M32.012 16.44l-7.59-2.222 2.15 3.233-3.193 6.236 4.215-.055h6.29l-1.872-7.192zM10.978 14.218l-7.59 2.222-1.86 7.192h6.28l4.204.055-3.193-6.236 2.16-3.233z" fill="#F5841F" stroke="#F5841F" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function WalletConnectIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M4.91 7.52C9.86 2.67 17.58 2.67 22.52 7.52L23.1 8.09a.5.5 0 010 .71l-2.06 2.02a.27.27 0 01-.37 0l-.82-.8c-3.47-3.39-9.09-3.39-12.56 0l-.88.86a.27.27 0 01-.37 0L4.01 8.87a.5.5 0 010-.71l.9-.64zm20.34 3.78l1.83 1.79a.5.5 0 010 .71l-8.27 8.1a.53.53 0 01-.75 0l-5.87-5.74a.13.13 0 00-.18 0l-5.87 5.74a.53.53 0 01-.75 0L.33 13.8a.5.5 0 010-.71l1.83-1.79a.53.53 0 01.75 0l5.87 5.74c.05.05.13.05.18 0l5.87-5.74a.53.53 0 01.75 0l5.87 5.74c.05.05.13.05.18 0l5.87-5.74a.53.53 0 01.75 0z" fill="#3B99FC"/>
    </svg>
  );
}

function CoinbaseIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="6" fill="#0052FF"/>
      <path d="M12 4.5A7.5 7.5 0 104.5 12 7.51 7.51 0 0012 4.5zm0 13.5A6 6 0 1118 12a6 6 0 01-6 6zm-2.25-6a2.25 2.25 0 104.5 0 2.25 2.25 0 00-4.5 0z" fill="white"/>
    </svg>
  );
}

function BinanceIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="12" fill="#F3BA2F"/>
      <path d="M12 6l1.55 1.55L9.1 12l4.45 4.45L12 18 6.65 12 12 6zm0 0l-1.55 1.55L14.9 12l-4.45 4.45L12 18l5.35-6L12 6zM12 9.55L13.45 12 12 14.45 10.55 12 12 9.55z" fill="#1A1A1A"/>
    </svg>
  );
}

function ProviderIcon({ user }: { user: any }) {
  const linked = user?.linkedAccounts ?? [];
  const { wallets } = useWallets();

  const metamaskWallet = wallets.find((w) => w.walletClientType === "metamask");
  const coinbaseWallet = wallets.find((w) => w.walletClientType === "coinbase_wallet");
  const binanceWallet  = wallets.find((w) => w.walletClientType === "binance");
  const wcWallet       = wallets.find((w) => w.connectorType === "wallet_connect");

  if (metamaskWallet) return <MetaMaskIcon size={14} />;
  if (coinbaseWallet) return <CoinbaseIcon size={14} />;
  if (binanceWallet)  return <BinanceIcon size={14} />;
  if (wcWallet)       return <WalletConnectIcon size={14} />;

  if (linked.some((a: any) => a.type === "google_oauth")) {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
    );
  }
  if (linked.some((a: any) => a.type === "twitter_oauth")) {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-[#d4e9f3]">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.743l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.912-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    );
  }
  if (linked.some((a: any) => a.type === "linkedin_oauth")) {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="#0A66C2">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    );
  }
  if (linked.some((a: any) => a.type === "discord_oauth")) {
    return (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="#5865F2">
        <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03z"/>
      </svg>
    );
  }
  if (linked.some((a: any) => a.type === "github_oauth")) {
    return (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="#d4e9f3">
        <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
      </svg>
    );
  }
  if (linked.some((a: any) => a.type === "apple_oauth")) {
    return (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="#d4e9f3">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
      </svg>
    );
  }
  if (linked.some((a: any) => a.type === "farcaster")) {
    return (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="#8465CB">
        <path d="M11.19 3.5H12.81C12.81 3.5 14.62 3.5 14.62 5.31V10.53L16.43 3.5H18.24L20.05 10.53V5.31C20.05 3.5 21.86 3.5 21.86 3.5H23.67V20.5H21.86C21.86 20.5 20.05 20.5 20.05 18.69V13.47L18.24 20.5H16.43L14.62 13.47V18.69C14.62 20.5 12.81 20.5 12.81 20.5H11.19C11.19 20.5 9.38 20.5 9.38 18.69V13.5H6.72L5.81 16.25H7.57C7.57 16.25 9.38 16.25 9.38 18.06V20.5H0.33V18.06C0.33 16.25 2.14 16.25 2.14 16.25H3.1L6.24 7H3.95V5.31C3.95 3.5 5.76 3.5 5.76 3.5H9.38V18.69C9.38 20.5 11.19 20.5 11.19 20.5"/>
      </svg>
    );
  }
  if (linked.some((a: any) => a.type === "email")) {
    return (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="#83eef0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <polyline points="22,6 12,13 2,6" stroke="#83eef0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  }
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <path d="M21 18V19C21 20.1 20.1 21 19 21H5C3.89 21 3 20.1 3 19V5C3 3.9 3.89 3 5 3H19C20.1 3 21 3.9 21 5V6H12C10.89 6 10 6.9 10 8V16C10 17.1 10.89 18 12 18H21ZM12 16H22V8H12V16ZM16 13.5C15.17 13.5 14.5 12.83 14.5 12C14.5 11.17 15.17 10.5 16 10.5C16.83 10.5 17.5 11.17 17.5 12C17.5 12.83 16.83 13.5 16 13.5Z" fill="#d4e9f380"/>
    </svg>
  );
}

interface PrivyLoginButtonProps {
  /**
   * compact — 36×36 circle for tight mobile headers.
   * When authenticated, tapping calls `onOpenMenu` (if provided) instead of logging out.
   */
  compact?: boolean;
  /** Called when the compact authenticated avatar is tapped — use to open the mobile menu */
  onOpenMenu?: () => void;
}

export function PrivyLoginButton({ compact = false, onOpenMenu }: PrivyLoginButtonProps) {
  const { ready, authenticated, login, logout, user } = usePrivy();
  const doLogin = () => { try { login(); } catch { /* ignore */ } };

  /* ── Loading ── */
  if (!ready) {
    if (compact) {
      return (
        <div
          data-testid="button-login-loading"
          className="w-9 h-9 rounded-full bg-[#83eef018] border border-[#83eef030] animate-pulse flex-shrink-0"
        />
      );
    }
    return (
      <div
        data-testid="button-login-loading"
        className="h-10 w-24 rounded-full bg-[#83eef018] border border-[#83eef030] animate-pulse"
      />
    );
  }

  /* ── Authenticated ── */
  if (authenticated) {
    const linked = user?.linkedAccounts ?? [];
    const emailAcct   = linked.find((a: any) => a.type === "email") as any;
    const googleAcct  = linked.find((a: any) => a.type === "google_oauth") as any;
    const twitterAcct = linked.find((a: any) => a.type === "twitter_oauth") as any;
    const walletAddr  = user?.wallet?.address;

    const displayName =
      twitterAcct?.username
        ? `@${twitterAcct.username}`
        : emailAcct?.address
        ?? googleAcct?.email?.split("@")[0]
        ?? (walletAddr ? walletAddr.slice(0, 6) + "…" + walletAddr.slice(-4) : "Explorer");

    const initial = displayName.replace("@", "").charAt(0).toUpperCase();

    /* compact: 36px circle avatar — opens menu instead of logging out */
    if (compact) {
      return (
        <button
          onClick={onOpenMenu ?? (() => logout().catch(() => {}))}
          data-testid="button-account-compact"
          aria-label={`Account: ${displayName}`}
          className="w-9 h-9 rounded-full bg-[linear-gradient(135deg,#83eef040_0%,#3fb0b328_100%)] border border-[#83eef050] flex items-center justify-center flex-shrink-0 active:opacity-70 transition-opacity"
        >
          <span className="[font-family:'Inter',Helvetica] font-bold text-[#83eef0] text-xs leading-none">
            {initial}
          </span>
        </button>
      );
    }

    /* desktop: account pill — provider icon + name + sign-out */
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenMenu}
          data-testid="button-account-desktop"
          aria-label={`Account: ${displayName}`}
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-[#83eef00f] border border-[#83eef025] hover:bg-[#83eef01a] transition-colors"
        >
          {/* Avatar circle */}
          <div className="w-7 h-7 rounded-full bg-[linear-gradient(135deg,#83eef040_0%,#3fb0b328_100%)] border border-[#83eef050] flex items-center justify-center flex-shrink-0">
            <span className="[font-family:'Inter',Helvetica] font-bold text-[#83eef0] text-[10px] leading-none">
              {initial}
            </span>
          </div>
          {/* Display name */}
          <div className="flex items-center gap-1.5">
            <span
              data-testid="text-user-display-name"
              className="[font-family:'Inter',Helvetica] font-medium text-[#d4e9f3cc] text-sm max-w-[120px] truncate"
            >
              {displayName}
            </span>
          </div>
          <ChevronDown size={13} className="text-[#83eef080] flex-shrink-0" />
        </button>

        <Button
          onClick={() => logout().catch(() => {})}
          data-testid="button-sign-out"
          title="Sign out"
          className="w-9 h-9 rounded-full bg-[#ff4a4a0d] border border-[#ff4a4a20] hover:bg-[#ff4a4a1a] transition-colors flex items-center justify-center p-0 shadow-none"
        >
          <LogOut size={14} className="text-[#ff8a8a]" />
        </Button>
      </div>
    );
  }

  /* ── Not authenticated — compact ── */
  if (compact) {
    return (
      <button
        onClick={doLogin}
        data-testid="button-login-compact"
        aria-label="Log in"
        className="w-9 h-9 rounded-full bg-[linear-gradient(135deg,rgba(131,238,240,0.92)_0%,rgba(63,176,179,0.92)_100%)] border-none shadow-[0_2px_12px_rgba(131,238,240,0.28)] flex items-center justify-center flex-shrink-0 active:opacity-80 transition-opacity"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
          <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3" stroke="#00585a" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    );
  }

  /* ── Not authenticated — full desktop ── */
  return (
    <button
      onClick={doLogin}
      data-testid="button-login-toggle"
      className="relative inline-flex items-center justify-center gap-2 px-5 md:px-6 py-2.5 h-auto rounded-full bg-[linear-gradient(170deg,#83eef0_0%,#3fb0b3_100%)] border-none shadow-[0_4px_20px_rgba(131,238,240,0.25)] hover:shadow-[0_4px_24px_rgba(131,238,240,0.4)] hover:opacity-95 transition-all"
    >
      <span className="[font-family:'Inter',Helvetica] font-semibold text-[#00585a] text-sm md:text-base leading-6 whitespace-nowrap">
        Log in
      </span>
      <ChevronDown size={14} className="text-[#006b6d]" />
    </button>
  );
}
