"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/log";

function facturePayload(formData: FormData) {
  return {
    client_id: String(formData.get("client_id") || "") || null,
    numero: String(formData.get("numero") || "").trim() || null,
    date_facture: String(formData.get("date_facture") || "") || null,
    montant_total: Number(formData.get("montant_total") || 0),
    montant_frais: Number(formData.get("montant_frais") || 0),
    notes: String(formData.get("notes") || "").trim() || null,
  };
}

export async function createFacture(formData: FormData) {
  const db = createAdminClient();
  const payload = facturePayload(formData);

  const { data, error } = await db.from("factures").insert(payload).select("id").single();
  if (error || !data) throw new Error(error?.message || "Erreur lors de l'ajout de la facture.");

  await logActivity({
    action: "facture.creee",
    entiteType: "facture",
    entiteId: data.id,
    description: `Facture ajoutée${payload.numero ? ` : ${payload.numero}` : ""}`,
  });

  revalidatePath("/facturation");
}

export async function updateFacture(id: string, formData: FormData) {
  const db = createAdminClient();
  const payload = facturePayload(formData);

  const { error } = await db.from("factures").update(payload).eq("id", id);
  if (error) throw new Error(error.message);

  await logActivity({
    action: "facture.modifiee",
    entiteType: "facture",
    entiteId: id,
    description: `Facture modifiée${payload.numero ? ` : ${payload.numero}` : ""}`,
  });

  revalidatePath("/facturation");
  redirect("/facturation");
}

export async function deleteFacture(id: string) {
  const db = createAdminClient();
  await db.from("factures").delete().eq("id", id);
  revalidatePath("/facturation");
}
