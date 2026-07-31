import Link from "next/link";
import { listClients } from "@/lib/queries";
import { PageHeader, Card, Field, inputClass, Button } from "@/components/ui";
import { DOSSIER_OFFRES, DOSSIER_OFFRE_LABELS } from "@/lib/types";
import { createDossier } from "../actions";

export default async function NewDossierPage() {
  const clients = await listClients();

  return (
    <div className="max-w-2xl">
      <PageHeader title="Nouveau dossier" />
      <Card className="p-6">
        <form action={createDossier} className="space-y-4">
          <Field label="Client">
            <select name="client_id" required className={inputClass}>
              <option value="">Sélectionner un client…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.prenom} {c.nom} {c.email ? `— ${c.email}` : ""}
                </option>
              ))}
            </select>
            <p className="text-xs text-ink-faint mt-1">
              Client absent ?{" "}
              <Link href="/clients/new" className="text-blue-600 hover:underline">
                Créer une fiche client
              </Link>
            </p>
          </Field>

          <Field label="Offre">
            <select name="offre" className={inputClass}>
              <option value="">—</option>
              {DOSSIER_OFFRES.map((o) => (
                <option key={o} value={o}>
                  {DOSSIER_OFFRE_LABELS[o]}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Budget">
              <input name="budget" className={inputClass} />
            </Field>
            <Field label="Région">
              <input name="region" className={inputClass} />
            </Field>
          </div>

          <Field label="Véhicule recherché">
            <input name="vehicule_recherche" className={inputClass} />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Marques souhaitées">
              <input name="marques_souhaitees" className={inputClass} />
            </Field>
            <Field label="Motorisation">
              <input name="motorisation" className={inputClass} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Boîte de vitesses">
              <input name="boite_vitesses" className={inputClass} />
            </Field>
            <Field label="Kilométrage maximum">
              <input name="km_max" className={inputClass} />
            </Field>
          </div>

          <Field label="Commentaires">
            <textarea name="commentaires" rows={3} className={inputClass} />
          </Field>

          <Button type="submit">Créer le dossier</Button>
        </form>
      </Card>
    </div>
  );
}
