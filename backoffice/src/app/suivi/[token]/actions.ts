"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDossierByToken } from "@/lib/queries";
import { notifyStaff, logActivity } from "@/lib/log";

const OFFRE_LABELS = {
  copilote: "Copilote",
  copilote_plus: "Copilote Plus",
} as const;

type OffreCible = keyof typeof OFFRE_LABELS;

/** Permet au client, depuis sa page de suivi, de passer son dossier Découverte à une offre payante. */
export async function upgradeOffreDepuisSuivi(token: string, offre: OffreCible) {
  const dossier = await getDossierByToken(token);
  if (!dossier || dossier.offre !== "decouverte" || dossier.etape_client !== "reponse_envoyee") {
    return;
  }

  const db = createAdminClient();
  // "reponse_envoyee" n'existe pas dans les étapes Copilote / Copilote Plus : on repositionne
  // le client sur l'étape commune "votre copilote prend connaissance de votre dossier" pour
  // que sa page de suivi reste cohérente après le changement d'offre.
  await db.from("dossiers").update({ offre, etape_client: "traitement_en_cours" }).eq("id", dossier.id);

  const clientNom = `${dossier.clients?.prenom ?? ""} ${dossier.clients?.nom ?? ""}`.trim();
  const label = OFFRE_LABELS[offre];

  await logActivity({
    action: "dossier.offre_changee",
    entiteType: "dossier",
    entiteId: dossier.id,
    description: `Le client a choisi de passer de Découverte à l'offre ${label} depuis sa page de suivi`,
  });

  await notifyStaff({
    titre: `${clientNom || "Un client"} passe à l'offre ${label}`,
    message: `Dossier ${dossier.reference} — passage de Découverte à ${label} demandé depuis la page de suivi.`,
    type: "changement_offre",
    lien: `/dossiers/${dossier.id}`,
  });

  revalidatePath(`/suivi/${token}`);
}
