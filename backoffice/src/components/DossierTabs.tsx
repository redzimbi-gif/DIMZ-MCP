import Link from "next/link";
import { clsx } from "clsx";

const TABS = [
  { key: "infos", label: "Infos" },
  { key: "vehicules", label: "Véhicules" },
  { key: "decouverte", label: "Fiche Découverte" },
  { key: "inspection", label: "Inspection" },
  { key: "convoyage", label: "Convoyage" },
  { key: "documents", label: "Documents" },
  { key: "contrats", label: "Documents & contrats" },
  { key: "notes", label: "Notes & historique" },
];

export function DossierTabs({ dossierId, active }: { dossierId: string; active: string }) {
  return (
    <div className="border-b border-line mb-6 -mt-1 overflow-x-auto">
      <nav className="flex gap-1 min-w-max">
        {TABS.map((tab) => {
          const isActive = active === tab.key;
          return (
            <Link
              key={tab.key}
              href={tab.key === "infos" ? `/dossiers/${dossierId}` : `/dossiers/${dossierId}?tab=${tab.key}`}
              className={clsx(
                "px-3.5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap",
                isActive
                  ? "border-blue-500 text-blue-700"
                  : "border-transparent text-ink-soft hover:text-ink"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
