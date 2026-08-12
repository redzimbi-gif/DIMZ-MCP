import Link from "next/link";
import { Plus } from "lucide-react";
import { listAllConvoyages, listConvoyagesExternes } from "@/lib/queries";
import { Card, PageHeader, EmptyState, Badge, Field, inputClass, Button } from "@/components/ui";
import { AutoResetForm } from "@/components/AutoResetForm";
import { CONVOYAGE_STATUT_LABELS } from "@/lib/types";
import { formatDate, formatCurrency } from "@/lib/format";
import { createConvoyageExterne } from "../comptabilite/actions";

export default async function ConvoyagesPage() {
  const [convoyages, externes] = await Promise.all([listAllConvoyages(), listConvoyagesExternes()]);

  return (
    <div>
      <PageHeader
        title="Convoyages"
        description="Tous les convoyages, réalisés via un dossier DIMZ ou hors plateforme."
      />

      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        <div className="space-y-6">
          <div>
            <h2 className="text-sm font-semibold text-ink mb-3">Convoyages DIMZ</h2>
            <Card>
              {convoyages.length === 0 ? (
                <EmptyState
                  title="Aucun convoyage"
                  description="Les convoyages se créent depuis l'onglet Convoyage d'un dossier."
                />
              ) : (
                <ul className="divide-y divide-line">
                  {convoyages.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/dossiers/${c.dossier_id}/convoyages/${c.id}`}
                        className="flex items-center justify-between px-5 py-3.5 hover:bg-surface-sunken transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-ink truncate">
                            {c.adresse_depart || "—"} <span className="text-ink-faint">→</span>{" "}
                            {c.adresse_arrivee || "—"}
                          </p>
                          <p className="text-xs text-ink-soft mt-0.5">
                            {c.dossiers?.reference}
                            {c.dossiers?.clients ? ` · ${c.dossiers.clients.prenom ?? ""} ${c.dossiers.clients.nom ?? ""}` : ""}
                            {c.date_convoyage ? ` · ${formatDate(c.date_convoyage)}` : ""}
                          </p>
                        </div>
                        <Badge tone={c.statut === "livre" ? "good" : c.statut === "annule" ? "bad" : "blue"}>
                          {CONVOYAGE_STATUT_LABELS[c.statut]}
                        </Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-ink mb-3">Convoyages hors plateforme</h2>
            <Card>
              {externes.length === 0 ? (
                <EmptyState
                  title="Aucun convoyage hors plateforme"
                  description="Ajoute un convoyage réalisé en dehors de DIMZ depuis le formulaire à droite."
                />
              ) : (
                <ul className="divide-y divide-line">
                  {externes.map((c) => (
                    <li key={c.id} className="flex items-center justify-between px-5 py-3.5">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink truncate">
                          {c.lieu_depart || "—"} <span className="text-ink-faint">→</span> {c.lieu_arrivee || "—"}
                        </p>
                        <p className="text-xs text-ink-soft mt-0.5">
                          {c.date_convoyage ? formatDate(c.date_convoyage) : "Date non renseignée"}
                        </p>
                      </div>
                      <p className="text-sm font-medium text-ink tnum shrink-0 ml-3">
                        {formatCurrency(c.total_prestation)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <p className="text-xs text-ink-faint mt-2">
              Détail financier (frais, gain, part URSSAF) dans{" "}
              <Link href="/comptabilite" className="text-blue-600 hover:underline">
                Comptabilité
              </Link>
              .
            </p>
          </div>
        </div>

        <Card className="p-5 h-fit">
          <h2 className="text-sm font-semibold text-ink mb-4">Ajouter un convoyage hors plateforme</h2>
          <AutoResetForm action={createConvoyageExterne} className="space-y-3" encType="multipart/form-data">
            <Field label="Date">
              <input name="date_convoyage" type="date" className={inputClass} />
            </Field>
            <Field label="Lieu de départ">
              <input name="lieu_depart" className={inputClass} />
            </Field>
            <Field label="Lieu d'arrivée">
              <input name="lieu_arrivee" className={inputClass} />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Total prestation (€)">
                <input name="total_prestation" type="number" step="0.01" min="0" defaultValue="0" className={inputClass} />
              </Field>
              <Field label="Frais (€)">
                <input name="frais" type="number" step="0.01" min="0" defaultValue="0" className={inputClass} />
              </Field>
            </div>
            <Field label="Notes (optionnel)">
              <textarea name="notes" rows={2} className={inputClass} />
            </Field>
            <Field label="Justificatifs (photos, factures)">
              <input name="justificatifs" type="file" accept="image/*,application/pdf" multiple className={inputClass} />
            </Field>
            <Button type="submit" className="w-full">
              <Plus className="h-4 w-4" /> Ajouter
            </Button>
          </AutoResetForm>
        </Card>
      </div>
    </div>
  );
}
