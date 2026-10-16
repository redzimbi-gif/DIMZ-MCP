"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity, getActorId } from "@/lib/log";
import { getProspect, getEntrepriseInfo } from "@/lib/queries";
import { sendEmail } from "@/lib/email";
import { prospectionEmail } from "@/lib/email-templates";
import { remplirVariables, variablesProspect } from "@/lib/prospection-email";
import {
  PROSPECT_STATUTS_CONTACT,
  PROSPECT_STATUT_LABELS,
  type ProspectCategorie,
  type ProspectStatut,
  type ProspectZone,
} from "@/lib/types";

function texte(formData: FormData, name: string): string | null {
  return String(formData.get(name) || "").trim() || null;
}

/** Champs communs au formulaire de création et à celui d'édition. */
function champsProspect(formData: FormData) {
  return {
    raison_sociale: String(formData.get("raison_sociale") || "").trim(),
    enseigne: texte(formData, "enseigne"),
    siret: texte(formData, "siret"),
    ide: texte(formData, "ide"),
    code_naf: texte(formData, "code_naf"),
    categorie: (texte(formData, "categorie") || "autre") as ProspectCategorie,
    adresse: texte(formData, "adresse"),
    code_postal: texte(formData, "code_postal"),
    ville: texte(formData, "ville"),
    zone: (texte(formData, "zone") || null) as ProspectZone | null,
    telephone: texte(formData, "telephone"),
    email: texte(formData, "email"),
    site_web: texte(formData, "site_web"),
    responsable_nom: texte(formData, "responsable_nom"),
    responsable_fonction: texte(formData, "responsable_fonction"),
    notes: texte(formData, "notes"),
  };
}

export async function createProspect(formData: FormData) {
  const db = createAdminClient();
  const payload = {
    ...champsProspect(formData),
    statut: (texte(formData, "statut") || "a_contacter") as ProspectStatut,
    source: "manuel" as const,
  };

  if (!payload.raison_sociale) {
    throw new Error("La raison sociale est obligatoire.");
  }

  const { data, error } = await db.from("prospects").insert(payload).select("id").single();
  if (error || !data) throw new Error(error?.message || "Erreur lors de la création du prospect.");

  await logActivity({
    action: "prospect.cree",
    entiteType: "prospect",
    entiteId: data.id,
    description: `Prospect créé : ${payload.raison_sociale}`,
  });

  revalidatePath("/prospection");
  redirect(`/prospection/${data.id}`);
}

export async function updateProspect(id: string, formData: FormData) {
  const db = createAdminClient();
  const payload = champsProspect(formData);

  if (!payload.raison_sociale) {
    throw new Error("La raison sociale est obligatoire.");
  }

  await db.from("prospects").update(payload).eq("id", id);

  await logActivity({
    action: "prospect.modifie",
    entiteType: "prospect",
    entiteId: id,
    description: `Fiche prospect mise à jour : ${payload.raison_sociale}`,
  });

  revalidatePath(`/prospection/${id}`);
  revalidatePath("/prospection");
}

/**
 * Statut + dates de relance. Passer à un statut qui traduit un contact
 * effectif horodate la dernière relance : l'équipe n'a pas à saisir la date
 * du jour à la main à chaque appel.
 */
export async function updateProspectStatut(id: string, formData: FormData) {
  const db = createAdminClient();
  const statut = (texte(formData, "statut") || "froid") as ProspectStatut;
  const prochaine = texte(formData, "prochaine_relance_le");

  const payload: Record<string, string | null> = {
    statut,
    prochaine_relance_le: prochaine,
  };
  if (PROSPECT_STATUTS_CONTACT.includes(statut)) {
    payload.derniere_relance_le = new Date().toISOString().slice(0, 10);
  }

  await db.from("prospects").update(payload).eq("id", id);

  await logActivity({
    action: "prospect.statut_change",
    entiteType: "prospect",
    entiteId: id,
    description: `Statut du prospect : ${PROSPECT_STATUT_LABELS[statut]}`,
  });

  revalidatePath(`/prospection/${id}`);
  revalidatePath("/prospection");
}

export async function addProspectNote(prospectId: string, formData: FormData) {
  const db = createAdminClient();
  const contenu = String(formData.get("contenu") || "").trim();
  if (!contenu) return;

  const auteur = await getActorId();
  await db.from("notes_internes").insert({ prospect_id: prospectId, contenu, auteur });

  revalidatePath(`/prospection/${prospectId}`);
}

/**
 * Le prospect a signé : on lui crée une fiche client professionnelle et on
 * garde le lien entre les deux. Le prospect n'est pas supprimé — il garde son
 * historique de prospection, qui explique comment ce client est arrivé.
 */
export async function convertirEnClient(id: string) {
  const db = createAdminClient();
  const prospect = await getProspect(id);
  if (!prospect) throw new Error("Prospect introuvable.");

  // Déjà converti : on renvoie simplement vers la fiche client existante.
  if (prospect.converti_client_id) {
    redirect(`/clients/${prospect.converti_client_id}`);
  }

  const { data: client, error } = await db
    .from("clients")
    .insert({
      nom: prospect.responsable_nom || prospect.raison_sociale,
      telephone: prospect.telephone,
      email: prospect.email,
      adresse: [prospect.adresse, prospect.code_postal, prospect.ville].filter(Boolean).join(", ") || null,
      notes_privees: prospect.notes,
      type_client: "professionnel",
      raison_sociale: prospect.raison_sociale,
      siret: prospect.siret,
    })
    .select("id")
    .single();

  if (error || !client) {
    throw new Error(error?.message || "Erreur lors de la création de la fiche client.");
  }

  await db
    .from("prospects")
    .update({ converti_client_id: client.id, statut: "converti" })
    .eq("id", id);

  await logActivity({
    action: "prospect.converti",
    entiteType: "prospect",
    entiteId: id,
    description: `Prospect converti en client : ${prospect.raison_sociale}`,
  });

  revalidatePath(`/prospection/${id}`);
  revalidatePath("/prospection");
  revalidatePath("/clients");
  redirect(`/clients/${client.id}`);
}

export async function deleteProspect(id: string) {
  const db = createAdminClient();
  const { data: prospect } = await db
    .from("prospects")
    .select("raison_sociale")
    .eq("id", id)
    .maybeSingle();

  await logActivity({
    action: "prospect.supprime",
    entiteType: "prospect",
    entiteId: id,
    description: `Prospect supprimé : ${prospect?.raison_sociale ?? ""}`.trim(),
  });

  await db.from("prospects").delete().eq("id", id);

  revalidatePath("/prospection");
  redirect("/prospection");
}

/**
 * Envoie le mail de prospection rédigé dans le composeur de la fiche. Le texte
 * arrive déjà relu par l'équipe : on se contente de remplir les variables
 * éventuellement retapées à la main, puis de l'habiller de la mise en forme
 * DIMZ.
 *
 * Un envoi réussi vaut contact : il horodate la dernière relance, fait sortir
 * le prospect des statuts « froid » / « à contacter », et laisse une trace dans
 * l'historique des échanges pour que personne ne le recontacte à l'aveugle.
 */
export async function envoyerEmailProspect(id: string, formData: FormData) {
  const prospect = await getProspect(id);
  if (!prospect) throw new Error("Prospect introuvable.");

  const destinataire = texte(formData, "destinataire") || prospect.email;
  const objetSaisi = texte(formData, "objet");
  const corpsSaisi = texte(formData, "corps");

  if (!destinataire) {
    redirect(`/prospection/${id}?notif=prospect-no-email`);
  }
  if (!objetSaisi || !corpsSaisi) {
    throw new Error("L'objet et le message du mail sont obligatoires.");
  }

  const variables = variablesProspect(prospect, await getEntrepriseInfo());

  const objet = remplirVariables(objetSaisi, variables);
  const corps = remplirVariables(corpsSaisi, variables);
  const { subject, html } = prospectionEmail({ objet, corps });

  const envoi = await sendEmail({ to: destinataire, subject, html });
  if (!envoi.ok) {
    redirect(`/prospection/${id}?notif=prospect-error`);
  }

  const payload: Record<string, string | null> = {
    derniere_relance_le: new Date().toISOString().slice(0, 10),
  };
  if (prospect.statut === "froid" || prospect.statut === "a_contacter") {
    payload.statut = "contact_en_cours";
  }
  // Beaucoup de fiches françaises arrivent du recensement sans email : celle
  // qui vient d'être saisie dans le composeur est conservée, sinon elle serait
  // à retrouver au prochain contact.
  if (!prospect.email) {
    payload.email = destinataire;
  }

  const db = createAdminClient();
  await db.from("prospects").update(payload).eq("id", id);

  if (formData.get("note")) {
    const auteur = await getActorId();
    await db.from("notes_internes").insert({
      prospect_id: id,
      contenu: `Mail de prospection envoyé à ${destinataire} — « ${subject} »`,
      auteur,
    });
  }

  await logActivity({
    action: "prospect.email_envoye",
    entiteType: "prospect",
    entiteId: id,
    description: `Mail de prospection envoyé à ${destinataire} (« ${subject} ») pour ${prospect.raison_sociale}`,
  });

  revalidatePath(`/prospection/${id}`);
  revalidatePath("/prospection");
  redirect(`/prospection/${id}?notif=prospect-sent`);
}
