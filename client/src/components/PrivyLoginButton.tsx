import { usePrivy } from "@privy-io/react-auth";
import { Button } from "@/components/ui/button";

export function PrivyLoginButton() {
  const { ready, authenticated, login, logout, user } = usePrivy();

  if (!ready) {
    return (
      <Button
        disabled
        className="relative inline-flex items-center justify-center px-6 py-2 h-auto rounded-full bg-[linear-gradient(170deg,rgba(131,238,240,0.5)_0%,rgba(63,176,179,0.5)_100%)] border-none shadow-none opacity-60"
      >
        <span className="relative [font-family:'Inter',Helvetica] font-normal text-[#00585a] text-base text-center leading-6 whitespace-nowrap">
          Loading...
        </span>
      </Button>
    );
  }

  if (authenticated) {
    const addr = user?.wallet?.address;
    const displayName =
      user?.email?.address ||
      (addr ? addr.slice(0, 6) + "..." + addr.slice(-4) : "Explorer");

    return (
      <div className="flex items-center gap-3">
        <span className="[font-family:'Inter',Helvetica] font-normal text-[#d4e9f3b2] text-sm">
          {displayName}
        </span>
        <Button
          onClick={logout}
          className="relative inline-flex items-center justify-center px-5 py-2 h-auto rounded-full bg-[#83eef01a] border border-solid border-[#83eef033] shadow-none hover:bg-[#83eef033] transition-colors"
        >
          <span className="relative [font-family:'Inter',Helvetica] font-normal text-[#83eef0] text-sm text-center leading-6 whitespace-nowrap">
            Sign Out
          </span>
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={login}
      className="relative inline-flex items-center justify-center px-6 py-2 h-auto rounded-full bg-[linear-gradient(170deg,rgba(131,238,240,1)_0%,rgba(63,176,179,1)_100%)] border-none shadow-none hover:opacity-90 transition-opacity"
    >
      <span className="absolute inset-0 bg-[#ffffff01] rounded-full shadow-[0px_4px_6px_-4px_#83eef033,0px_10px_15px_-3px_#83eef033]" />
      <span className="relative [font-family:'Inter',Helvetica] font-normal text-[#00585a] text-base text-center leading-6 whitespace-nowrap">
        Log in
      </span>
    </Button>
  );
}
