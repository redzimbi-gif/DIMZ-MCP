import Link from "next/link";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { Plus, Pencil, Trash2, Calculator, Paperclip } from "lucide-react";
import { listConvoyagesExternes } from "@/lib/queries";
import { Card, PageHeader, StatCard, EmptyState, Field, inputClass, Button } from "@/components/ui";
import { AutoResetForm } from "@/components/AutoResetForm";
import { formatDate } from "@/lib/format";
import { createConvoyageExterne, deleteConvoyageExterne } from "./actions";

// Taux de cotisations URSSAF (auto-entrepreneur, prestations de services) :
// la part due se calcule en prenant ce pourcentage du gain de prestation.
const URSSAF_TAUX = 0.21;

function formatEUR(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export default async function ComptabilitePage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string };
}) {
  const { from, to } = searchParams;
  const convoyages = await listConvoyagesExternes(from, to);

  const rows = convoyages.map((c) => ({
    ...c,
    gain: c.total_prestation - c.frais,
  }));

  const totalPrestation = rows.reduce((sum, c) => sum + c.total_prestation, 0);
  const totalFrais = rows.reduce((sum, c) => sum + c.frais, 0);
  const totalGain = rows.reduce((sum, c) => sum + c.gain, 0);
  const totalUrssaf = totalGain * URSSAF_TAUX;

  const today = new Date();
  const thisMonth = { from: format(startOfMonth(today), "yyyy-MM-dd"), to: format(endOfMonth(today), "yyyy-MM-dd") };
  const lastMonthDate = subMonths(today, 1);
  const lastMonth = { from: format(startOfMonth(lastMonthDate), "yyyy-MM-dd"), to: format(endOfMonth(lastMonthDate), "yyyy-MM-dd") };
  const isActive = (preset: { from: string; to: string }) => from === preset.from && to === preset.to;

  return (
    <div>
      <PageHeader
        title="Comptabilité"
        description="Convoyages réalisés en dehors de la plateforme DIMZ : chiffre d'affaires, frais et part due à l'URSSAF."
      />

      <Card className="p-4 mb-6">
        <form className="flex flex-wrap items-end gap-3" method="GET">
          <Field label="Du">
            <input type="date" name="from" defaultValue={from ?? ""} className={inputClass} />
          </Field>
          <Field label="Au">
            <input type="date" name="to" defaultValue={to ?? ""} className={inputClass} />
          </Field>
          <Button type="submit" variant="outline">
            Filtrer
          </Button>
          <div className="flex-1 min-w-[8px]" />
          <div className="flex items-center gap-1.5 flex-wrap">
            <Link
              href="/comptabilite"
              className={`text-xs font-medium rounded-full px-3 py-1.5 ${!from && !to ? "bg-blue-50 text-blue-700" : "text-ink-soft hover:bg-surface-sunken"}`}
            >
              Tout
            </Link>
            <Link
              href={`/comptabilite?from=${thisMonth.from}&to=${thisMonth.to}`}
              className={`text-xs font-medium rounded-full px-3 py-1.5 ${isActive(thisMonth) ? "bg-blue-50 text-blue-700" : "text-ink-soft hover:bg-surface-sunken"}`}
            >
              Ce mois-ci
            </Link>
            <Link
              href={`/comptabilite?from=${lastMonth.from}&to=${lastMonth.to}`}
              className={`text-xs font-medium rounded-full px-3 py-1.5 ${isActive(lastMonth) ? "bg-blue-50 text-blue-700" : "text-ink-soft hover:bg-surface-sunken"}`}
            >
              Mois dernier
            </Link>
          </div>
        </form>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total prestations" value={formatEUR(totalPrestation)} />
        <StatCard label="Total frais" value={formatEUR(totalFrais)} />
        <StatCard label="Total gain prestation" value={formatEUR(totalGain)} />
        <StatCard
          label="Part due à l'URSSAF"
          value={formatEUR(totalUrssaf)}
          icon={<Calculator className="h-4 w-4" strokeWidth={1.8} />}
        />
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-4">
        <Card>
          {rows.length === 0 ? (
            <EmptyState
              title="Aucun convoyage sur cette période"
              description="Ajoute un convoyage réalisé hors DIMZ depuis le formulaire à droite, ou change la période."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs font-medium text-ink-soft uppercase tracking-wide">
                    <th className="px-5 py-3 font-medium">Date</th>
                    <th className="px-5 py-3 font-medium">Trajet</th>
                    <th className="px-5 py-3 font-medium text-right">Total</th>
                    <th className="px-5 py-3 font-medium text-right">Frais</th>
                    <th className="px-5 py-3 font-medium text-right">Gain</th>
                    <th className="px-5 py-3 font-medium text-right">URSSAF</th>
                    <th className="px-5 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map((c) => (
                    <tr key={c.id}>
                      <td className="px-5 py-3.5 text-ink-soft whitespace-nowrap">
                        {c.date_convoyage ? formatDate(c.date_convoyage) : "—"}
                      </td>
                      <td className="px-5 py-3.5 text-ink">
                        {c.lieu_depart || "—"} <span className="text-ink-faint">→</span>{" "}
                        {c.lieu_arrivee || "—"}
                        {c.notes ? (
                          <p className="text-xs text-ink-faint mt-0.5">{c.notes}</p>
                        ) : null}
                        {c.justificatifs?.length > 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs text-ink-faint mt-0.5">
                            <Paperclip className="h-3 w-3" /> {c.justificatifs.length} justificatif{c.justificatifs.length > 1 ? "s" : ""}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-5 py-3.5 text-right tnum text-ink">{formatEUR(c.total_prestation)}</td>
                      <td className="px-5 py-3.5 text-right tnum text-ink-soft">{formatEUR(c.frais)}</td>
                      <td className="px-5 py-3.5 text-right tnum font-medium text-blue-600">{formatEUR(c.gain)}</td>
                      <td className="px-5 py-3.5 text-right tnum text-ink-soft">
                        {formatEUR(c.gain * URSSAF_TAUX)}
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <Link
                          href={`/comptabilite/${c.id}`}
                          className="inline-flex p-1.5 rounded-md text-ink-faint hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          aria-label="Modifier"
                        >
                          <Pencil className="h-4 w-4" strokeWidth={1.8} />
                        </Link>
                        <form action={deleteConvoyageExterne.bind(null, c.id)} className="inline">
                          <button
                            type="submit"
                            className="p-1.5 rounded-md text-ink-faint hover:text-bad hover:bg-bad-bg transition-colors"
                            aria-label="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" strokeWidth={1.8} />
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-line font-medium">
                    <td className="px-5 py-3.5" colSpan={2}>
                      Total
                    </td>
                    <td className="px-5 py-3.5 text-right tnum text-ink">{formatEUR(totalPrestation)}</td>
                    <td className="px-5 py-3.5 text-right tnum text-ink-soft">{formatEUR(totalFrais)}</td>
                    <td className="px-5 py-3.5 text-right tnum text-blue-600">{formatEUR(totalGain)}</td>
                    <td className="px-5 py-3.5 text-right tnum text-ink-soft">{formatEUR(totalUrssaf)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </Card>

        <Card className="p-5 h-fit">
          <h2 className="text-sm font-semibold text-ink mb-4">Ajouter un convoyage</h2>
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
