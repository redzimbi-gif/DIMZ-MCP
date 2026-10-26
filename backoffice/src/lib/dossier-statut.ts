import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActorId } from "@/lib/log";
import { computeStatutFromEtape } from "@/lib/etapes";
import type { DossierOffre } from "@/lib/types";

// Le pipeline interne (dossiers.statut, 10 étapes, visible sur /dossiers) et
// l'étape client (dossiers.etape_client, visible sur /suivi/[token]) ne sont
// pas synchronisés automatiquement par défaut : un dossier peut avancer côté
// client sans jamais bouger sur le pipeline interne si personne ne va changer
// le second champ à la main. Cette fonction reclasse le dossier, sur le
// pipeline interne, à l'endroit qui correspond à sa nouvelle étape client
// (cf. computeStatutFromEtape dans src/lib/etapes.ts pour la correspondance),
// à chaque changement d'étape — pas seulement au premier.
//
// Vit dans son propre fichier (pas dans dossiers/actions.ts) car ce fichier
// n'a pas "use server" : ses exports ne doivent pas être traités comme des
// Server Actions, qui exigent des arguments sérialisables (ce qui exclut le
// client Supabase passé ici en paramètre).
export async function syncStatutAvecEtape(
  db: ReturnType<typeof createAdminClient>,
  dossierId: string,
  offre: DossierOffre | null,
  etapeClient: string
) {
  const nouveauStatut = computeStatutFromEtape(offre, etapeClient);
  const { data } = await db.from("dossiers").select("statut").eq("id", dossierId).maybeSingle();
  if (data?.statut === nouveauStatut) return;

  await db.from("dossiers").update({ statut: nouveauStatut }).eq("id", dossierId);
  await db.from("dossier_statut_history").insert({
    dossier_id: dossierId,
    statut: nouveauStatut,
    note: "Passage automatique, synchronisé avec l'étape visible par le client.",
    changed_by: await getActorId(),
  });
}
