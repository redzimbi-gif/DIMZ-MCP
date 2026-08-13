"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDossierByToken } from "@/lib/queries";
import { notifyStaff, logActivity } from "@/lib/log";
import { DOSSIER_OFFRE_LABELS } from "@/lib/types";

const OFFRE_LABELS = {
  copilote: "Copilote",
  copilote_plus: "Copilote Plus",
} as const;

type OffreCible = keyof typeof OFFRE_LABELS;

// Transitions d'offre autorisées depuis la page de suivi : offre actuelle -> étape client
// requise -> offres cibles proposées. En dehors de ces cas précis, le bouton ne fait rien.
const UPGRADE_TRANSITIONS: Partial<Record<string, { etape: string; cibles: OffreCible[] }>> = {
  decouverte: { etape: "reponse_envoyee", cibles: ["copilote", "copilote_plus"] },
  copilote: { etape: "dossier_envoye", cibles: ["copilote_plus"] },
};

/** Permet au client, depuis sa page de suivi, de passer son dossier à une offre supérieure. */
export async function upgradeOffreDepuisSuivi(token: string, offre: OffreCible) {
  const dossier = await getDossierByToken(token);
  const transition = dossier ? UPGRADE_TRANSITIONS[dossier.offre ?? ""] : undefined;
  if (!dossier || !transition || dossier.etape_client !== transition.etape || !transition.cibles.includes(offre)) {
    return;
  }

  const ancienLabel = DOSSIER_OFFRE_LABELS[dossier.offre ?? "decouverte"];

  const db = createAdminClient();
  // Les étapes-source ("reponse_envoyee", "dossier_envoye") n'existent pas dans les étapes
  // Copilote / Copilote Plus : on repositionne le client sur l'étape commune "votre copilote
  // prend connaissance de votre dossier" pour que sa page de suivi reste cohérente.
  await db.from("dossiers").update({ offre, etape_client: "traitement_en_cours" }).eq("id", dossier.id);

  const clientNom = `${dossier.clients?.prenom ?? ""} ${dossier.clients?.nom ?? ""}`.trim();
  const label = OFFRE_LABELS[offre];

  await logActivity({
    action: "dossier.offre_changee",
    entiteType: "dossier",
    entiteId: dossier.id,
    description: `Le client a choisi de passer de ${ancienLabel} à l'offre ${label} depuis sa page de suivi`,
  });

  await notifyStaff({
    titre: `${clientNom || "Un client"} passe à l'offre ${label}`,
    message: `Dossier ${dossier.reference} — passage de ${ancienLabel} à ${label} demandé depuis la page de suivi.`,
    type: "changement_offre",
    lien: `/dossiers/${dossier.id}`,
  });

  revalidatePath(`/suivi/${token}`);
}
