"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity, getActorId } from "@/lib/log";
import { uploadFiles } from "@/lib/storage";
import type { DocumentType } from "@/lib/types";

export async function uploadDossierDocument(dossierId: string, formData: FormData) {
  const db = createAdminClient();

  const fichier = formData.get("fichier") as File | null;
  if (!fichier || fichier.size === 0) throw new Error("Sélectionne un fichier.");

  const [path] = await uploadFiles(`documents/${dossierId}`, [fichier]);
  if (!path) throw new Error("Échec de l'envoi du fichier.");

  const { data: dossier } = await db.from("dossiers").select("client_id").eq("id", dossierId).single();

  const uploadedBy = await getActorId();
  await db.from("documents").insert({
    dossier_id: dossierId,
    client_id: dossier?.client_id ?? null,
    type: String(formData.get("type") || "autre") as DocumentType,
    nom: fichier.name,
    storage_path: path,
    taille: fichier.size,
    uploaded_by: uploadedBy,
  });

  await logActivity({
    action: "document.ajoute",
    entiteType: "dossier",
    entiteId: dossierId,
    description: `Document ajouté : ${fichier.name}`,
  });

  revalidatePath(`/dossiers/${dossierId}`);
}
