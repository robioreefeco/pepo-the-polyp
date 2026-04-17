interface OrcidLoginButtonProps {
  className?: string;
  label?: string;
  size?: "sm" | "md" | "lg";
}

export function OrcidLoginButton({ className = "", label = "Sign in with ORCID iD", size = "md" }: OrcidLoginButtonProps) {
  const handleClick = () => {
    window.location.href = "/api/auth/orcid";
  };

  const sizeClasses = {
    sm: "px-3 py-1.5 text-xs gap-1.5",
    md: "px-4 py-2.5 text-sm gap-2",
    lg: "px-6 py-3 text-base gap-2.5",
  };

  const iconSizes = { sm: 16, md: 22, lg: 26 };

  return (
    <button
      onClick={handleClick}
      data-testid="button-orcid-login"
      className={`flex items-center justify-center font-semibold rounded-xl bg-[#A6CE39] hover:bg-[#95bc2e] active:bg-[#84a829] text-white transition-colors shadow-sm ${sizeClasses[size]} ${className}`}
    >
      <OrcidIcon size={iconSizes[size]} />
      <span className="[font-family:'Inter',Helvetica] tracking-wide">{label}</span>
    </button>
  );
}

export function OrcidIcon({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 72 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="ORCID iD"
    >
      <circle cx="36" cy="36" r="36" fill="white" />
      <circle cx="36" cy="36" r="30" fill="#A6CE39" />
      {/* i dot */}
      <circle cx="23.5" cy="19" r="4" fill="white" />
      {/* i stem */}
      <rect x="20" y="27" width="7" height="26" rx="1.5" fill="white" />
      {/* D */}
      <path
        d="M33 27h9.5c7.5 0 12.5 5 12.5 13s-5 13-12.5 13H33V27z"
        fill="white"
      />
      <path
        d="M36.5 30.5h5.5c5 0 8.5 3.5 8.5 9.5s-3.5 9.5-8.5 9.5h-5.5V30.5z"
        fill="#A6CE39"
      />
    </svg>
  );
}
