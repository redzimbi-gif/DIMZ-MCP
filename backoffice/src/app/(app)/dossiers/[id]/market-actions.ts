"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { renderToBuffer } from "@react-pdf/renderer";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDossier, getDossierAnnoncesSelectionnees } from "@/lib/queries";
import { getSignedUrl } from "@/lib/storage";
import { MarketReport } from "@/lib/pdf/MarketReport";
import { sendEmail, getAppUrl } from "@/lib/email";
import { marketDisponibleEmail } from "@/lib/email-templates";
import { logActivity } from "@/lib/log";

export async function updateMarketCommentaire(dossierId: string, formData: FormData) {
  const db = createAdminClient();
  const commentaire = String(formData.get("market_commentaire") || "").trim() || null;
  await db.from("dossiers").update({ market_commentaire: commentaire }).eq("id", dossierId);
  revalidatePath(`/dossiers/${dossierId}`);
}

export async function sendMarketEmail(dossierId: string) {
  const dossier = await getDossier(dossierId);
  const email = dossier?.clients?.email;

  let status: "sent" | "no-email" | "error" = "sent";

  if (!dossier || !email || (dossier.offre !== "copilote" && dossier.offre !== "copilote_plus")) {
    status = "no-email";
  } else {
    try {
      const annonces = await getDossierAnnoncesSelectionnees(dossierId);
      const vehicules = await Promise.all(
        annonces.map(async (a) => ({ ...a, photoUrl: a.photos[0] ? await getSignedUrl(a.photos[0]) : null }))
      );

      const buffer = await renderToBuffer(
        MarketReport({
          offre: dossier.offre,
          vehicules,
          commentaire: dossier.market_commentaire,
          dossierReference: dossier.reference,
          clientNom: `${dossier.clients?.prenom ?? ""} ${dossier.clients?.nom ?? ""}`.trim(),
        })
      );

      const title = dossier.offre === "copilote_plus" ? "Copilote + Market" : "Copilote Market";
      const { subject, html } = marketDisponibleEmail({
        prenom: dossier.clients?.prenom ?? null,
        reference: dossier.reference,
        titre: title,
        portalUrl: `${getAppUrl()}/suivi/${dossier.portal_token}`,
      });

      const result = await sendEmail({
        to: email,
        subject,
        html,
        attachments: [
          { filename: `${title.toLowerCase().replace(/\s+/g, "-")}-${dossier.reference}.pdf`, content: buffer.toString("base64") },
        ],
      });
      status = result.ok ? "sent" : "error";

      if (result.ok) {
        await logActivity({
          action: "email.market",
          entiteType: "dossier",
          entiteId: dossierId,
          description: `${title} envoyé à ${email}`,
        });
      }
    } catch (err) {
      console.error("Échec envoi email Market:", err);
      status = "error";
    }
  }

  redirect(`/dossiers/${dossierId}?tab=vehicules&notif=${status}`);
}
