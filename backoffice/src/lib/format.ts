import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(value: string | Date) {
  return format(new Date(value), "d MMM yyyy", { locale: fr });
}

export function formatDateTime(value: string | Date) {
  return format(new Date(value), "d MMM yyyy · HH:mm", { locale: fr });
}

export function formatRelative(value: string | Date) {
  return formatDistanceToNow(new Date(value), { locale: fr, addSuffix: true });
}

export function initials(nom?: string | null, prenom?: string | null) {
  const a = (prenom || "").trim().slice(0, 1);
  const b = (nom || "").trim().slice(0, 1);
  return (a + b).toUpperCase() || "?";
}

/** "un point par ligne" → liste, pour les champs texte libres qui alimentent des listes à puces. */
export function splitLines(value: string | null | undefined): string[] {
  return (value ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** "tag a, tag b" → liste, pour le champ tags séparés par des virgules. */
export function splitTags(value: string | null | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Secondes → "3 min 42 s", pour le temps de remplissage mesuré du questionnaire de test. */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m} min ${s} s` : `${s} s`;
}
