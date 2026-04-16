import { usePrivy, useWallets } from "@privy-io/react-auth";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
function MetaMaskIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 35 33" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M32.958 1L19.48 10.858l2.45-5.813L32.958 1z" fill="#E17726" stroke="#E17726" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2.042 1l13.365 9.957-2.33-5.912L2.042 1z" fill="#E27625" stroke="#E27625" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M28.178 23.533l-3.588 5.487 7.677 2.114 2.202-7.48-6.291-.121zM1.55 23.654l2.19 7.48 7.666-2.114-3.577-5.487-6.279.121z" fill="#E27625" stroke="#E27625" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M10.978 14.537l-2.14 3.233 7.617.34-.252-8.194-5.225 4.621zM24.022 14.537l-5.291-4.72-.176 8.293 7.617-.34-2.15-3.233z" fill="#E27625" stroke="#E27625" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M11.406 29.02l4.58-2.224-3.95-3.083-.63 5.307zM19.014 26.796l4.591 2.224-.642-5.307-3.95 3.083z" fill="#E27625" stroke="#E27625" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M23.605 29.02l-4.591-2.224.373 3.024-.044 1.342 4.262-2.142zM11.406 29.02l4.273 2.142-.033-1.342.362-3.024-4.602 2.224z" fill="#D5BFB2" stroke="#D5BFB2" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M15.744 22.01l-3.808-1.122 2.688-1.231 1.12 2.352zM19.256 22.01l1.12-2.352 2.699 1.23-3.82 1.122z" fill="#233447" stroke="#233447" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M11.406 29.02l.66-5.487-4.237.121 3.577 5.366zM23.605 29.02l-3.566-5.366-4.226.121.66 5.245h7.132zM26.267 17.77l-7.617.34.704 3.9 1.12-2.352 2.699 1.23 3.094-3.118zM11.936 20.888l2.688-1.23 1.12 2.352.703-3.9-7.617-.34 3.106 3.118z" fill="#CC6228" stroke="#CC6228" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8.838 17.77l3.193 6.236-.11-3.118-3.083-3.118zM23.09 20.888l-.121 3.118 3.193-6.236-3.072 3.118zM16.447 18.11l-.703 3.9.88 4.543.198-5.987-.375-2.456zM18.553 18.11l-.363 2.445.187 5.998.88-4.544-.704-3.9z" fill="#E27525" stroke="#E27525" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M19.256 22.01l-.88 4.544.627.44 3.95-3.083.12-3.118-3.817 1.217zM15.744 22.01l-3.808-1.218.099 3.118 3.95 3.083.638-.44-.88-4.543z" fill="#F5841F" stroke="#F5841F" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M19.311 31.162l.044-1.342-.34-.297h-4.031l-.319.297.033 1.342-4.273-2.142 1.496 1.22 3.027 2.102h5.137l3.04-2.103 1.484-1.219-4.298 2.142z" fill="#C0AC9D" stroke="#C0AC9D" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M19.014 26.796l-.627-.44h-3.774l-.638.44-.362 3.024.32-.297h4.03l.341.297-.29-3.024z" fill="#161616" stroke="#161616" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M33.519 11.32l1.1-5.366L32.958 1l-13.944 10.363 5.368 4.533 7.59 2.222 1.672-1.957-.726-.528 1.155-1.056-.89-.693 1.155-.88-.879-.693zM.38 5.954l1.1 5.366-.704.495 1.155.88-.88.693 1.155 1.056-.726.528 1.661 1.957 7.59-2.222 5.369-4.533L2.355 1 .38 5.954z" fill="#763E1A" stroke="#763E1A" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M32.012 16.44l-7.59-2.222 2.15 3.233-3.193 6.236 4.215-.055h6.29l-1.872-7.192zM10.978 14.218l-7.59 2.222-1.86 7.192h6.28l4.204.055-3.193-6.236 2.16-3.233zM18.65 18.11l.484-8.294-2.22-5.99H18.12l-2.21 5.99.483 8.294.176 2.465.011 5.975h.869l.012-5.975.187-2.465z" fill="#F5841F" stroke="#F5841F" strokeWidth=".25" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function ProviderIcon({ user }: { user: any }) {
  const linked = user?.linkedAccounts ?? [];
  const { wallets } = useWallets();
  const metamaskWallet = wallets.find((w) => w.walletClientType === "metamask");

  if (metamaskWallet) {
    return <MetaMaskIcon size={16} />;
  }

  if (linked.some((a: any) => a.type === "google_oauth")) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
    );
  }
  if (linked.some((a: any) => a.type === "twitter_oauth")) {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-[#d4e9f3]">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.743l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.912-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    );
  }
  if (linked.some((a: any) => a.type === "linkedin_oauth")) {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="#0A66C2">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    );
  }
  if (linked.some((a: any) => a.type === "email")) {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="#83eef0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <polyline points="22,6 12,13 2,6" stroke="#83eef0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M21 18V19C21 20.1 20.1 21 19 21H5C3.89 21 3 20.1 3 19V5C3 3.9 3.89 3 5 3H19C20.1 3 21 3.9 21 5V6H12C10.89 6 10 6.9 10 8V16C10 17.1 10.89 18 12 18H21ZM12 16H22V8H12V16ZM16 13.5C15.17 13.5 14.5 12.83 14.5 12C14.5 11.17 15.17 10.5 16 10.5C16.83 10.5 17.5 11.17 17.5 12C17.5 12.83 16.83 13.5 16 13.5Z" fill="#d4e9f380"/>
    </svg>
  );
}

export function PrivyLoginButton() {
  const { ready, authenticated, login, logout, user } = usePrivy();

  if (!ready) {
    return (
      <Button
        disabled
        data-testid="button-login-loading"
        className="relative inline-flex items-center justify-center px-6 py-2 h-auto rounded-full bg-[linear-gradient(170deg,rgba(131,238,240,0.5)_0%,rgba(63,176,179,0.5)_100%)] border-none shadow-none opacity-60"
      >
        <span className="relative [font-family:'Inter',Helvetica] font-normal text-[#00585a] text-sm leading-6">
          Loading…
        </span>
      </Button>
    );
  }

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
        ?? (walletAddr ? walletAddr.slice(0, 5) + "…" + walletAddr.slice(-3) : "Explorer");

    return (
      <div className="flex items-center gap-2.5">
        <div className="hidden sm:flex items-center gap-1.5">
          <ProviderIcon user={user} />
          <span
            data-testid="text-user-display-name"
            className="[font-family:'Inter',Helvetica] font-normal text-[#d4e9f3b2] text-sm max-w-[120px] truncate"
          >
            {displayName}
          </span>
        </div>
        <Button
          onClick={() => logout().catch(() => {})}
          data-testid="button-sign-out"
          className="relative inline-flex items-center justify-center px-4 md:px-5 py-2 h-auto rounded-full bg-[#83eef01a] border border-solid border-[#83eef033] shadow-none hover:bg-[#83eef033] transition-colors"
        >
          <span className="relative [font-family:'Inter',Helvetica] font-normal text-[#83eef0] text-sm leading-6 whitespace-nowrap">
            Sign Out
          </span>
        </Button>
      </div>
    );
  }

  return (
    <button
      onClick={() => { try { login(); } catch { /* suppress */ } }}
      data-testid="button-login-toggle"
      className="relative inline-flex items-center justify-center gap-2 px-5 md:px-6 py-2 h-auto rounded-full bg-[linear-gradient(170deg,rgba(131,238,240,1)_0%,rgba(63,176,179,1)_100%)] border-none shadow-[0px_4px_20px_rgba(131,238,240,0.25)] hover:opacity-90 transition-opacity"
    >
      <span className="[font-family:'Inter',Helvetica] font-semibold text-[#00585a] text-sm md:text-base leading-6 whitespace-nowrap">
        Log in
      </span>
      <ChevronDown size={14} className="text-[#00585a]" />
    </button>
  );
}
