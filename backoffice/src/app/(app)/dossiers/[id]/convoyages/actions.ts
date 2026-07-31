"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/log";
import { uploadFiles, uploadDataUrlImage } from "@/lib/storage";
import type { ConvoyageStatut } from "@/lib/types";

export async function createConvoyage(dossierId: string, formData: FormData) {
  const db = createAdminClient();

  const photosAvant = (formData.getAll("photos_avant") as File[]).filter((f) => f.size > 0);
  const photosApres = (formData.getAll("photos_apres") as File[]).filter((f) => f.size > 0);

  const [avantPaths, apresPaths] = await Promise.all([
    uploadFiles(`convoyages/${dossierId}/avant`, photosAvant),
    uploadFiles(`convoyages/${dossierId}/apres`, photosApres),
  ]);

  const signatureData = String(formData.get("signature_client") || "");
  const signaturePath = signatureData
    ? await uploadDataUrlImage(`convoyages/${dossierId}/signatures`, signatureData)
    : null;

  const payload = {
    dossier_id: dossierId,
    adresse_depart: String(formData.get("adresse_depart") || "").trim() || null,
    adresse_arrivee: String(formData.get("adresse_arrivee") || "").trim() || null,
    date_convoyage: String(formData.get("date_convoyage") || "") || null,
    heure: String(formData.get("heure") || "") || null,
    conducteur: String(formData.get("conducteur") || "").trim() || null,
    km_depart: formData.get("km_depart") ? Number(formData.get("km_depart")) : null,
    km_arrivee: formData.get("km_arrivee") ? Number(formData.get("km_arrivee")) : null,
    niveau_carburant: String(formData.get("niveau_carburant") || "").trim() || null,
    photos_avant: avantPaths,
    photos_apres: apresPaths,
    signature_client: signaturePath,
    rapport_notes: String(formData.get("rapport_notes") || "").trim() || null,
    statut: (String(formData.get("statut") || "planifie") as ConvoyageStatut),
  };

  const { data, error } = await db.from("convoyages").insert(payload).select("id").single();
  if (error || !data) throw new Error(error?.message || "Erreur lors de la création du convoyage.");

  await logActivity({
    action: "convoyage.cree",
    entiteType: "convoyage",
    entiteId: data.id,
    description: `Convoyage planifié pour le dossier`,
  });

  revalidatePath(`/dossiers/${dossierId}`);
  redirect(`/dossiers/${dossierId}/convoyages/${data.id}`);
}
