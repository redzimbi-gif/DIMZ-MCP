"use client";

import { useFormStatus } from "react-dom";
import { Trash2 } from "lucide-react";
import { PROSPECT_STATUTS, PROSPECT_STATUT_LABELS, type ProspectStatut } from "@/lib/types";
import { PROSPECT_STATUT_STYLES } from "@/components/ui";

/**
 * Changement de statut directement dans la liste des prospects. Au téléphone,
 * on enchaîne les appels sur une liste filtrée : ouvrir la fiche, changer le
 * statut, revenir, c'était trois clics par prospect.
 *
 * Le select s'envoie au changement, sans bouton de validation : il n'y a qu'un
 * champ, et un bouton par ligne alourdirait le tableau. Contrairement au
 * formulaire de la fiche, celui-ci ne touche pas à la date de prochaine
 * relance — elle ne doit pas être effacée par un changement de statut fait
 * depuis la liste, où elle n'est pas saisissable.
 */
export function ProspectStatutSelect({
  action,
  statut,
  raisonSociale,
}: {
  action: (formData: FormData) => Promise<void>;
  statut: ProspectStatut;
  raisonSociale: string;
}) {
  return (
    <form action={action}>
      <StatutSelect statut={statut} raisonSociale={raisonSociale} />
    </form>
  );
}

function StatutSelect({
  statut,
  raisonSociale,
}: {
  statut: ProspectStatut;
  raisonSociale: string;
}) {
  const { pending } = useFormStatus();
  return (
    <select
      name="statut"
      defaultValue={statut}
      disabled={pending}
      aria-label={`Statut de ${raisonSociale}`}
      // La soumission part du select lui-même : le form est son parent direct.
      onChange={(e) => e.currentTarget.form?.requestSubmit()}
      className={`appearance-none rounded-full border-0 pl-2.5 pr-2.5 py-1 text-xs font-medium whitespace-nowrap cursor-pointer focus-ring disabled:opacity-60 disabled:cursor-wait ${PROSPECT_STATUT_STYLES[statut]}`}
    >
      {PROSPECT_STATUTS.map((s) => (
        <option key={s} value={s} className="bg-surface text-ink font-normal">
          {PROSPECT_STATUT_LABELS[s]}
        </option>
      ))}
    </select>
  );
}

/**
 * Suppression d'un prospect depuis la liste. Le recensement automatique
 * ramène des fiches hors cible (carrosseries sans flotte, doublons d'un même
 * garage) : il faut pouvoir les écarter sans ouvrir chaque fiche.
 *
 * Irréversible, donc confirmation nommant l'établissement — on ne veut pas
 * qu'un clic à côté dans un tableau dense emporte une fiche et son historique.
 */
export function ProspectDeleteButton({
  action,
  raisonSociale,
}: {
  action: (formData: FormData) => Promise<void>;
  raisonSociale: string;
}) {
  return (
    <form action={action} className="inline">
      {/* Reste sur la liste au lieu de rediriger : les filtres et la page
          courante sont conservés pour enchaîner le tri des fiches. */}
      <input type="hidden" name="retour" value="liste" />
      <DeleteButton raisonSociale={raisonSociale} />
    </form>
  );
}

function DeleteButton({ raisonSociale }: { raisonSociale: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      title={`Supprimer ${raisonSociale}`}
      aria-label={`Supprimer ${raisonSociale}`}
      onClick={(e) => {
        if (
          !window.confirm(
            `Supprimer définitivement ${raisonSociale} ? Cette action est irréversible et supprimera aussi son historique d'échanges.`
          )
        ) {
          e.preventDefault();
        }
      }}
      className="inline-flex items-center justify-center rounded-md p-1.5 text-ink-faint transition-colors hover:bg-bad-bg hover:text-bad focus-ring disabled:opacity-50 disabled:cursor-wait"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
