"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity, getActorId } from "@/lib/log";
import { DOSSIER_STATUT_LABELS, type DossierStatut } from "@/lib/types";

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

  const payload = {
    offre: String(formData.get("offre") || "") || null,
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

export async function addDossierNote(dossierId: string, formData: FormData) {
  const db = createAdminClient();
  const contenu = String(formData.get("contenu") || "").trim();
  if (!contenu) return;

  const auteur = await getActorId();
  await db.from("notes_internes").insert({ dossier_id: dossierId, contenu, auteur });

  revalidatePath(`/dossiers/${dossierId}`);
}
