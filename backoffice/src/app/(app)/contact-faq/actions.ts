"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActorId, logActivity } from "@/lib/log";
import { sendEmail } from "@/lib/email";
import { reponseFaqEmail } from "@/lib/email-templates";

const REPONSE_MAX_LENGTH = 4000;

export async function markContactFaqRead(id: string) {
  const db = createAdminClient();
  await db.from("contacts_faq").update({ lu: true }).eq("id", id);
  revalidatePath("/contact-faq");
}

export async function markAllContactsFaqRead() {
  const db = createAdminClient();
  await db.from("contacts_faq").update({ lu: true }).eq("lu", false);
  revalidatePath("/contact-faq");
}

/**
 * Répond par email à une question posée depuis la FAQ du site vitrine.
 *
 * L'envoi passe avant l'enregistrement, et son issue est stockée avec la
 * réponse. C'est la différence de fond avec la messagerie d'un dossier : là-bas
 * le client retrouve le message dans son portail même si l'email échoue, ici
 * l'email est la seule livraison. Enregistrer une réponse « envoyée » sans
 * vérifier laisserait l'équipe convaincue d'avoir répondu à quelqu'un qui n'a
 * jamais rien reçu — la panne la plus coûteuse de ce back-office, déjà vue
 * avec les notifications push.
 *
 * sendEmail ne lève jamais et renvoie son échec : rien ici ne peut faire
 * perdre la question elle-même.
 */
export async function repondreContactFaq(id: string, formData: FormData) {
  const contenu = String(formData.get("contenu") || "").trim().slice(0, REPONSE_MAX_LENGTH);
  if (!contenu) return;

  const db = createAdminClient();
  const { data: contact } = await db
    .from("contacts_faq")
    .select("id, nom, email, message, lu")
    .eq("id", id)
    .maybeSingle();
  if (!contact) return;

  const { subject, html } = reponseFaqEmail({
    nom: contact.nom,
    question: contact.message,
    reponse: contenu,
  });

  const envoi = await sendEmail({
    to: contact.email,
    subject,
    html,
    // Pour que « Répondre » dans la messagerie du destinataire revienne vers
    // une boîte relevée, et non vers l'adresse d'expédition technique.
    replyTo: process.env.EMAIL_REPLY_TO?.trim() || undefined,
  });

  await db.from("contacts_faq_reponses").insert({
    contact_id: id,
    contenu,
    auteur: await getActorId(),
    email_statut: envoi.ok ? "envoye" : "echec",
    email_erreur: envoi.ok ? null : (envoi.error ?? "Erreur inconnue"),
  });

  // Une question à laquelle on a répondu est forcément lue. En cas d'échec on
  // n'y touche pas : elle doit rester en évidence tant que rien n'est parti.
  if (envoi.ok && !contact.lu) {
    await db.from("contacts_faq").update({ lu: true }).eq("id", id);
  }

  await logActivity({
    action: envoi.ok ? "contact_faq.repondu" : "contact_faq.reponse_echouee",
    entiteType: "contact_faq",
    entiteId: id,
    description: envoi.ok
      ? `Réponse envoyée à ${contact.email}`
      : `Échec de l'envoi de la réponse à ${contact.email} : ${envoi.error ?? "erreur inconnue"}`,
  });

  revalidatePath("/contact-faq");
}
