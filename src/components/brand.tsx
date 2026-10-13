import Link from "next/link";

/** The Leapform mark: a rounded forest-green tile with a leaping arrow. */
export function LeapMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
      <rect width="28" height="28" rx="8" fill="#18442a" />
      <path
        d="M6.5 20.5 L11.5 11.5 l3.5 3.9 L20.5 6.5"
        stroke="#f3ede3"
        strokeWidth="2.4"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15.8 6.5 H20.5 V11.2"
        stroke="#f3ede3"
        strokeWidth="2.4"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="6.5" cy="20.5" r="1.7" fill="#e4dbc4" />
    </svg>
  );
}

export function LeapWordmark() {
  return (
    <span className="text-[15px] font-bold tracking-tight text-everest">
      Leap<span className="font-extrabold">form</span>
    </span>
  );
}

/**
 * Shared branded page header: logo row + optional title/subtitle on the left,
 * optional action buttons on the right.
 */
export function AppHeader({
  backHref,
  title,
  subtitle,
  actions,
}: {
  /** Where the logo links back to (defaults to the wordmark only). */
  backHref?: string;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-9">
      <div className="flex items-center justify-between gap-4">
        {backHref ? (
          <Link href={backHref} className="flex items-center gap-2 transition hover:opacity-80">
            <LeapMark size={26} />
            <LeapWordmark />
            <span className="text-slate-300">/</span>
            <span className="text-sm font-medium text-slate-500">back</span>
          </Link>
        ) : (
          <Link href="/" className="flex items-center gap-2 transition hover:opacity-80">
            <LeapMark size={26} />
            <LeapWordmark />
          </Link>
        )}
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      {title && <h1 className="mt-5 truncate text-2xl font-bold tracking-tight">{title}</h1>}
      {subtitle && <div className="mt-1 text-sm text-slate-500">{subtitle}</div>}
    </header>
  );
}
