/** Logo LexiCards : deux cartes décalées, dessin original. */
export function Logo({ className = 'size-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect x="3" y="7" width="18" height="22" rx="4" className="fill-primary-soft" />
      <rect
        x="11"
        y="3"
        width="18"
        height="22"
        rx="4"
        className="fill-primary stroke-surface"
        strokeWidth="2"
      />
      <path
        d="M17 9v10h6"
        fill="none"
        className="stroke-on-primary"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
