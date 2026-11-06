import { notFound } from "next/navigation";
import Image from "next/image";
import { FileDown, Mail, Pencil } from "lucide-react";
import { getInspection } from "@/lib/queries";
import { getSignedUrls } from "@/lib/storage";
import { Card, PageHeader, LinkButton, Button, Badge } from "@/components/ui";
import { EmailStatusBanner } from "@/components/EmailStatusBanner";
import { formatDate, splitLines, splitTags } from "@/lib/format";
import { INSPECTION_VERDICT_LABELS } from "@/lib/types";
import { sendInspectionReportEmail } from "./actions";

const TECHNICAL_SECTIONS: { key: string; label: string }[] = [
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

const CATEGORY_SCORES: { key: string; label: string }[] = [
  { key: "score_administratif", label: "Contrôle administratif" },
  { key: "score_exterieur", label: "Inspection extérieure" },
  { key: "score_interieur", label: "Inspection intérieure" },
  { key: "score_mecanique", label: "Contrôle mécanique" },
  { key: "score_essai_routier", label: "Essai routier" },
  { key: "score_marche", label: "Analyse du marché" },
];

const VERDICT_TONES: Record<string, "good" | "warn" | "bad"> = {
  recommande: "good",
  envisageable: "warn",
  deconseille: "bad",
};

export default async function InspectionDetailPage({
  params,
  searchParams,
}: {
  params: { id: string; inspectionId: string };
  searchParams: { email?: string };
}) {
  const inspection = await getInspection(params.inspectionId);
  if (!inspection || inspection.dossier_id !== params.id) notFound();

  const photoUrls = await getSignedUrls(inspection.photos);
  const sendReportAction = sendInspectionReportEmail.bind(null, params.id, inspection.id);

  const tags = splitTags(inspection.tags);
  const pointsPositifs = splitLines(inspection.points_positifs);
  const pointsVigilance = splitLines(inspection.points_vigilance);
  const categoryScores = CATEGORY_SCORES.filter(({ key }) => (inspection as any)[key] != null);

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={inspection.vehicule_titre || `Inspection du ${formatDate(inspection.date_inspection)}`}
        description={`${inspection.reference} · ${inspection.dossiers?.reference} — ${inspection.dossiers?.clients?.prenom} ${inspection.dossiers?.clients?.nom}`}
        actions={
          <>
            <LinkButton href={`/dossiers/${params.id}/inspections/${inspection.id}/edit`} variant="outline">
              <Pencil className="h-4 w-4" /> Modifier
            </LinkButton>
            <LinkButton href={`/api/inspections/${inspection.id}/pdf`} variant="outline">
              <FileDown className="h-4 w-4" /> Rapport PDF
            </LinkButton>
            <form action={sendReportAction}>
              <Button type="submit" variant="outline">
                <Mail className="h-4 w-4" /> Envoyer au client
              </Button>
            </form>
          </>
        }
      />

      <EmailStatusBanner status={searchParams.email} />

      <Card className="p-6 mb-4">
        <div className="flex flex-wrap items-center gap-4">
          {inspection.note_finale != null ? (
            <div className="flex items-center gap-3">
              <span className="text-3xl font-semibold text-blue-600 tnum">{inspection.note_finale}/10</span>
              <span className="text-sm text-ink-soft">Score DIMZ global</span>
            </div>
          ) : null}
          {inspection.verdict ? (
            <Badge tone={VERDICT_TONES[inspection.verdict]}>{INSPECTION_VERDICT_LABELS[inspection.verdict]}</Badge>
          ) : null}
        </div>
        {inspection.annonce_comparee ? (
          <p className="text-sm text-ink-soft mt-2">{inspection.annonce_comparee}</p>
        ) : null}
        {tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {tags.map((tag) => (
              <Badge key={tag} tone="blue">
                {tag}
              </Badge>
            ))}
          </div>
        ) : null}
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-xs">
          <div>
            <dt className="text-ink-faint">Date</dt>
            <dd className="text-ink font-medium">{formatDate(inspection.date_inspection)}</dd>
          </div>
          {inspection.lieu ? (
            <div>
              <dt className="text-ink-faint">Lieu</dt>
              <dd className="text-ink font-medium">{inspection.lieu}</dd>
            </div>
          ) : null}
          {inspection.expert_nom ? (
            <div>
              <dt className="text-ink-faint">Expert</dt>
              <dd className="text-ink font-medium">{inspection.expert_nom}</dd>
            </div>
          ) : null}
          {inspection.duree_sur_site ? (
            <div>
              <dt className="text-ink-faint">Durée sur site</dt>
              <dd className="text-ink font-medium">{inspection.duree_sur_site}</dd>
            </div>
          ) : null}
        </dl>
      </Card>

      {categoryScores.length > 0 ? (
        <Card className="p-6 mb-4">
          <h2 className="text-sm font-semibold text-ink mb-4">Score par étape du contrôle</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {categoryScores.map(({ key, label }) => {
              const value = (inspection as any)[key] as number;
              return (
                <div key={key}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-ink-soft">{label}</span>
                    <span className="font-semibold text-ink tnum">{value}/10</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-surface-sunken overflow-hidden">
                    <div className="h-full rounded-full bg-blue-500" style={{ width: `${(value / 10) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ) : null}

      {pointsPositifs.length > 0 || pointsVigilance.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          {pointsPositifs.length > 0 ? (
            <Card className="p-6">
              <h2 className="text-sm font-semibold text-good mb-3">Points positifs</h2>
              <ul className="space-y-2 text-sm text-ink">
                {pointsPositifs.map((point, i) => (
                  <li key={i}>+ {point}</li>
                ))}
              </ul>
            </Card>
          ) : null}
          {pointsVigilance.length > 0 ? (
            <Card className="p-6">
              <h2 className="text-sm font-semibold text-warn mb-3">Points de vigilance</h2>
              <ul className="space-y-2 text-sm text-ink">
                {pointsVigilance.map((point, i) => (
                  <li key={i}>! {point}</li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>
      ) : null}

      {inspection.avis_copilote ? (
        <Card className="p-6 mb-4">
          <p className="text-sm text-ink italic whitespace-pre-line">« {inspection.avis_copilote} »</p>
          <p className="text-xs text-ink-faint mt-2">L'avis du copilote</p>
        </Card>
      ) : null}

      {inspection.recommandation_finale ? (
        <Card className="p-6 mb-4">
          <h2 className="text-sm font-semibold text-ink mb-2">Recommandation finale</h2>
          <p className="text-sm text-ink whitespace-pre-line">{inspection.recommandation_finale}</p>
        </Card>
      ) : null}

      {inspection.photos.length > 0 ? (
        <Card className="p-6 mb-4">
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

      <details>
        <summary className="cursor-pointer text-sm font-medium text-ink-soft select-none mb-2">
          Notes techniques internes
        </summary>
        <Card className="p-6 space-y-5 mt-3">
          {TECHNICAL_SECTIONS.map(({ key, label }) => {
            const value = (inspection as any)[key] as string | null;
            if (!value) return null;
            return (
              <div key={key}>
                <h2 className="text-xs font-semibold text-ink-soft uppercase tracking-wide mb-1">{label}</h2>
                <p className="text-sm text-ink whitespace-pre-line">{value}</p>
              </div>
            );
          })}
        </Card>
      </details>
    </div>
  );
}
