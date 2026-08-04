"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/log";

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

  await logActivity({
    action: "convoyage_externe.cree",
    entiteType: "convoyage_externe",
    entiteId: data.id,
    description: `Convoyage hors DIMZ ajouté : ${payload.lieu_depart ?? "?"} → ${payload.lieu_arrivee ?? "?"}`,
  });

  revalidatePath("/comptabilite");
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

  await logActivity({
    action: "convoyage_externe.modifie",
    entiteType: "convoyage_externe",
    entiteId: id,
    description: `Convoyage hors DIMZ modifié : ${payload.lieu_depart ?? "?"} → ${payload.lieu_arrivee ?? "?"}`,
  });

  revalidatePath("/comptabilite");
  redirect("/comptabilite");
}

export async function deleteConvoyageExterne(id: string) {
  const db = createAdminClient();
  await db.from("convoyages_externes").delete().eq("id", id);
  revalidatePath("/comptabilite");
}
