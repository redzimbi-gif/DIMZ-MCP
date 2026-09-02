import Link from "next/link";
import { listAllInspections } from "@/lib/queries";
import { Card, PageHeader, EmptyState } from "@/components/ui";
import { formatDate } from "@/lib/format";

export default async function InspectionsPage() {
  const inspections = await listAllInspections();

  return (
    <div>
      <PageHeader
        title="Inspections"
        description="Toutes les inspections (Rapport DIMZ), tous dossiers confondus."
      />

      <Card>
        {inspections.length === 0 ? (
          <EmptyState
            title="Aucune inspection"
            description="Les inspections se créent depuis l'onglet Inspection d'un dossier."
          />
        ) : (
          <ul className="divide-y divide-line">
            {inspections.map((i) => (
              <li key={i.id}>
                <Link
                  href={`/dossiers/${i.dossier_id}/inspections/${i.id}`}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-surface-sunken transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink truncate">
                      {i.vehicule_titre || `Inspection du ${formatDate(i.date_inspection)}`}
                    </p>
                    <p className="text-xs text-ink-soft mt-0.5">
                      {i.dossiers?.reference}
                      {i.dossiers?.clients ? ` · ${i.dossiers.clients.prenom ?? ""} ${i.dossiers.clients.nom ?? ""}` : ""}
                      {" · "}
                      {formatDate(i.date_inspection)}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-blue-600 tnum shrink-0 ml-3">
                    {i.note_finale != null ? `${i.note_finale}/10` : "Note non renseignée"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
