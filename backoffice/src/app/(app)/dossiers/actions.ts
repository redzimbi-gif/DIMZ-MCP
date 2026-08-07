"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity, getActorId } from "@/lib/log";
import { getDossier } from "@/lib/queries";
import { sendEmail, getAppUrl } from "@/lib/email";
import {
  etapeAccompagnementEmail,
  etapeConvoyageEmail,
  ETAPE_ACCOMPAGNEMENT_KEYS,
  ETAPE_CONVOYAGE_KEYS,
  type EtapeAccompagnementKey,
  type EtapeConvoyageKey,
} from "@/lib/email-templates";
import { getEtapeLabel } from "@/lib/etapes";
import { DOSSIER_STATUT_LABELS, DOSSIER_OFFRE_LABELS, type DossierStatut, type DossierOffre } from "@/lib/types";

function isEtapeAccompagnementKey(value: string): value is EtapeAccompagnementKey {
  return (ETAPE_ACCOMPAGNEMENT_KEYS as string[]).includes(value);
}

function isEtapeConvoyageKey(value: string): value is EtapeConvoyageKey {
  return (ETAPE_CONVOYAGE_KEYS as string[]).includes(value);
}

export async function createDossier(formData: FormData) {
  const db = createAdminClient();

  const clientId = String(formData.get("client_id") || "");
  if (!clientId) throw new Error("Sélectionne un client.");

  const payload = {
    client_id: clientId,
    offre: String(formData.get("offre") || "") || null,
    budget: String(formData.get("budget") || "").trim() || null,
    vehicule_recherche: String(formData.get("vehicule_recherche") || "").trim() || null,
    marques_souhaitees: String(formData.get("marques_souhaitees") || "").trim() || null,
    motorisation: String(formData.get("motorisation") || "").trim() || null,
    boite_vitesses: String(formData.get("boite_vitesses") || "").trim() || null,
    km_max: String(formData.get("km_max") || "").trim() || null,
    region: String(formData.get("region") || "").trim() || null,
    commentaires: String(formData.get("commentaires") || "").trim() || null,
    source: "manuel",
  };

  const { data, error } = await db.from("dossiers").insert(payload).select("id, reference").single();
  if (error || !data) throw new Error(error?.message || "Erreur lors de la création du dossier.");

  await db.from("dossier_statut_history").insert({
    dossier_id: data.id,
    statut: "demande_recue",
    changed_by: await getActorId(),
  });

  await logActivity({
    action: "dossier.cree",
    entiteType: "dossier",
    entiteId: data.id,
    description: `Dossier ${data.reference} créé manuellement`,
  });

  revalidatePath("/dossiers");
  redirect(`/dossiers/${data.id}`);
}

export async function updateDossierInfos(dossierId: string, formData: FormData) {
  const db = createAdminClient();
  const previous = await getDossier(dossierId);
  const offre = String(formData.get("offre") || "") || null;

  const payload: Record<string, unknown> = {
    offre,
    budget: String(formData.get("budget") || "").trim() || null,
    vehicule_recherche: String(formData.get("vehicule_recherche") || "").trim() || null,
    marques_souhaitees: String(formData.get("marques_souhaitees") || "").trim() || null,
    motorisation: String(formData.get("motorisation") || "").trim() || null,
    boite_vitesses: String(formData.get("boite_vitesses") || "").trim() || null,
    km_max: String(formData.get("km_max") || "").trim() || null,
    region: String(formData.get("region") || "").trim() || null,
    commentaires: String(formData.get("commentaires") || "").trim() || null,
    valeur_estimee: formData.get("valeur_estimee")
      ? Number(formData.get("valeur_estimee"))
      : null,
  };

  // Ce champ "Offre" est un raccourci pratique pour corriger l'offre en même
  // temps que le reste des infos ; s'il change l'offre, on remet le suivi
  // client sur une étape commune pour éviter une étape orpheline qui
  // n'existerait plus dans la nouvelle offre (même logique que le bandeau
  // d'offres ci-dessus, qui passe par updateDossierOffre).
  if (offre && offre !== previous?.offre) {
    payload.etape_client = "traitement_en_cours";
  }

  await db.from("dossiers").update(payload).eq("id", dossierId);
  await logActivity({
    action: "dossier.modifie",
    entiteType: "dossier",
    entiteId: dossierId,
    description: `Informations du dossier mises à jour`,
  });

  revalidatePath(`/dossiers/${dossierId}`);
}

export async function updateDossierStatut(dossierId: string, formData: FormData) {
  const db = createAdminClient();
  const statut = String(formData.get("statut") || "") as DossierStatut;
  const note = String(formData.get("note") || "").trim() || null;

  await db.from("dossiers").update({ statut }).eq("id", dossierId);

  const acteur = await getActorId();
  await db.from("dossier_statut_history").insert({
    dossier_id: dossierId,
    statut,
    note,
    changed_by: acteur,
  });

  await logActivity({
    action: "dossier.statut_change",
    entiteType: "dossier",
    entiteId: dossierId,
    description: `Statut changé en « ${DOSSIER_STATUT_LABELS[statut]} »`,
  });

  revalidatePath(`/dossiers/${dossierId}`);
  revalidatePath("/dossiers");
  revalidatePath("/");
}

// ---------------------------------------------------------------------------
// Suivi client (étapes dépendant de l'offre) — distinct du statut interne
// ci-dessus, qui reste le pipeline/kanban à usage interne.
// ---------------------------------------------------------------------------
export async function updateDossierOffre(dossierId: string, offre: DossierOffre) {
  const db = createAdminClient();
  // Changer d'offre remet le client sur l'étape commune "traitement en
  // cours" : les étapes spécifiques à l'ancienne offre n'ont plus de sens
  // pour la nouvelle, mieux vaut repartir d'une étape que le client a déjà
  // vue plutôt que de retomber sur "Demande reçue".
  await db.from("dossiers").update({ offre, etape_client: "traitement_en_cours" }).eq("id", dossierId);

  const acteur = await getActorId();
  await db.from("dossier_etape_history").insert({
    dossier_id: dossierId,
    etape_client: "traitement_en_cours",
    note: `Offre choisie : ${DOSSIER_OFFRE_LABELS[offre]}`,
    changed_by: acteur,
  });

  await logActivity({
    action: "dossier.offre_change",
    entiteType: "dossier",
    entiteId: dossierId,
    description: `Offre changée pour « ${DOSSIER_OFFRE_LABELS[offre]} »`,
  });

  revalidatePath(`/dossiers/${dossierId}`);
  revalidatePath("/dossiers");
}

export async function updateDossierEtapeClient(dossierId: string, formData: FormData) {
  const db = createAdminClient();
  const etape = String(formData.get("etape_client") || "").trim();
  const note = String(formData.get("note") || "").trim() || null;
  if (!etape) return;

  const dossier = await getDossier(dossierId);
  await db.from("dossiers").update({ etape_client: etape }).eq("id", dossierId);

  const acteur = await getActorId();
  await db.from("dossier_etape_history").insert({
    dossier_id: dossierId,
    etape_client: etape,
    note,
    changed_by: acteur,
  });

  await logActivity({
    action: "dossier.etape_client_change",
    entiteType: "dossier",
    entiteId: dossierId,
    description: `Étape client changée en « ${getEtapeLabel(dossier?.offre ?? null, etape)} »`,
  });

  revalidatePath(`/dossiers/${dossierId}`);
  revalidatePath("/dossiers");
}

export async function sendEtapeClientEmail(dossierId: string, tab: string) {
  const dossier = await getDossier(dossierId);
  const email = dossier?.clients?.email;

  let status: "sent" | "no-email" | "error" = "sent";

  if (!dossier || !email) {
    status = "no-email";
  } else {
    try {
      const params = {
        prenom: dossier.clients?.prenom ?? null,
        reference: dossier.reference,
        portalUrl: `${getAppUrl()}/suivi/${dossier.portal_token}`,
      };
      const isConvoyage = dossier.offre === "convoyage_seul";
      const templated = isConvoyage
        ? isEtapeConvoyageKey(dossier.etape_client)
          ? etapeConvoyageEmail(dossier.etape_client, params)
          : null
        : isEtapeAccompagnementKey(dossier.etape_client)
          ? etapeAccompagnementEmail(dossier.etape_client, params)
          : null;

      if (!templated) {
        status = "error";
      } else {
        const result = await sendEmail({ to: email, subject: templated.subject, html: templated.html });
        status = result.ok ? "sent" : "error";

        if (result.ok) {
          await logActivity({
            action: "email.etape_client",
            entiteType: "dossier",
            entiteId: dossierId,
            description: `Email d'étape (« ${templated.subject} ») envoyé à ${email}`,
          });
        }
      }
    } catch (err) {
      console.error("Échec envoi email d'étape:", err);
      status = "error";
    }
  }

  redirect(`/dossiers/${dossierId}?tab=${tab}&notif=${status}`);
}

export async function decideConvoyageDemande(dossierId: string, decision: "accepte" | "refuse") {
  const dossier = await getDossier(dossierId);
  if (!dossier) return;

  const db = createAdminClient();
  const etape = decision === "accepte" ? "devis_en_cours" : "demande_refusee";

  await db.from("dossiers").update({ convoyage_decision: decision, etape_client: etape }).eq("id", dossierId);

  const acteur = await getActorId();
  await db.from("dossier_etape_history").insert({
    dossier_id: dossierId,
    etape_client: etape,
    note: decision === "accepte" ? "Demande de convoyage acceptée" : "Demande de convoyage refusée",
    changed_by: acteur,
  });

  await logActivity({
    action: "dossier.convoyage_decision",
    entiteType: "dossier",
    entiteId: dossierId,
    description: decision === "accepte" ? "Demande de convoyage acceptée" : "Demande de convoyage refusée",
  });

  // L'acceptation/le refus est une décision qui mérite d'être notifiée tout
  // de suite au client, pas de laisser ça à un envoi manuel séparé.
  const email = dossier.clients?.email;
  if (email) {
    const templateKey: EtapeConvoyageKey = decision === "accepte" ? "devis_en_cours" : "demande_refusee";
    const { subject, html } = etapeConvoyageEmail(templateKey, {
      prenom: dossier.clients?.prenom ?? null,
      reference: dossier.reference,
      portalUrl: `${getAppUrl()}/suivi/${dossier.portal_token}`,
    });
    const result = await sendEmail({ to: email, subject, html });
    if (result.ok) {
      await logActivity({
        action: "email.etape_client",
        entiteType: "dossier",
        entiteId: dossierId,
        description: `Email (« ${subject} ») envoyé à ${email}`,
      });
    }
  }

  revalidatePath(`/dossiers/${dossierId}`);
  revalidatePath("/dossiers");
}

export async function addDossierNote(dossierId: string, formData: FormData) {
  const db = createAdminClient();
  const contenu = String(formData.get("contenu") || "").trim();
  if (!contenu) return;

  const auteur = await getActorId();
  await db.from("notes_internes").insert({ dossier_id: dossierId, contenu, auteur });

  revalidatePath(`/dossiers/${dossierId}`);
}
