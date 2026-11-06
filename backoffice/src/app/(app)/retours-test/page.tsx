import Link from "next/link";
import { ClipboardCheck } from "lucide-react";
import { listTestFeedback } from "@/lib/queries";
import { Card, PageHeader, StatCard, EmptyState, Badge } from "@/components/ui";
import { formatDateTime, formatDuration } from "@/lib/format";
import { OFFRE_TEST_LABELS } from "@/lib/types";

export default async function RetoursTestPage() {
  const feedback = await listTestFeedback();

  const count = feedback.length;
  const notesGlobales = feedback.map((f) => f.note_globale).filter((n): n is number => n != null);
  const moyenneGlobale = notesGlobales.length
    ? (notesGlobales.reduce((a, b) => a + b, 0) / notesGlobales.length).toFixed(1)
    : "—";
  const durees = feedback.map((f) => f.duree_secondes).filter((n): n is number => n != null);
  const dureeMoyenne = durees.length ? Math.round(durees.reduce((a, b) => a + b, 0) / durees.length) : null;
  const recommanderaient = feedback.filter((f) => f.recommanderait_dimz === "oui").length;

  return (
    <div>
      <PageHeader
        title="Retours test"
        description="Réponses au questionnaire de test utilisateur soumis depuis le site vitrine."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Réponses reçues" value={count} icon={<ClipboardCheck className="h-4 w-4" strokeWidth={1.8} />} />
        <StatCard label="Note globale moyenne" value={moyenneGlobale === "—" ? "—" : `${moyenneGlobale}/10`} />
        <StatCard label="Temps de remplissage moyen" value={formatDuration(dureeMoyenne)} hint="Mesuré automatiquement, hors découverte du site" />
        <StatCard label="Recommanderaient DIMZ" value={count ? `${recommanderaient}/${count}` : "—"} />
      </div>

      <Card>
        {feedback.length === 0 ? (
          <EmptyState
            title="Aucun retour pour le moment"
            description="Les réponses au questionnaire de test apparaîtront ici automatiquement."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs font-medium text-ink-soft uppercase tracking-wide">
                  <th className="px-5 py-3 font-medium">Référence</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Offre choisie</th>
                  <th className="px-5 py-3 font-medium text-right">Note globale</th>
                  <th className="px-5 py-3 font-medium text-right">Temps mesuré</th>
                  <th className="px-5 py-3 font-medium">Recommanderait</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {feedback.map((f) => (
                  <tr key={f.id} className="hover:bg-surface-sunken transition-colors">
                    <td className="px-5 py-3.5">
                      <Link href={`/retours-test/${f.id}`} className="font-medium text-blue-600 hover:underline">
                        {f.reference}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-ink-soft whitespace-nowrap">{formatDateTime(f.created_at)}</td>
                    <td className="px-5 py-3.5 text-ink">
                      {f.offre_choisie ? OFFRE_TEST_LABELS[f.offre_choisie] ?? f.offre_choisie : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-right tnum font-medium text-ink">
                      {f.note_globale != null ? `${f.note_globale}/10` : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-right tnum text-ink-soft">{formatDuration(f.duree_secondes)}</td>
                    <td className="px-5 py-3.5">
                      {f.recommanderait_dimz ? (
                        <Badge tone={f.recommanderait_dimz === "oui" ? "good" : f.recommanderait_dimz === "non" ? "bad" : "neutral"}>
                          {f.recommanderait_dimz}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
