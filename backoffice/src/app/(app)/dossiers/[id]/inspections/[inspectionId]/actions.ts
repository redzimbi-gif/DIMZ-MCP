"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { renderToBuffer } from "@react-pdf/renderer";
import { createAdminClient } from "@/lib/supabase/admin";
import { getInspection } from "@/lib/queries";
import { InspectionReport } from "@/lib/pdf/InspectionReport";
import { sendEmail, getAppUrl } from "@/lib/email";
import { rapportDisponibleEmail } from "@/lib/email-templates";
import { logActivity } from "@/lib/log";
import { uploadFiles, deleteFile } from "@/lib/storage";
import { inspectionFieldsFromForm } from "@/lib/inspection-fields";

export async function updateInspection(dossierId: string, inspectionId: string, formData: FormData) {
  const db = createAdminClient();

  try {
    const existing = await getInspection(inspectionId);
    if (!existing) throw new Error("Inspection introuvable.");

    const photos = (formData.getAll("photos") as File[]).filter((f) => f.size > 0);
    const videos = (formData.getAll("videos") as File[]).filter((f) => f.size > 0);
    const [newPhotoPaths, newVideoPaths] = await Promise.all([
      uploadFiles(`inspections/${dossierId}`, photos),
      uploadFiles(`inspections/${dossierId}`, videos),
    ]);

    const payload = {
      date_inspection: String(formData.get("date_inspection") || existing.date_inspection),
      ...inspectionFieldsFromForm(formData),
      photos: [...existing.photos, ...newPhotoPaths],
      videos: [...existing.videos, ...newVideoPaths],
    };

    const { error } = await db.from("inspections").update(payload).eq("id", inspectionId);
    if (error) throw new Error(error.message || "Erreur lors de la mise à jour de l'inspection.");

    await logActivity({
      action: "inspection.modifiee",
      entiteType: "inspection",
      entiteId: inspectionId,
      description: `Rapport d'inspection mis à jour`,
    });
  } catch (error) {
    console.error("Erreur mise à jour inspection", error);
    const message = error instanceof Error ? error.message : "Erreur inconnue lors de la mise à jour de l'inspection.";
    redirect(`/dossiers/${dossierId}/inspections/${inspectionId}/edit?error=${encodeURIComponent(message)}`);
  }

  revalidatePath(`/dossiers/${dossierId}/inspections/${inspectionId}`);
  redirect(`/dossiers/${dossierId}/inspections/${inspectionId}`);
}

export async function deleteInspectionPhoto(dossierId: string, inspectionId: string, path: string) {
  const db = createAdminClient();
  const existing = await getInspection(inspectionId);
  if (!existing) return;

  await deleteFile(path);
  await db
    .from("inspections")
    .update({ photos: existing.photos.filter((p) => p !== path) })
    .eq("id", inspectionId);

  revalidatePath(`/dossiers/${dossierId}/inspections/${inspectionId}/edit`);
}

export async function sendInspectionReportEmail(dossierId: string, inspectionId: string) {
  const inspection = await getInspection(inspectionId);
  const email = inspection?.dossiers?.clients?.email as string | undefined;
  const portalToken = inspection?.dossiers?.portal_token as string | undefined;
  const reference = inspection?.dossiers?.reference as string | undefined;

  let status: "sent" | "no-email" | "error" = "sent";

  if (!inspection || !email) {
    status = "no-email";
  } else {
    try {
      const buffer = await renderToBuffer(
        InspectionReport({
          inspection,
          dossierReference: reference ?? "",
          clientNom: `${inspection.dossiers?.clients?.prenom ?? ""} ${inspection.dossiers?.clients?.nom ?? ""}`.trim(),
          offre: inspection.dossiers?.offre ?? null,
        })
      );

      const { subject, html } = rapportDisponibleEmail({
        prenom: inspection.dossiers?.clients?.prenom ?? null,
        reference: reference ?? "",
        typeRapport: "inspection",
        portalUrl: `${getAppUrl()}/suivi/${portalToken}`,
      });

      const result = await sendEmail({
        to: email,
        subject,
        html,
        attachments: [
          { filename: `rapport-inspection-${reference ?? inspectionId}.pdf`, content: buffer.toString("base64") },
        ],
      });
      status = result.ok ? "sent" : "error";

      if (result.ok) {
        await logActivity({
          action: "email.rapport_inspection",
          entiteType: "dossier",
          entiteId: dossierId,
          description: `Rapport d'inspection envoyé par email à ${email}`,
        });
      }
    } catch (err) {
      console.error("Échec génération/envoi du rapport d'inspection:", err);
      status = "error";
    }
  }

  redirect(`/dossiers/${dossierId}/inspections/${inspectionId}?email=${status}`);
}
