import Link from "next/link";
import { Download, FileText } from "lucide-react";
import { listAllDocuments, listAllDossierContrats } from "@/lib/queries";
import { getSignedUrls } from "@/lib/storage";
import { Card, PageHeader, EmptyState, Badge } from "@/components/ui";
import { DOCUMENT_TYPE_LABELS, CONTRAT_TYPE_LABELS, CONTRAT_STATUT_LABELS } from "@/lib/types";
import { formatDate } from "@/lib/format";

const CONTRAT_STATUT_TONE: Record<string, "warn" | "good" | "neutral"> = {
  a_signer: "warn",
  signe: "good",
  archive: "neutral",
};

export default async function DocumentsPage() {
  const [documents, contrats] = await Promise.all([listAllDocuments(), listAllDossierContrats()]);
  const urls = await getSignedUrls(documents.map((d) => d.storage_path));

  return (
    <div>
      <PageHeader
        title="Documents"
        description="Bibliothèque de tous les documents, classés par dossier. Les fichiers s'ajoutent depuis l'onglet « Documents » de chaque dossier."
      />

      <h2 className="text-sm font-semibold text-ink mb-3">Documents & contrats générés</h2>
      <Card className="mb-6">
        {contrats.length === 0 ? (
          <EmptyState
            title="Aucun document généré"
            description="CGV, contrats et autres documents se génèrent depuis l'onglet « Documents & contrats » de chaque dossier."
          />
        ) : (
          <ul className="divide-y divide-line">
            {contrats.map((c) => (
              <li key={c.id} className="flex items-center justify-between px-5 py-3.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink truncate">{CONTRAT_TYPE_LABELS[c.type]}</p>
                  <p className="text-xs text-ink-soft mt-0.5">
                    {c.dossiers ? (
                      <Link href={`/dossiers/${c.dossier_id}?tab=contrats`} className="hover:text-blue-600">
                        {c.dossiers.reference}
                      </Link>
                    ) : null}
                    {c.dossiers?.clients ? ` · ${c.dossiers.clients.prenom} ${c.dossiers.clients.nom}` : ""}
                    {" · "}
                    {formatDate(c.date_generation ?? c.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-3">
                  <Badge tone={CONTRAT_STATUT_TONE[c.statut]}>{CONTRAT_STATUT_LABELS[c.statut]}</Badge>
                  <a
                    href={`/api/dossiers/${c.dossier_id}/contrats/${c.type}/pdf`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-md text-ink-soft hover:text-blue-600 hover:bg-blue-50"
                    aria-label="Voir le PDF"
                  >
                    <FileText className="h-4 w-4" />
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <h2 className="text-sm font-semibold text-ink mb-3">Fichiers uploadés</h2>
      <Card>
        {documents.length === 0 ? (
          <EmptyState title="Aucun document" />
        ) : (
          <ul className="divide-y divide-line">
            {documents.map((d) => (
              <li key={d.id} className="flex items-center justify-between px-5 py-3.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink truncate">{d.nom}</p>
                  <p className="text-xs text-ink-soft mt-0.5">
                    {d.dossiers ? (
                      <Link href={`/dossiers/${d.dossier_id}?tab=documents`} className="hover:text-blue-600">
                        {d.dossiers.reference}
                      </Link>
                    ) : null}
                    {d.clients ? ` · ${d.clients.prenom} ${d.clients.nom}` : ""}
                    {" · "}
                    {formatDate(d.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-3">
                  <Badge>{DOCUMENT_TYPE_LABELS[d.type]}</Badge>
                  {urls[d.storage_path] ? (
                    <a
                      href={urls[d.storage_path]}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded-md text-ink-soft hover:text-blue-600 hover:bg-blue-50"
                      aria-label="Télécharger"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
