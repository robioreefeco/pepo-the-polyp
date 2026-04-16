interface OrcidLoginButtonProps {
  className?: string;
  label?: string;
  size?: "sm" | "md" | "lg";
}

export function OrcidLoginButton({ className = "", label = "Sign in with ORCID", size = "md" }: OrcidLoginButtonProps) {
  const handleClick = () => {
    window.location.href = "/api/auth/orcid";
  };

  const sizeClasses = {
    sm: "px-3 py-1.5 text-xs gap-1.5",
    md: "px-4 py-2.5 text-sm gap-2",
    lg: "px-6 py-3 text-base gap-2.5",
  };

  const iconSizes = { sm: 16, md: 20, lg: 24 };

  return (
    <button
      onClick={handleClick}
      data-testid="button-orcid-login"
      className={`flex items-center justify-center font-medium rounded-xl bg-[#A6CE39] hover:bg-[#95bc2e] active:bg-[#84a829] text-white transition-colors ${sizeClasses[size]} ${className}`}
    >
      <OrcidIcon size={iconSizes[size]} />
      <span className="[font-family:'Inter',Helvetica]">{label}</span>
    </button>
  );
}

function OrcidIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 256 256" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="128" cy="128" r="128" fill="white" />
      <circle cx="128" cy="128" r="108" fill="#A6CE39" />
      <text x="128" y="168" textAnchor="middle" fontSize="120" fontWeight="bold" fill="white" fontFamily="Arial">
        id
      </text>
    </svg>
  );
}
