import Link from "next/link";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { listFactures, listClients } from "@/lib/queries";
import { Card, PageHeader, StatCard, EmptyState, Field, inputClass, Button } from "@/components/ui";
import { AutoResetForm } from "@/components/AutoResetForm";
import { formatDate } from "@/lib/format";
import { createFacture, deleteFacture } from "./actions";

function formatEUR(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export default async function FacturationPage() {
  const [factures, clients] = await Promise.all([listFactures(), listClients()]);

  const totalFacture = factures.reduce((sum, f) => sum + f.montant_total, 0);
  const totalFrais = factures.reduce((sum, f) => sum + f.montant_frais, 0);

  return (
    <div>
      <PageHeader
        title="Facturation"
        description="Journal des factures déjà émises par DIMZ (hors back-office) : de quoi les retrouver, pas encore de génération/envoi automatique."
      />

      <div className="grid grid-cols-2 gap-4 mb-6 max-w-md">
        <StatCard label="Total facturé" value={formatEUR(totalFacture)} />
        <StatCard label="Total frais" value={formatEUR(totalFrais)} />
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-4">
        <Card>
          {factures.length === 0 ? (
            <EmptyState
              title="Aucune facture enregistrée"
              description="Ajoute une facture déjà émise depuis le formulaire à droite."
            />
          ) : (
            <ul className="divide-y divide-line">
              {factures.map((f) => (
                <li key={f.id} className="flex items-start justify-between gap-3 px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink truncate">
                      {f.numero ? `Facture ${f.numero}` : "Facture sans numéro"}
                    </p>
                    <p className="text-xs text-ink-soft mt-0.5">
                      {f.clients ? `${f.clients.prenom ?? ""} ${f.clients.nom ?? ""}`.trim() : "Client non lié"}
                      {f.date_facture ? ` · ${formatDate(f.date_facture)}` : ""}
                    </p>
                    {f.notes ? <p className="text-xs text-ink-faint mt-1">{f.notes}</p> : null}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-ink tnum">{formatEUR(f.montant_total)}</p>
                    {f.montant_frais ? (
                      <p className="text-xs text-ink-faint tnum mt-0.5">Frais : {formatEUR(f.montant_frais)}</p>
                    ) : null}
                    <div className="flex items-center justify-end gap-1 mt-1.5">
                      <Link
                        href={`/facturation/${f.id}`}
                        className="p-1.5 rounded-md text-ink-faint hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        aria-label="Modifier"
                      >
                        <Pencil className="h-4 w-4" strokeWidth={1.8} />
                      </Link>
                      <form action={deleteFacture.bind(null, f.id)}>
                        <button
                          type="submit"
                          className="p-1.5 rounded-md text-ink-faint hover:text-bad hover:bg-bad-bg transition-colors"
                          aria-label="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" strokeWidth={1.8} />
                        </button>
                      </form>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5 h-fit">
          <h2 className="text-sm font-semibold text-ink mb-4">Ajouter une facture</h2>
          <AutoResetForm action={createFacture} className="space-y-3">
            <Field label="Client">
              <select name="client_id" defaultValue="" className={inputClass}>
                <option value="">—</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.prenom} {c.nom}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Numéro de facture">
              <input name="numero" className={inputClass} />
            </Field>
            <Field label="Date">
              <input name="date_facture" type="date" className={inputClass} />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Montant total (€)">
                <input name="montant_total" type="number" step="0.01" min="0" defaultValue="0" className={inputClass} />
              </Field>
              <Field label="Montant des frais (€)">
                <input name="montant_frais" type="number" step="0.01" min="0" defaultValue="0" className={inputClass} />
              </Field>
            </div>
            <Field label="Notes (optionnel)">
              <textarea name="notes" rows={2} className={inputClass} />
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
