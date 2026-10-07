"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/log";
import { getDossier } from "@/lib/queries";
import { sendEmail, getAppUrl } from "@/lib/email";
import { messageRecuEmail } from "@/lib/email-templates";

const CONTENU_MAX_LENGTH = 4000;

export async function sendMessageStaff(dossierId: string, formData: FormData) {
  const contenu = String(formData.get("contenu") || "").trim().slice(0, CONTENU_MAX_LENGTH);
  if (!contenu) return;

  const dossier = await getDossier(dossierId);
  if (!dossier) return;

  const db = createAdminClient();
  await db.from("messages").insert({ dossier_id: dossierId, auteur: "staff", contenu, lu_par_client: false, lu_par_staff: true });

  await logActivity({
    action: "message.envoye_staff",
    entiteType: "dossier",
    entiteId: dossierId,
    description: `Message envoyé au client pour le dossier ${dossier.reference}`,
  });

  const email = dossier.clients?.email;
  if (email) {
    const { subject, html } = messageRecuEmail({
      prenom: dossier.clients?.prenom ?? null,
      reference: dossier.reference,
      portalUrl: `${getAppUrl()}/suivi/${dossier.portal_token}`,
      contenu,
    });
    const result = await sendEmail({ to: email, subject, html });
    if (result.ok) {
      await logActivity({
        action: "email.message",
        entiteType: "dossier",
        entiteId: dossierId,
        description: `Email de notification de message envoyé à ${email}`,
      });
    }
  }

  revalidatePath(`/dossiers/${dossierId}`);
  revalidatePath("/messagerie");
}
