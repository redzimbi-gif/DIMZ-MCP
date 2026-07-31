"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/log";
import { uploadFiles } from "@/lib/storage";

export async function createAnnonce(dossierId: string, formData: FormData) {
  const db = createAdminClient();

  const titre = String(formData.get("titre") || "").trim();
  if (!titre) throw new Error("Le titre de l'annonce est obligatoire.");

  const photos = formData.getAll("photos") as File[];
  const photoPaths = await uploadFiles(`annonces/${dossierId}`, photos);

  const payload = {
    dossier_id: dossierId,
    titre,
    lien: String(formData.get("lien") || "").trim() || null,
    prix: formData.get("prix") ? Number(formData.get("prix")) : null,
    kilometrage: formData.get("kilometrage") ? Number(formData.get("kilometrage")) : null,
    annee: formData.get("annee") ? Number(formData.get("annee")) : null,
    localisation: String(formData.get("localisation") || "").trim() || null,
    avis_copilote: String(formData.get("avis_copilote") || "").trim() || null,
    points_forts: String(formData.get("points_forts") || "").trim() || null,
    points_faibles: String(formData.get("points_faibles") || "").trim() || null,
    score_confiance: formData.get("score_confiance") ? Number(formData.get("score_confiance")) : null,
    photos: photoPaths,
  };

  const { data, error } = await db.from("annonces").insert(payload).select("id").single();
  if (error) throw new Error(error.message);

  await logActivity({
    action: "annonce.ajoutee",
    entiteType: "annonce",
    entiteId: data?.id,
    description: `Annonce ajoutée : ${titre}`,
  });

  revalidatePath(`/dossiers/${dossierId}`);
}

export async function toggleAnnonceSelection(dossierId: string, annonceId: string, next: boolean) {
  const db = createAdminClient();
  await db.from("annonces").update({ selectionnee: next }).eq("id", annonceId);
  revalidatePath(`/dossiers/${dossierId}`);
}

export async function updateAnnonceNegociation(dossierId: string, annonceId: string, formData: FormData) {
  const db = createAdminClient();
  const prixNegocie = formData.get("prix_negocie") ? Number(formData.get("prix_negocie")) : null;
  await db.from("annonces").update({ prix_negocie: prixNegocie }).eq("id", annonceId);
  revalidatePath(`/dossiers/${dossierId}`);
}

export async function deleteAnnonce(dossierId: string, annonceId: string) {
  const db = createAdminClient();
  await db.from("annonces").delete().eq("id", annonceId);
  revalidatePath(`/dossiers/${dossierId}`);
}
