import { notFound } from "next/navigation";
import { getTestFeedback } from "@/lib/queries";
import { Card, PageHeader, Badge } from "@/components/ui";
import { formatDateTime, formatDuration } from "@/lib/format";
import { OFFRE_TEST_LABELS, RESSENTI_DUREE_LABELS } from "@/lib/types";

const RATING_ROWS: { key: string; label: string }[] = [
  { key: "note_design_general", label: "Design général" },
  { key: "note_professionnalisme", label: "Professionnalisme" },
  { key: "note_logo", label: "Logo" },
  { key: "note_couleurs", label: "Couleurs" },
  { key: "note_lisibilite", label: "Lisibilité" },
  { key: "note_modernite", label: "Modernité" },
];

const OUI_NON_ROWS: { key: string; label: string }[] = [
  { key: "comprehension_immediate", label: "Compréhension immédiate du concept" },
  { key: "offres_faciles", label: "Les 3 offres sont faciles à comprendre" },
  { key: "tarifs_clairs", label: "Les tarifs sont clairs" },
  { key: "navigation_facile", label: "Navigation facile" },
  { key: "prix_coherents", label: "Prix cohérents" },
  { key: "hesite_abandonner", label: "A hésité à abandonner le questionnaire" },
];

function groupDonneesBrutes(data: Record<string, unknown> | null) {
  if (!data) return [];
  const groups = new Map<string, { label: string; value: string }[]>();
  for (const [key, rawValue] of Object.entries(data)) {
    if (typeof rawValue !== "string" || !rawValue.trim()) continue;
    const separatorIndex = key.indexOf(" — ");
    const section = separatorIndex === -1 ? "Autres réponses" : key.slice(0, separatorIndex);
    const label = separatorIndex === -1 ? key : key.slice(separatorIndex + 3);
    if (!groups.has(section)) groups.set(section, []);
    groups.get(section)!.push({ label, value: rawValue });
  }
  return Array.from(groups.entries());
}

export default async function TestFeedbackDetailPage({ params }: { params: { id: string } }) {
  const feedback = await getTestFeedback(params.id);
  if (!feedback) notFound();

  const donneesGroups = groupDonneesBrutes(feedback.donnees_brutes);

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={feedback.reference}
        description={`Reçu le ${formatDateTime(feedback.created_at)}`}
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
        <Card className="p-5">
          <p className="text-xs text-ink-soft">Note globale</p>
          <p className="text-2xl font-semibold text-blue-600 tnum mt-1">
            {feedback.note_globale != null ? `${feedback.note_globale}/10` : "—"}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-ink-soft">Note de l'expérience du questionnaire</p>
          <p className="text-2xl font-semibold text-ink tnum mt-1">
            {feedback.note_experience_formulaire != null ? `${feedback.note_experience_formulaire}/10` : "—"}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-ink-soft">Temps de remplissage mesuré</p>
          <p className="text-2xl font-semibold text-ink tnum mt-1">{formatDuration(feedback.duree_secondes)}</p>
          {feedback.duree_declaree ? (
            <p className="text-xs text-ink-faint mt-1">Estimation du participant : {feedback.duree_declaree}</p>
          ) : null}
        </Card>
      </div>

      <Card className="p-6 mb-4">
        <h2 className="text-sm font-semibold text-ink mb-4">Design et identité visuelle</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {RATING_ROWS.map(({ key, label }) => {
            const value = (feedback as any)[key] as number | null;
            if (value == null) return null;
            return (
              <div key={key}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-ink-soft">{label}</span>
                  <span className="font-semibold text-ink tnum">{value}/5</span>
                </div>
                <div className="h-1.5 rounded-full bg-surface-sunken overflow-hidden">
                  <div className="h-full rounded-full bg-blue-500" style={{ width: `${(value / 5) * 100}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-6 mb-4">
        <h2 className="text-sm font-semibold text-ink mb-4">Réponses clés</h2>
        <dl className="divide-y divide-line border-t border-line text-sm">
          {OUI_NON_ROWS.map(({ key, label }) => {
            const value = (feedback as any)[key] as string | null;
            if (!value) return null;
            return (
              <div key={key} className="flex items-center justify-between gap-4 py-2.5">
                <dt className="text-ink-soft">{label}</dt>
                <dd>
                  <Badge tone={value === "oui" ? "good" : value === "non" ? "bad" : "neutral"}>{value}</Badge>
                </dd>
              </div>
            );
          })}
          {feedback.confiance_site != null ? (
            <div className="flex items-center justify-between gap-4 py-2.5">
              <dt className="text-ink-soft">Confiance inspirée par le site</dt>
              <dd className="font-medium text-ink tnum">{feedback.confiance_site}/5</dd>
            </div>
          ) : null}
          {feedback.ressenti_duree ? (
            <div className="flex items-center justify-between gap-4 py-2.5">
              <dt className="text-ink-soft">Ressenti sur la longueur du questionnaire</dt>
              <dd className="font-medium text-ink">{RESSENTI_DUREE_LABELS[feedback.ressenti_duree] ?? feedback.ressenti_duree}</dd>
            </div>
          ) : null}
          {feedback.offre_choisie ? (
            <div className="flex items-center justify-between gap-4 py-2.5">
              <dt className="text-ink-soft">Offre choisie</dt>
              <dd className="font-medium text-ink">{OFFRE_TEST_LABELS[feedback.offre_choisie] ?? feedback.offre_choisie}</dd>
            </div>
          ) : null}
          {feedback.meilleur_rapport_qualite_prix ? (
            <div className="flex items-center justify-between gap-4 py-2.5">
              <dt className="text-ink-soft">Meilleur rapport valeur/prix</dt>
              <dd className="font-medium text-ink">
                {OFFRE_TEST_LABELS[feedback.meilleur_rapport_qualite_prix] ?? feedback.meilleur_rapport_qualite_prix}
              </dd>
            </div>
          ) : null}
          {feedback.utiliserait_dimz ? (
            <div className="flex items-center justify-between gap-4 py-2.5">
              <dt className="text-ink-soft">Utiliserait DIMZ</dt>
              <dd>
                <Badge tone={feedback.utiliserait_dimz === "oui" ? "good" : feedback.utiliserait_dimz === "non" ? "bad" : "neutral"}>
                  {feedback.utiliserait_dimz}
                </Badge>
              </dd>
            </div>
          ) : null}
          {feedback.recommanderait_dimz ? (
            <div className="flex items-center justify-between gap-4 py-2.5">
              <dt className="text-ink-soft">Recommanderait DIMZ</dt>
              <dd>
                <Badge tone={feedback.recommanderait_dimz === "oui" ? "good" : feedback.recommanderait_dimz === "non" ? "bad" : "neutral"}>
                  {feedback.recommanderait_dimz}
                </Badge>
              </dd>
            </div>
          ) : null}
        </dl>
      </Card>

      {donneesGroups.length > 0 ? (
        <Card className="p-6 max-w-2xl">
          <h2 className="text-sm font-semibold text-ink mb-1">Toutes les réponses</h2>
          <p className="text-xs text-ink-soft mb-4">Réponses libres et choix détaillés, tels que remplis par le participant.</p>
          <div className="space-y-5">
            {donneesGroups.map(([section, rows]) => (
              <div key={section}>
                <h3 className="text-xs font-semibold text-ink-soft uppercase tracking-wide mb-2">{section}</h3>
                <dl className="divide-y divide-line border-t border-line">
                  {rows.map((row) => (
                    <div key={row.label} className="flex items-start justify-between gap-4 py-2 text-sm">
                      <dt className="text-ink-soft shrink-0">{row.label}</dt>
                      <dd className="text-ink text-right">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
