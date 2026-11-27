"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/log";
import { uploadFiles, deleteFile } from "@/lib/storage";

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

  const pdf = formData.get("pdf") as File | null;
  if (pdf && pdf.size > 0) {
    const [path] = await uploadFiles(`factures/${data.id}`, [pdf]);
    if (path) await db.from("factures").update({ pdf_path: path }).eq("id", data.id);
  }

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

  const pdf = formData.get("pdf") as File | null;
  if (pdf && pdf.size > 0) {
    const { data: existante } = await db.from("factures").select("pdf_path").eq("id", id).maybeSingle();
    const [path] = await uploadFiles(`factures/${id}`, [pdf]);
    if (path) {
      await db.from("factures").update({ pdf_path: path }).eq("id", id);
      if (existante?.pdf_path) await deleteFile(existante.pdf_path);
    }
  }

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
  const { data: facture } = await db.from("factures").select("pdf_path").eq("id", id).maybeSingle();
  if (facture?.pdf_path) await deleteFile(facture.pdf_path);
  await db.from("factures").delete().eq("id", id);
  revalidatePath("/facturation");
}
