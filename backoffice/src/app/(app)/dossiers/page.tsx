import Link from "next/link";
import { Plus, Archive } from "lucide-react";
import { listDossiers } from "@/lib/queries";
import { PageHeader, LinkButton, StatutBadge } from "@/components/ui";
import { DOSSIER_STATUTS, DOSSIER_STATUT_LABELS } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/format";

export default async function DossiersPage({
  searchParams,
}: {
  searchParams: { archives?: string };
}) {
  const showArchives = searchParams.archives === "1";
  const dossiers = await listDossiers({ archived: showArchives });

  const byStatut = Object.fromEntries(
    DOSSIER_STATUTS.map((s) => [s, dossiers.filter((d) => d.statut === s)])
  );

  return (
    <div>
      <PageHeader
        title={showArchives ? "Dossiers archivés" : "Dossiers"}
        description={`${dossiers.length} dossier${dossiers.length > 1 ? "s" : ""} au total`}
        actions={
          <>
            <LinkButton href={showArchives ? "/dossiers" : "/dossiers?archives=1"} variant="outline">
              <Archive className="h-4 w-4" /> {showArchives ? "Retour au pipeline" : "Voir les archives"}
            </LinkButton>
            <LinkButton href="/dossiers/new">
              <Plus className="h-4 w-4" /> Nouveau dossier
            </LinkButton>
          </>
        }
      />

      <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 md:mx-0 md:px-0">
        {DOSSIER_STATUTS.map((statut) => {
          const items = byStatut[statut];
          return (
            <div key={statut} className="w-72 shrink-0">
              <div className="flex items-center justify-between mb-2.5 px-1">
                <h2 className="text-xs font-semibold text-ink-soft uppercase tracking-wide">
                  {DOSSIER_STATUT_LABELS[statut]}
                </h2>
                <span className="text-xs text-ink-faint tnum">{items.length}</span>
              </div>
              <div className="space-y-2">
                {items.map((d) => (
                  <Link
                    key={d.id}
                    href={`/dossiers/${d.id}`}
                    className="block bg-surface border border-line rounded-lg2 shadow-card p-3.5 hover:border-blue-300 transition-colors"
                  >
                    <p className="text-sm font-medium text-ink truncate">
                      {d.clients?.prenom} {d.clients?.nom}
                    </p>
                    <p className="text-xs text-ink-soft mt-0.5 truncate">
                      {d.vehicule_recherche || d.reference}
                    </p>
                    <div className="flex items-center justify-between mt-2.5">
                      <span className="text-xs text-ink-faint tnum">{formatDate(d.created_at)}</span>
                      {d.valeur_estimee ? (
                        <span className="text-xs font-medium text-blue-600 tnum">
                          {formatCurrency(d.valeur_estimee)}
                        </span>
                      ) : null}
                    </div>
                  </Link>
                ))}
                {items.length === 0 ? (
                  <div className="text-xs text-ink-faint px-1 py-2">Aucun dossier</div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
