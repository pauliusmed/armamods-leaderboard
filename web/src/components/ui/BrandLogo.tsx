interface BrandLogoProps {
  compact?: boolean;
}

/** A/M network mark: two linked paths form the brand's mod topology. */
export function BrandLogo({ compact = false }: BrandLogoProps) {
  return (
    <span className="inline-flex items-center gap-3 min-w-0" aria-label="Arma Mods">
      <svg
        aria-hidden="true"
        viewBox="0 0 48 48"
        className="size-9 sm:size-10 shrink-0"
        fill="none"
      >
        <path
          d="M7 36 16 11l8 18 8-18 9 25"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
        <path
          d="M12 29h24M16 11h16"
          stroke="var(--color-brand-copper)"
          strokeWidth="2"
          strokeLinecap="square"
        />
        <circle cx="16" cy="11" r="3" fill="var(--color-brand-copper)" />
        <circle cx="24" cy="29" r="3" fill="var(--color-brand-copper)" />
        <circle cx="32" cy="11" r="3" fill="var(--color-brand-copper)" />
      </svg>
      {!compact && (
        <span className="min-w-0 space-y-0.5 sm:space-y-1">
          <span className="block text-base sm:text-xl font-black text-white tracking-[0.1em] uppercase leading-none truncate">
            Arma <span className="text-brand-copper">Mods</span>
          </span>
          <span className="hidden sm:block text-[7px] sm:text-[9px] text-gray-500 font-bold uppercase tracking-[0.3em] truncate">
            Mission Intelligence Center
          </span>
        </span>
      )}
    </span>
  );
}
