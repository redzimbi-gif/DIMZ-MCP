import { notFound } from "next/navigation";
import Image from "next/image";
import { FileDown } from "lucide-react";
import { getConvoyage } from "@/lib/queries";
import { getSignedUrls } from "@/lib/storage";
import { Card, PageHeader, LinkButton, Badge } from "@/components/ui";
import { CONVOYAGE_STATUT_LABELS } from "@/lib/types";
import { formatDate } from "@/lib/format";

export default async function ConvoyageDetailPage({
  params,
}: {
  params: { id: string; convoyageId: string };
}) {
  const convoyage = await getConvoyage(params.convoyageId);
  if (!convoyage || convoyage.dossier_id !== params.id) notFound();

  const allPhotos = [...convoyage.photos_avant, ...convoyage.photos_apres];
  const signatureUrl = convoyage.signature_client ? [convoyage.signature_client] : [];
  const urls = await getSignedUrls([...allPhotos, ...signatureUrl]);

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={`Convoyage — ${convoyage.adresse_depart || "?"} → ${convoyage.adresse_arrivee || "?"}`}
        description={`${convoyage.dossiers?.reference} — ${convoyage.dossiers?.clients?.prenom} ${convoyage.dossiers?.clients?.nom}`}
        actions={
          <>
            <Badge tone={convoyage.statut === "livre" ? "good" : "blue"}>
              {CONVOYAGE_STATUT_LABELS[convoyage.statut]}
            </Badge>
            <LinkButton href={`/api/convoyages/${convoyage.id}/pdf`} variant="outline">
              <FileDown className="h-4 w-4" /> Rapport PDF
            </LinkButton>
          </>
        }
      />

      <Card className="p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-ink-soft">Date</p>
            <p className="text-ink font-medium">
              {convoyage.date_convoyage ? formatDate(convoyage.date_convoyage) : "—"} {convoyage.heure ?? ""}
            </p>
          </div>
          <div>
            <p className="text-xs text-ink-soft">Conducteur</p>
            <p className="text-ink font-medium">{convoyage.conducteur || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-ink-soft">Kilométrage départ / arrivée</p>
            <p className="text-ink font-medium tnum">
              {convoyage.km_depart ?? "—"} / {convoyage.km_arrivee ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-ink-soft">Niveau de carburant</p>
            <p className="text-ink font-medium">{convoyage.niveau_carburant || "—"}</p>
          </div>
        </div>
        {convoyage.rapport_notes ? (
          <div>
            <p className="text-xs text-ink-soft mb-1">Rapport de livraison</p>
            <p className="text-sm text-ink whitespace-pre-line">{convoyage.rapport_notes}</p>
          </div>
        ) : null}
      </Card>

      {allPhotos.length > 0 ? (
        <Card className="p-6 mt-4">
          <h2 className="text-sm font-semibold text-ink mb-3">Photos avant / après</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {allPhotos.map((path) =>
              urls[path] ? (
                <a key={path} href={urls[path]} target="_blank" rel="noreferrer" className="block aspect-square relative rounded-md overflow-hidden border border-line">
                  <Image src={urls[path]} alt="" fill className="object-cover" unoptimized />
                </a>
              ) : null
            )}
          </div>
        </Card>
      ) : null}

      {convoyage.signature_client && urls[convoyage.signature_client] ? (
        <Card className="p-6 mt-4">
          <h2 className="text-sm font-semibold text-ink mb-3">Signature client</h2>
          <img src={urls[convoyage.signature_client]} alt="Signature" className="h-20" />
        </Card>
      ) : null}
    </div>
  );
}
