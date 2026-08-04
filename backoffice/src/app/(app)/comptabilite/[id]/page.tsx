import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getConvoyageExterne } from "@/lib/queries";
import { Card, PageHeader, Field, inputClass, Button, LinkButton } from "@/components/ui";
import { updateConvoyageExterne } from "../actions";

export default async function EditConvoyageExternePage({ params }: { params: { id: string } }) {
  const convoyage = await getConvoyageExterne(params.id);
  if (!convoyage) notFound();

  const action = updateConvoyageExterne.bind(null, convoyage.id);
  const gain = convoyage.total_prestation - convoyage.frais;

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
        <form action={action} className="space-y-3">
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
          <Button type="submit" className="w-full">
            Enregistrer les modifications
          </Button>
        </form>
      </Card>
    </div>
  );
}
