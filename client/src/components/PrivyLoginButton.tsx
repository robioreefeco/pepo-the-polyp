import { usePrivy } from "@privy-io/react-auth";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";

function ProviderIcon({ user }: { user: any }) {
  const linked = user?.linkedAccounts ?? [];

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
