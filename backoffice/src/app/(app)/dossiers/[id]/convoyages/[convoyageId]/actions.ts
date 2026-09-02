"use server";

import { redirect } from "next/navigation";
import { renderToBuffer } from "@react-pdf/renderer";
import { getConvoyageReportData } from "@/lib/convoyage-report";
import { ConvoyageReport } from "@/lib/pdf/ConvoyageReport";
import { sendEmail, getAppUrl } from "@/lib/email";
import { rapportDisponibleEmail } from "@/lib/email-templates";
import { logActivity } from "@/lib/log";

export async function sendConvoyageReportEmail(dossierId: string, convoyageId: string) {
  const reportData = await getConvoyageReportData(convoyageId);
  const convoyage = reportData?.convoyage;
  const email = convoyage?.dossiers?.clients?.email as string | undefined;
  const portalToken = convoyage?.dossiers?.portal_token as string | undefined;
  const reference = convoyage?.dossiers?.reference as string | undefined;

  let status: "sent" | "no-email" | "error" = "sent";

  if (!reportData || !convoyage || !email) {
    status = "no-email";
  } else {
    try {
      const buffer = await renderToBuffer(
        ConvoyageReport({
          convoyage,
          dossierReference: reference ?? "",
          clientNom: `${convoyage.dossiers?.clients?.prenom ?? ""} ${convoyage.dossiers?.clients?.nom ?? ""}`.trim(),
          entreprise: reportData.entreprise,
          etatsLieux: reportData.etatsLieux,
        })
      );

      const { subject, html } = rapportDisponibleEmail({
        prenom: convoyage.dossiers?.clients?.prenom ?? null,
        reference: reference ?? "",
        typeRapport: "convoyage",
        portalUrl: `${getAppUrl()}/suivi/${portalToken}`,
      });

      const result = await sendEmail({
        to: email,
        subject,
        html,
        attachments: [
          { filename: `rapport-convoyage-${reference ?? convoyageId}.pdf`, content: buffer.toString("base64") },
        ],
      });
      status = result.ok ? "sent" : "error";

      if (result.ok) {
        await logActivity({
          action: "email.rapport_convoyage",
          entiteType: "dossier",
          entiteId: dossierId,
          description: `Rapport de convoyage envoyé par email à ${email}`,
        });
      }
    } catch (err) {
      console.error("Échec génération/envoi du rapport de convoyage:", err);
      status = "error";
    }
  }

  redirect(`/dossiers/${dossierId}/convoyages/${convoyageId}?email=${status}`);
}
