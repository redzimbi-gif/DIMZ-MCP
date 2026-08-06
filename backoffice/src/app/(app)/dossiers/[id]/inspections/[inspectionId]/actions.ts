"use server";

import { redirect } from "next/navigation";
import { renderToBuffer } from "@react-pdf/renderer";
import { getInspection } from "@/lib/queries";
import { InspectionReport } from "@/lib/pdf/InspectionReport";
import { sendEmail, getAppUrl } from "@/lib/email";
import { rapportDisponibleEmail } from "@/lib/email-templates";
import { logActivity } from "@/lib/log";

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
