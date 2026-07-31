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
