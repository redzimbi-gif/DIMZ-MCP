"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity, getActorId } from "@/lib/log";

export async function createClientRecord(formData: FormData) {
  const db = createAdminClient();

  const payload = {
    civilite: String(formData.get("civilite") || "") || null,
    nom: String(formData.get("nom") || "").trim(),
    prenom: String(formData.get("prenom") || "").trim() || null,
    telephone: String(formData.get("telephone") || "").trim() || null,
    email: String(formData.get("email") || "").trim() || null,
    adresse: String(formData.get("adresse") || "").trim() || null,
  };

  if (!payload.nom) {
    throw new Error("Le nom est obligatoire.");
  }

  const { data, error } = await db.from("clients").insert(payload).select("id").single();
  if (error || !data) throw new Error(error?.message || "Erreur lors de la création du client.");

  await logActivity({
    action: "client.cree",
    entiteType: "client",
    entiteId: data.id,
    description: `Client créé : ${payload.prenom ?? ""} ${payload.nom}`.trim(),
  });

  revalidatePath("/clients");
  redirect(`/clients/${data.id}`);
}

export async function updateClient(id: string, formData: FormData) {
  const db = createAdminClient();

  const payload = {
    civilite: String(formData.get("civilite") || "") || null,
    nom: String(formData.get("nom") || "").trim(),
    prenom: String(formData.get("prenom") || "").trim() || null,
    telephone: String(formData.get("telephone") || "").trim() || null,
    email: String(formData.get("email") || "").trim() || null,
    adresse: String(formData.get("adresse") || "").trim() || null,
    notes_privees: String(formData.get("notes_privees") || "").trim() || null,
  };

  await db.from("clients").update(payload).eq("id", id);
  await logActivity({
    action: "client.modifie",
    entiteType: "client",
    entiteId: id,
    description: `Fiche client mise à jour : ${payload.prenom ?? ""} ${payload.nom}`.trim(),
  });

  revalidatePath(`/clients/${id}`);
  revalidatePath("/clients");
}

export async function deleteClient(clientId: string) {
  const db = createAdminClient();
  const { data: client } = await db.from("clients").select("nom, prenom").eq("id", clientId).maybeSingle();

  await logActivity({
    action: "client.supprime",
    entiteType: "client",
    entiteId: clientId,
    description: `Client supprimé définitivement : ${client?.prenom ?? ""} ${client?.nom ?? ""}`.trim(),
  });

  await db.from("clients").delete().eq("id", clientId);

  revalidatePath("/clients");
  redirect("/clients");
}

export async function addClientNote(clientId: string, formData: FormData) {
  const db = createAdminClient();
  const contenu = String(formData.get("contenu") || "").trim();
  if (!contenu) return;

  const auteur = await getActorId();
  await db.from("notes_internes").insert({ client_id: clientId, contenu, auteur });

  revalidatePath(`/clients/${clientId}`);
}
