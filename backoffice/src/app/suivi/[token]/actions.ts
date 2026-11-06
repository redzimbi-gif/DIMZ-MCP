"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDossierByToken } from "@/lib/queries";
import { notifyStaff, logActivity } from "@/lib/log";
import { syncStatutAvecEtape } from "@/lib/dossier-statut";
import { ETAPE_PAIEMENT_KEY, etapeApresChangementOffre } from "@/lib/etapes";
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
  // Copilote / Copilote Plus : le client est repositionné sur l'étape de paiement de sa
  // nouvelle offre, ou directement sur la prise en charge si elle est déjà réglée.
  const etape = etapeApresChangementOffre(offre, dossier.paiement_offre);
  await db.from("dossiers").update({ offre, etape_client: etape }).eq("id", dossier.id);
  await syncStatutAvecEtape(db, dossier.id, offre, etape);

  const clientNom = `${dossier.clients?.prenom ?? ""} ${dossier.clients?.nom ?? ""}`.trim();
  const label = OFFRE_LABELS[offre];
  const attendPaiement = etape === ETAPE_PAIEMENT_KEY;

  await db.from("dossier_etape_history").insert({
    dossier_id: dossier.id,
    etape_client: etape,
    note: `Offre ${label} choisie par le client depuis sa page de suivi`,
  });

  await logActivity({
    action: "dossier.offre_changee",
    entiteType: "dossier",
    entiteId: dossier.id,
    description: `Le client a choisi de passer de ${ancienLabel} à l'offre ${label} depuis sa page de suivi`,
  });

  await notifyStaff({
    titre: attendPaiement
      ? `${clientNom || "Un client"} attend son lien de paiement (${label})`
      : `${clientNom || "Un client"} passe à l'offre ${label}`,
    message: attendPaiement
      ? `Dossier ${dossier.reference} — passage de ${ancienLabel} à ${label}. À facturer pour que le dossier démarre.`
      : `Dossier ${dossier.reference} — passage de ${ancienLabel} à ${label} demandé depuis la page de suivi.`,
    type: "changement_offre",
    lien: `/dossiers/${dossier.id}`,
  });

  revalidatePath(`/suivi/${token}`);
}

const MESSAGE_MAX_LENGTH = 4000;

/** Permet au client d'envoyer un message à son copilote depuis sa page de suivi. */
export async function sendMessageClient(token: string, formData: FormData) {
  const contenu = String(formData.get("contenu") || "").trim().slice(0, MESSAGE_MAX_LENGTH);
  if (!contenu) return;

  const dossier = await getDossierByToken(token);
  if (!dossier) return;

  const db = createAdminClient();
  await db
    .from("messages")
    .insert({ dossier_id: dossier.id, auteur: "client", contenu, lu_par_client: true, lu_par_staff: false });

  const clientNom = `${dossier.clients?.prenom ?? ""} ${dossier.clients?.nom ?? ""}`.trim();

  await logActivity({
    action: "message.envoye_client",
    entiteType: "dossier",
    entiteId: dossier.id,
    description: `Message reçu du client pour le dossier ${dossier.reference}`,
  });

  await notifyStaff({
    titre: `Nouveau message de ${clientNom || "un client"}`,
    message: `Dossier ${dossier.reference} : « ${contenu.slice(0, 140)}${contenu.length > 140 ? "…" : ""} »`,
    type: "message_client",
    lien: `/dossiers/${dossier.id}`,
  });

  revalidatePath(`/suivi/${token}`);
}
