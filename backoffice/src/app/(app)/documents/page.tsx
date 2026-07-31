import Link from "next/link";
import { Download } from "lucide-react";
import { listAllDocuments } from "@/lib/queries";
import { getSignedUrls } from "@/lib/storage";
import { Card, PageHeader, EmptyState, Badge } from "@/components/ui";
import { DOCUMENT_TYPE_LABELS } from "@/lib/types";
import { formatDate } from "@/lib/format";

export default async function DocumentsPage() {
  const documents = await listAllDocuments();
  const urls = await getSignedUrls(documents.map((d) => d.storage_path));

  return (
    <div>
      <PageHeader
        title="Documents"
        description="Bibliothèque de tous les documents, classés par dossier. Les fichiers s'ajoutent depuis l'onglet « Documents » de chaque dossier."
      />

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
