import {
  LayoutDashboard,
  Users,
  FolderKanban,
  Car,
  CalendarDays,
  FileStack,
  Receipt,
  Calculator,
  MessagesSquare,
  ClipboardCheck,
  ClipboardList,
  Truck,
  Bell,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface NavGroup {
  label: string;
  emoji: string;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  {
    emoji: "🏠",
    label: "Pilotage",
    items: [{ href: "/", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    emoji: "🚗",
    label: "DIMZ",
    items: [
      { href: "/dossiers", label: "Dossiers", icon: FolderKanban },
      { href: "/clients", label: "Clients", icon: Users },
      { href: "/annonces", label: "Annonces", icon: Car },
    ],
  },
  {
    emoji: "📋",
    label: "Opérations",
    items: [
      { href: "/agenda", label: "Agenda", icon: CalendarDays },
      { href: "/dossiers?vue=inspections", label: "Inspections", icon: ClipboardCheck },
      { href: "/dossiers?vue=convoyages", label: "Convoyages", icon: Truck },
      { href: "/retours-test", label: "Retours test", icon: ClipboardList },
    ],
  },
  {
    emoji: "💰",
    label: "Gestion",
    items: [
      { href: "/facturation", label: "Facturation", icon: Receipt },
      { href: "/comptabilite", label: "Comptabilité", icon: Calculator },
      { href: "/documents", label: "Documents", icon: FileStack },
    ],
  },
  {
    emoji: "⚙️",
    label: "",
    items: [
      { href: "/messagerie", label: "Messagerie", icon: MessagesSquare },
      { href: "/notifications", label: "Notifications", icon: Bell },
      { href: "/parametres", label: "Paramètres", icon: Settings },
    ],
  },
];

/**
 * Un item est actif si son chemin correspond, ET (s'il précise une query
 * string, ex. "/dossiers?vue=inspections") si celle-ci correspond aussi —
 * sinon "Dossiers", "Inspections" et "Convoyages" s'allumeraient tous les
 * trois en même temps puisqu'ils pointent vers le même chemin /dossiers.
 */
export function isNavItemActive(item: NavItem, pathname: string, search: string): boolean {
  const [itemPath, itemQuery] = item.href.split("?");
  if (itemPath === "/") return pathname === "/";
  if (!pathname.startsWith(itemPath)) return false;
  if (itemQuery) return search.replace(/^\?/, "") === itemQuery;
  return true;
}
