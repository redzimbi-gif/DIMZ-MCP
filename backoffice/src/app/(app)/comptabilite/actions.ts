"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/log";
import { uploadFiles, deleteFile } from "@/lib/storage";

export async function createConvoyageExterne(formData: FormData) {
  const db = createAdminClient();

  const payload = {
    date_convoyage: String(formData.get("date_convoyage") || "") || null,
    lieu_depart: String(formData.get("lieu_depart") || "").trim() || null,
    lieu_arrivee: String(formData.get("lieu_arrivee") || "").trim() || null,
    total_prestation: Number(formData.get("total_prestation") || 0),
    frais: Number(formData.get("frais") || 0),
    notes: String(formData.get("notes") || "").trim() || null,
  };

  const { data, error } = await db
    .from("convoyages_externes")
    .insert(payload)
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message || "Erreur lors de l'ajout du convoyage.");

  const fichiers = (formData.getAll("justificatifs") as File[]).filter((f) => f.size > 0);
  if (fichiers.length > 0) {
    const paths = await uploadFiles(`convoyages-externes/${data.id}`, fichiers);
    if (paths.length > 0) {
      await db.from("convoyages_externes").update({ justificatifs: paths }).eq("id", data.id);
    }
  }

  await logActivity({
    action: "convoyage_externe.cree",
    entiteType: "convoyage_externe",
    entiteId: data.id,
    description: `Convoyage hors DIMZ ajouté : ${payload.lieu_depart ?? "?"} → ${payload.lieu_arrivee ?? "?"}`,
  });

  revalidatePath("/comptabilite");
  revalidatePath("/convoyages");
}

export async function updateConvoyageExterne(id: string, formData: FormData) {
  const db = createAdminClient();

  const payload = {
    date_convoyage: String(formData.get("date_convoyage") || "") || null,
    lieu_depart: String(formData.get("lieu_depart") || "").trim() || null,
    lieu_arrivee: String(formData.get("lieu_arrivee") || "").trim() || null,
    total_prestation: Number(formData.get("total_prestation") || 0),
    frais: Number(formData.get("frais") || 0),
    notes: String(formData.get("notes") || "").trim() || null,
  };

  const { error } = await db.from("convoyages_externes").update(payload).eq("id", id);
  if (error) throw new Error(error.message);

  const fichiers = (formData.getAll("justificatifs") as File[]).filter((f) => f.size > 0);
  if (fichiers.length > 0) {
    const nouveauxChemins = await uploadFiles(`convoyages-externes/${id}`, fichiers);
    if (nouveauxChemins.length > 0) {
      const { data: existant } = await db
        .from("convoyages_externes")
        .select("justificatifs")
        .eq("id", id)
        .single();
      const justificatifs = [...(existant?.justificatifs ?? []), ...nouveauxChemins];
      await db.from("convoyages_externes").update({ justificatifs }).eq("id", id);
    }
  }

  await logActivity({
    action: "convoyage_externe.modifie",
    entiteType: "convoyage_externe",
    entiteId: id,
    description: `Convoyage hors DIMZ modifié : ${payload.lieu_depart ?? "?"} → ${payload.lieu_arrivee ?? "?"}`,
  });

  revalidatePath("/comptabilite");
  revalidatePath("/convoyages");
  redirect("/comptabilite");
}

export async function deleteJustificatif(id: string, path: string) {
  const db = createAdminClient();

  await deleteFile(path);

  const { data: existant } = await db
    .from("convoyages_externes")
    .select("justificatifs")
    .eq("id", id)
    .single();
  const justificatifs = (existant?.justificatifs ?? []).filter((p: string) => p !== path);
  await db.from("convoyages_externes").update({ justificatifs }).eq("id", id);

  revalidatePath(`/comptabilite/${id}`);
}

export async function deleteConvoyageExterne(id: string) {
  const db = createAdminClient();
  await db.from("convoyages_externes").delete().eq("id", id);
  revalidatePath("/comptabilite");
  revalidatePath("/convoyages");
}
