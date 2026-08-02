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
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV: NavItem[] = [
  { href: "/", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/dossiers", label: "Dossiers", icon: FolderKanban },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/vehicules", label: "Véhicules", icon: Car },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/documents", label: "Documents", icon: FileStack },
  { href: "/facturation", label: "Facturation", icon: Receipt },
  { href: "/comptabilite", label: "Comptabilité", icon: Calculator },
  { href: "/messagerie", label: "Messagerie", icon: MessagesSquare },
];
