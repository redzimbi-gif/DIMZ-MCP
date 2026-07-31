import { notFound } from "next/navigation";
import Image from "next/image";
import { FileDown } from "lucide-react";
import { getInspection } from "@/lib/queries";
import { getSignedUrls } from "@/lib/storage";
import { Card, PageHeader, LinkButton } from "@/components/ui";
import { formatDate } from "@/lib/format";

const SECTIONS: { key: string; label: string }[] = [
  { key: "etat_exterieur", label: "État extérieur" },
  { key: "etat_interieur", label: "État intérieur" },
  { key: "pneus", label: "Pneus" },
  { key: "freins", label: "Freins" },
  { key: "carrosserie", label: "Carrosserie" },
  { key: "mecanique", label: "Mécanique" },
  { key: "essai_routier", label: "Essai routier" },
  { key: "defauts_constates", label: "Défauts constatés" },
  { key: "commentaires", label: "Commentaires" },
];

export default async function InspectionDetailPage({
  params,
}: {
  params: { id: string; inspectionId: string };
}) {
  const inspection = await getInspection(params.inspectionId);
  if (!inspection || inspection.dossier_id !== params.id) notFound();

  const photoUrls = await getSignedUrls(inspection.photos);

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={`Inspection du ${formatDate(inspection.date_inspection)}`}
        description={`${inspection.dossiers?.reference} — ${inspection.dossiers?.clients?.prenom} ${inspection.dossiers?.clients?.nom}`}
        actions={
          <LinkButton href={`/api/inspections/${inspection.id}/pdf`} variant="outline">
            <FileDown className="h-4 w-4" /> Rapport PDF
          </LinkButton>
        }
      />

      {inspection.note_finale != null ? (
        <Card className="p-5 mb-4 flex items-center gap-3">
          <span className="text-3xl font-semibold text-blue-600 tnum">{inspection.note_finale}/10</span>
          <span className="text-sm text-ink-soft">Note finale attribuée par le copilote</span>
        </Card>
      ) : null}

      <Card className="p-6 space-y-5">
        {SECTIONS.map(({ key, label }) => {
          const value = (inspection as any)[key] as string | null;
          if (!value) return null;
          return (
            <div key={key}>
              <h2 className="text-xs font-semibold text-ink-soft uppercase tracking-wide mb-1">
                {label}
              </h2>
              <p className="text-sm text-ink whitespace-pre-line">{value}</p>
            </div>
          );
        })}
      </Card>

      {inspection.photos.length > 0 ? (
        <Card className="p-6 mt-4">
          <h2 className="text-sm font-semibold text-ink mb-3">Photos</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {inspection.photos.map((path) =>
              photoUrls[path] ? (
                <a key={path} href={photoUrls[path]} target="_blank" rel="noreferrer" className="block aspect-square relative rounded-md overflow-hidden border border-line">
                  <Image src={photoUrls[path]} alt="" fill className="object-cover" unoptimized />
                </a>
              ) : null
            )}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
