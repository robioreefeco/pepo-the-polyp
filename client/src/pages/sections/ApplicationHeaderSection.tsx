import { Button } from "@/components/ui/button";
import { PrivyLoginButton } from "@/components/PrivyLoginButton";
import { PRIVY_ENABLED } from "@/lib/privy";

const navLinks = [
  { label: "MesoReef DAO", href: "https://mesoreefdao.org/" },
  { label: "ReefRegen", href: "https://reefregen.org/" },
  { label: "Join", href: "https://linktr.ee/mesoreefdao" },
];

function PlainLoginButton() {
  return (
    <Button
      className="relative inline-flex items-center justify-center px-4 md:px-6 py-2 h-auto rounded-full bg-[linear-gradient(170deg,rgba(131,238,240,1)_0%,rgba(63,176,179,1)_100%)] border-none shadow-none hover:opacity-90 transition-opacity"
      asChild={false}
      onClick={() => window.open("https://dashboard.privy.io", "_blank")}
    >
      <span className="absolute inset-0 bg-[#ffffff01] rounded-full shadow-[0px_4px_6px_-4px_#83eef033,0px_10px_15px_-3px_#83eef033]" />
      <span className="relative [font-family:'Inter',Helvetica] font-normal text-[#00585a] text-sm md:text-base text-center tracking-[0] leading-6 whitespace-nowrap">
        Log in
      </span>
    </Button>
  );
}

export const ApplicationHeaderSection = (): JSX.Element => {
  return (
    <header className="flex w-full items-center justify-between px-4 md:px-8 py-3 md:py-4 border-b border-[#ffffff0d] backdrop-blur-[20px] backdrop-brightness-[100%] [-webkit-backdrop-filter:blur(20px)_brightness(100%)] bg-[linear-gradient(180deg,rgba(0,22,30,1)_0%,rgba(0,16,23,0.4)_100%),linear-gradient(0deg,rgba(0,8,12,0.8)_0%,rgba(0,8,12,0.8)_100%)] relative z-10">
      {/* Logo */}
      <img
        src="/figmaAssets/mesoreef-dao-logo-new.png"
        alt="MesoReef DAO"
        className="h-8 md:h-10 w-auto flex-shrink-0 object-contain"
      />

      {/* Navigation links — hidden on mobile */}
      <nav className="hidden md:inline-flex items-center gap-8">
        {navLinks.map((link) => (
          <a
            key={link.label}
            className="[font-family:'Plus_Jakarta_Sans',Helvetica] font-normal text-[#d4e9f3b2] text-base tracking-[-0.40px] leading-6 whitespace-nowrap hover:text-[#d4e9f3] transition-colors"
            href={link.href}
            rel="noopener noreferrer"
            target="_blank"
          >
            {link.label}
          </a>
        ))}
      </nav>

      {/* Auth button */}
      {PRIVY_ENABLED ? <PrivyLoginButton /> : <PlainLoginButton />}
    </header>
  );
};
