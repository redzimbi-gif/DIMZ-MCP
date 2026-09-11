export function LogoMark({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="10.5" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M8 15.5V9.2c0-.4.32-.7.72-.7h3.9c1.86 0 3.38 1.44 3.38 3.5s-1.52 3.5-3.38 3.5H8Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 text-blue-600 ${className}`}>
      <LogoMark />
      <span className="font-semibold text-ink tracking-tight">Dimz</span>
    </span>
  );
}
