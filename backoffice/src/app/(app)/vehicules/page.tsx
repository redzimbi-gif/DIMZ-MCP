import Link from "next/link";
import { listAllAnnonces } from "@/lib/queries";
import { Card, PageHeader, EmptyState, Badge } from "@/components/ui";
import { formatCurrency } from "@/lib/format";

export default async function VehiculesPage() {
  const annonces = await listAllAnnonces();

  return (
    <div>
      <PageHeader
        title="Véhicules"
        description="Toutes les annonces repérées, tous dossiers confondus. Ajoute-en depuis l'onglet « Véhicules » d'un dossier."
      />

      <Card>
        {annonces.length === 0 ? (
          <EmptyState title="Aucune annonce enregistrée" />
        ) : (
          <ul className="divide-y divide-line">
            {annonces.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/dossiers/${a.dossier_id}?tab=vehicules`}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-surface-sunken"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-ink truncate">{a.titre}</p>
                      {a.selectionnee ? <Badge tone="blue">Sélectionnée</Badge> : null}
                    </div>
                    <p className="text-xs text-ink-soft mt-0.5 truncate">
                      {a.dossiers?.reference} — {a.dossiers?.clients?.prenom} {a.dossiers?.clients?.nom}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-blue-600 tnum shrink-0 ml-3">
                    {a.prix ? formatCurrency(a.prix) : "—"}
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
