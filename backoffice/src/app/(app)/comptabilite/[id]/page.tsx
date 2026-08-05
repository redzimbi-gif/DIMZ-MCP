import { notFound } from "next/navigation";
import { ArrowLeft, Download, X, Paperclip } from "lucide-react";
import { getConvoyageExterne } from "@/lib/queries";
import { getSignedUrls } from "@/lib/storage";
import { Card, PageHeader, Field, inputClass, Button, LinkButton } from "@/components/ui";
import { updateConvoyageExterne, deleteJustificatif } from "../actions";

export default async function EditConvoyageExternePage({ params }: { params: { id: string } }) {
  const convoyage = await getConvoyageExterne(params.id);
  if (!convoyage) notFound();

  const action = updateConvoyageExterne.bind(null, convoyage.id);
  const gain = convoyage.total_prestation - convoyage.frais;
  const urls = await getSignedUrls(convoyage.justificatifs ?? []);

  return (
    <div className="max-w-lg">
      <PageHeader
        title="Modifier le convoyage"
        description={`${convoyage.lieu_depart ?? "?"} → ${convoyage.lieu_arrivee ?? "?"}`}
        actions={
          <LinkButton href="/comptabilite" variant="outline">
            <ArrowLeft className="h-4 w-4" /> Retour
          </LinkButton>
        }
      />
      <Card className="p-6">
        <form action={action} className="space-y-3" encType="multipart/form-data">
          <Field label="Date">
            <input name="date_convoyage" type="date" defaultValue={convoyage.date_convoyage ?? ""} className={inputClass} />
          </Field>
          <Field label="Lieu de départ">
            <input name="lieu_depart" defaultValue={convoyage.lieu_depart ?? ""} className={inputClass} />
          </Field>
          <Field label="Lieu d'arrivée">
            <input name="lieu_arrivee" defaultValue={convoyage.lieu_arrivee ?? ""} className={inputClass} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Total prestation (€)">
              <input
                name="total_prestation"
                type="number"
                step="0.01"
                min="0"
                defaultValue={convoyage.total_prestation}
                className={inputClass}
              />
            </Field>
            <Field label="Frais (€)">
              <input
                name="frais"
                type="number"
                step="0.01"
                min="0"
                defaultValue={convoyage.frais}
                className={inputClass}
              />
            </Field>
          </div>
          <p className="text-xs text-ink-soft">
            Gain de prestation actuel : <span className="tnum font-semibold text-ink">{gain.toFixed(2)} €</span>
          </p>
          <Field label="Notes (optionnel)">
            <textarea name="notes" rows={2} defaultValue={convoyage.notes ?? ""} className={inputClass} />
          </Field>
          <Field label="Ajouter des justificatifs (photos, factures)">
            <input name="justificatifs" type="file" accept="image/*,application/pdf" multiple className={inputClass} />
          </Field>
          <Button type="submit" className="w-full">
            Enregistrer les modifications
          </Button>
        </form>

        {convoyage.justificatifs?.length > 0 ? (
          <div className="mt-5 pt-4 border-t border-line">
            <h3 className="text-xs font-semibold text-ink-soft uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Paperclip className="h-3.5 w-3.5" /> Justificatifs joints
            </h3>
            <ul className="space-y-1.5">
              {convoyage.justificatifs.map((path) => {
                const fileName = path.split("/").pop() ?? path;
                return (
                  <li key={path} className="flex items-center justify-between gap-2 text-sm">
                    {urls[path] ? (
                      <a
                        href={urls[path]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-blue-600 hover:underline truncate"
                      >
                        <Download className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{fileName}</span>
                      </a>
                    ) : (
                      <span className="text-ink-soft truncate">{fileName}</span>
                    )}
                    <form action={deleteJustificatif.bind(null, convoyage.id, path)}>
                      <button
                        type="submit"
                        className="p-1 rounded text-ink-faint hover:text-bad hover:bg-bad-bg transition-colors"
                        aria-label="Supprimer ce justificatif"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </form>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
