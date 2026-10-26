import { createClient } from "@/lib/supabase/server";
import { getEntrepriseInfo } from "@/lib/queries";
import { Card, PageHeader, Button, Field, inputClass } from "@/components/ui";
import { logout } from "@/app/login/actions";
import { updateEntrepriseInfo } from "./actions";

export default async function ParametresPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const entreprise = await getEntrepriseInfo();

  return (
    <div>
      <PageHeader title="Paramètres" description="Réglages du compte et du back-office." />

      <Card className="p-6 max-w-lg">
        <h2 className="text-sm font-semibold text-ink mb-4">Compte</h2>
        <div className="flex items-center justify-between gap-3 py-3 border-t border-line">
          <div>
            <p className="text-sm text-ink">{user?.email ?? "—"}</p>
            <p className="text-xs text-ink-soft mt-0.5">Connecté·e à ce compte</p>
          </div>
          <form action={logout}>
            <Button type="submit" variant="outline">
              Se déconnecter
            </Button>
          </form>
        </div>
      </Card>

      <Card className="p-6 max-w-lg mt-4">
        <h2 className="text-sm font-semibold text-ink mb-1">Informations de l'entreprise</h2>
        <p className="text-xs text-ink-soft mb-4">
          Utilisées automatiquement dans les CGV et contrats générés depuis l'onglet « Documents & contrats »
          de chaque dossier.
        </p>
        <form action={updateEntrepriseInfo} className="space-y-3">
          <Field label="Nom / prénom du dirigeant">
            <input name="nom_dirigeant" defaultValue={entreprise?.nom_dirigeant ?? ""} className={inputClass} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="SIRET">
              <input name="siret" defaultValue={entreprise?.siret ?? ""} className={inputClass} />
            </Field>
            <Field label="Ville (pour « Fait à … »)">
              <input name="ville" defaultValue={entreprise?.ville ?? "Lyon"} className={inputClass} />
            </Field>
          </div>
          <Field label="Adresse professionnelle">
            <input name="adresse" defaultValue={entreprise?.adresse ?? ""} className={inputClass} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="E-mail">
              <input name="email" type="email" defaultValue={entreprise?.email ?? ""} className={inputClass} />
            </Field>
            <Field label="Téléphone">
              <input name="telephone" defaultValue={entreprise?.telephone ?? ""} className={inputClass} />
            </Field>
          </div>
          <div className="pt-2 border-t border-line">
            <p className="text-xs font-semibold text-ink-soft uppercase tracking-wide mb-3">
              Médiateur de la consommation (CGV, §14)
            </p>
            <div className="space-y-3">
              <Field label="Nom du médiateur">
                <input
                  name="mediateur_nom"
                  defaultValue={entreprise?.mediateur_nom ?? ""}
                  className={inputClass}
                />
              </Field>
              <Field label="Adresse">
                <input
                  name="mediateur_adresse"
                  defaultValue={entreprise?.mediateur_adresse ?? ""}
                  className={inputClass}
                />
              </Field>
              <Field label="Site internet">
                <input
                  name="mediateur_site"
                  defaultValue={entreprise?.mediateur_site ?? ""}
                  className={inputClass}
                />
              </Field>
            </div>
          </div>
          <Button type="submit">Enregistrer</Button>
        </form>
      </Card>

      <p className="text-xs text-ink-faint mt-4">
        D'autres réglages (rôles, notifications, préférences) arriveront ici au fil des besoins.
      </p>
    </div>
  );
}
