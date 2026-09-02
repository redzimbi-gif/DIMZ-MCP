import { type ReactNode } from "react";
import { clsx } from "clsx";
import Link from "next/link";
import type { DossierStatut } from "@/lib/types";
import { DOSSIER_STATUT_LABELS } from "@/lib/types";

export function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={clsx(
        "bg-surface border border-line rounded-lg2 shadow-card",
        className
      )}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-6">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold text-ink tracking-tight text-balance">{title}</h1>
        {description ? (
          <p className="text-sm text-ink-soft mt-1">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">{actions}</div>
      ) : null}
    </div>
  );
}

const STAT_TONES: Record<string, string> = {
  blue: "bg-blue-50 text-blue-600",
  good: "bg-good-bg text-good",
  warn: "bg-warn-bg text-warn",
};

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "blue",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
  tone?: "blue" | "good" | "warn";
}) {
  return (
    <Card className="p-5 transition-shadow hover:shadow-pop">
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-medium text-ink-soft uppercase tracking-wide">
          {label}
        </span>
        {icon ? (
          <span className={clsx("shrink-0 rounded-md p-1.5", STAT_TONES[tone])}>{icon}</span>
        ) : null}
      </div>
      <div className="mt-2.5 text-2xl font-semibold text-ink tnum">{value}</div>
      {hint ? <div className="mt-1 text-xs text-ink-faint">{hint}</div> : null}
    </Card>
  );
}

const STATUT_STYLES: Record<DossierStatut, string> = {
  demande_recue: "bg-blue-50 text-blue-700",
  analyse_besoin: "bg-blue-50 text-blue-700",
  recherche: "bg-blue-100 text-blue-700",
  vehicules_selectionnes: "bg-blue-100 text-blue-700",
  inspection: "bg-warn-bg text-warn",
  negociation: "bg-warn-bg text-warn",
  achat_valide: "bg-blue-100 text-blue-800",
  convoyage: "bg-blue-100 text-blue-800",
  livraison: "bg-blue-100 text-blue-800",
  dossier_termine: "bg-good-bg text-good",
};

export function StatutBadge({ statut }: { statut: DossierStatut }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        STATUT_STYLES[statut]
      )}
    >
      {DOSSIER_STATUT_LABELS[statut]}
    </span>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "good" | "warn" | "bad" | "blue";
}) {
  const tones: Record<string, string> = {
    neutral: "bg-surface-sunken text-ink-soft border border-line",
    good: "bg-good-bg text-good",
    warn: "bg-warn-bg text-warn",
    bad: "bg-bad-bg text-bad",
    blue: "bg-blue-50 text-blue-700",
  };
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        tones[tone]
      )}
    >
      {children}
    </span>
  );
}

export function Button({
  children,
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline" | "ghost" | "danger";
}) {
  const variants: Record<string, string> = {
    primary: "bg-blue-500 hover:bg-blue-600 text-white shadow-sm shadow-blue-500/20",
    outline: "border border-line hover:bg-surface-sunken text-ink",
    ghost: "hover:bg-surface-sunken text-ink-soft",
    danger: "bg-bad hover:bg-bad/90 text-white shadow-sm shadow-bad/20",
  };
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center gap-1.5 rounded-md px-3.5 py-2 text-sm font-medium transition-colors focus-ring disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function LinkButton({
  href,
  children,
  variant = "primary",
  className,
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "outline" | "ghost";
  className?: string;
}) {
  const variants: Record<string, string> = {
    primary: "bg-blue-500 hover:bg-blue-600 text-white shadow-sm shadow-blue-500/20",
    outline: "border border-line hover:bg-surface-sunken text-ink",
    ghost: "hover:bg-surface-sunken text-ink-soft",
  };
  return (
    <Link
      href={href}
      className={clsx(
        "inline-flex items-center justify-center gap-1.5 rounded-md px-3.5 py-2 text-sm font-medium transition-colors focus-ring",
        variants[variant],
        className
      )}
    >
      {children}
    </Link>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="text-center py-14 px-4">
      <p className="text-sm font-medium text-ink">{title}</p>
      {description ? (
        <p className="text-sm text-ink-soft mt-1 max-w-sm mx-auto text-balance">{description}</p>
      ) : null}
    </div>
  );
}

export function Field({
  label,
  children,
  htmlFor,
}: {
  label: string;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <label htmlFor={htmlFor} className="block space-y-1.5">
      <span className="text-xs font-medium text-ink-soft">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  "w-full rounded-md border border-line px-3 py-2 text-sm text-ink focus-ring bg-surface";
