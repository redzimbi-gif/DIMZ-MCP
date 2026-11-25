"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { renderToBuffer } from "@react-pdf/renderer";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity, getActorId } from "@/lib/log";
import { getClient, getDocumentCommercial, getEntrepriseInfo } from "@/lib/queries";
import { sendEmail } from "@/lib/email";
import { emailClientPersonnalise } from "@/lib/email-templates";
import { DocumentCommercialPdf } from "@/lib/pdf/DocumentCommercial";
import { downloadFile } from "@/lib/storage";
import {
  MAX_PIECES_JOINTES_BYTES,
  remplirVariablesClient,
  variablesClient,
} from "@/lib/client-email";
import type { ClientType } from "@/lib/types";

export async function createClientRecord(formData: FormData) {
  const db = createAdminClient();

  const typeClient = (String(formData.get("type_client") || "particulier") as ClientType);
  const payload = {
    civilite: String(formData.get("civilite") || "") || null,
    nom: String(formData.get("nom") || "").trim(),
    prenom: String(formData.get("prenom") || "").trim() || null,
    telephone: String(formData.get("telephone") || "").trim() || null,
    email: String(formData.get("email") || "").trim() || null,
    adresse: String(formData.get("adresse") || "").trim() || null,
    type_client: typeClient,
    raison_sociale: typeClient === "professionnel" ? String(formData.get("raison_sociale") || "").trim() || null : null,
    siret: typeClient === "professionnel" ? String(formData.get("siret") || "").trim() || null : null,
  };

  if (!payload.nom) {
    throw new Error("Le nom est obligatoire.");
  }

  const { data, error } = await db.from("clients").insert(payload).select("id").single();
  if (error || !data) throw new Error(error?.message || "Erreur lors de la création du client.");

  await logActivity({
    action: "client.cree",
    entiteType: "client",
    entiteId: data.id,
    description: `Client créé : ${payload.prenom ?? ""} ${payload.nom}`.trim(),
  });

  revalidatePath("/clients");
  redirect(`/clients/${data.id}`);
}

export async function updateClient(id: string, formData: FormData) {
  const db = createAdminClient();

  const typeClient = (String(formData.get("type_client") || "particulier") as ClientType);
  const payload = {
    civilite: String(formData.get("civilite") || "") || null,
    nom: String(formData.get("nom") || "").trim(),
    prenom: String(formData.get("prenom") || "").trim() || null,
    telephone: String(formData.get("telephone") || "").trim() || null,
    email: String(formData.get("email") || "").trim() || null,
    adresse: String(formData.get("adresse") || "").trim() || null,
    notes_privees: String(formData.get("notes_privees") || "").trim() || null,
    type_client: typeClient,
    raison_sociale: typeClient === "professionnel" ? String(formData.get("raison_sociale") || "").trim() || null : null,
    siret: typeClient === "professionnel" ? String(formData.get("siret") || "").trim() || null : null,
  };

  await db.from("clients").update(payload).eq("id", id);
  await logActivity({
    action: "client.modifie",
    entiteType: "client",
    entiteId: id,
    description: `Fiche client mise à jour : ${payload.prenom ?? ""} ${payload.nom}`.trim(),
  });

  revalidatePath(`/clients/${id}`);
  revalidatePath("/clients");
}

export async function deleteClient(clientId: string) {
  const db = createAdminClient();
  const { data: client } = await db.from("clients").select("nom, prenom").eq("id", clientId).maybeSingle();

  await logActivity({
    action: "client.supprime",
    entiteType: "client",
    entiteId: clientId,
    description: `Client supprimé définitivement : ${client?.prenom ?? ""} ${client?.nom ?? ""}`.trim(),
  });

  await db.from("clients").delete().eq("id", clientId);

  revalidatePath("/clients");
  redirect("/clients");
}

export async function addClientNote(clientId: string, formData: FormData) {
  const db = createAdminClient();
  const contenu = String(formData.get("contenu") || "").trim();
  if (!contenu) return;

  const auteur = await getActorId();
  await db.from("notes_internes").insert({ client_id: clientId, contenu, auteur });

  revalidatePath(`/clients/${clientId}`);
}

/**
 * Envoi d'un mail personnalisé à un client, avec les documents et devis cochés
 * dans le composeur en pièces jointes.
 *
 * Deux familles de pièces jointes, récupérées différemment :
 * - `document:<id>` : un fichier du bucket, téléchargé tel quel.
 * - `commercial:<id>` : un devis ou une facture, dont le PDF est **regénéré**
 *   à l'envoi plutôt que lu depuis `pdf_path`. Ce champ peut être vide (le PDF
 *   n'est stocké que par certains flux), et un devis modifié depuis sa dernière
 *   génération doit partir à jour, pas dans sa version périmée.
 *
 * L'envoi d'un devis par ce composeur ne le fait pas passer en « envoyé » et
 * ne touche pas aux étapes du dossier, contrairement à `envoyerDocument` :
 * c'est un mail libre, pas l'envoi officiel du devis. Le bouton dédié de la
 * page Facturation reste la voie pour ça, et la note d'historique dit
 * clairement ce qui est parti.
 */
export async function envoyerEmailClient(clientId: string, formData: FormData) {
  const client = await getClient(clientId);
  if (!client) throw new Error("Client introuvable.");

  const destinataire = String(formData.get("destinataire") || "").trim() || client.email;
  const objetSaisi = String(formData.get("objet") || "").trim();
  const corpsSaisi = String(formData.get("corps") || "").trim();

  if (!destinataire) {
    redirect(`/clients/${clientId}?notif=client-no-email`);
  }
  if (!objetSaisi || !corpsSaisi) {
    throw new Error("L'objet et le message du mail sont obligatoires.");
  }

  const entreprise = await getEntrepriseInfo();
  const variables = variablesClient(client, entreprise);
  const objet = remplirVariablesClient(objetSaisi, variables);
  const corps = remplirVariablesClient(corpsSaisi, variables);

  const cles = formData.getAll("pieces").map(String).filter(Boolean);

  let attachments: { filename: string; content: string }[];
  try {
    attachments = await construirePiecesJointes(clientId, cles);
  } catch (error) {
    console.error("Pièces jointes du mail client", error);
    const message = error instanceof Error ? error.message : "Pièces jointes illisibles.";
    redirect(`/clients/${clientId}?notif=client-error&error=${encodeURIComponent(message)}`);
  }

  const { subject, html } = emailClientPersonnalise({
    objet,
    corps,
    piecesJointes: attachments.map((a) => a.filename),
  });

  const envoi = await sendEmail({
    to: destinataire,
    subject,
    html,
    // Une réponse du client doit arriver dans une boîte relevée, pas sur
    // l'adresse d'envoi technique de Resend.
    replyTo: entreprise?.email ?? undefined,
    attachments: attachments.length > 0 ? attachments : undefined,
  });
  if (!envoi.ok) {
    redirect(`/clients/${clientId}?notif=client-error`);
  }

  const db = createAdminClient();

  // Une adresse saisie dans le composeur alors que la fiche n'en a pas est
  // conservée, sinon elle serait à retrouver au prochain envoi.
  if (!client.email) {
    await db.from("clients").update({ email: destinataire }).eq("id", clientId);
  }

  if (formData.get("note")) {
    const auteur = await getActorId();
    const pieces =
      attachments.length > 0 ? ` — pièces jointes : ${attachments.map((a) => a.filename).join(", ")}` : "";
    await db.from("notes_internes").insert({
      client_id: clientId,
      contenu: `Mail envoyé à ${destinataire} — « ${subject} »${pieces}`,
      auteur,
    });
  }

  await logActivity({
    action: "client.email_envoye",
    entiteType: "client",
    entiteId: clientId,
    description: `Mail envoyé à ${destinataire} (« ${subject} », ${attachments.length} pièce(s) jointe(s))`,
  });

  revalidatePath(`/clients/${clientId}`);
  redirect(`/clients/${clientId}?notif=client-sent`);
}

/**
 * Transforme les clés cochées dans le composeur en pièces jointes base64.
 *
 * Chaque clé est revérifiée contre le client : sans ça, une clé forgée
 * permettrait de joindre le document d'un autre client à un mail. Un fichier
 * introuvable lève une erreur nommant le fichier plutôt que d'être ignoré en
 * silence — un devis manquant dans un mail « voici votre devis » est pire
 * qu'un envoi refusé.
 */
async function construirePiecesJointes(
  clientId: string,
  cles: string[]
): Promise<{ filename: string; content: string }[]> {
  if (cles.length === 0) return [];

  const db = createAdminClient();
  const attachments: { filename: string; content: string }[] = [];
  let total = 0;

  for (const cle of cles) {
    const [categorie, id] = cle.split(":");

    if (categorie === "document") {
      const { data: doc } = await db
        .from("documents")
        .select("nom, storage_path, client_id")
        .eq("id", id)
        .maybeSingle();
      if (!doc || doc.client_id !== clientId) {
        throw new Error("Un document sélectionné n'appartient pas à ce client.");
      }
      const buffer = await downloadFile(doc.storage_path);
      if (!buffer) throw new Error(`Le fichier « ${doc.nom} » n'a pas pu être téléchargé.`);
      total += buffer.length;
      attachments.push({ filename: nomFichier(doc.nom, doc.storage_path), content: buffer.toString("base64") });
      continue;
    }

    if (categorie === "commercial") {
      const doc = await getDocumentCommercial(id);
      if (!doc || doc.client_id !== clientId) {
        throw new Error("Un devis ou une facture sélectionné n'appartient pas à ce client.");
      }
      const buffer = await renderToBuffer(
        DocumentCommercialPdf({
          doc,
          clientNom: `${doc.clients?.prenom ?? ""} ${doc.clients?.nom ?? ""}`.trim(),
          clientAdresse: doc.clients?.adresse ?? null,
          clientRaisonSociale:
            doc.clients?.type_client === "professionnel" ? doc.clients?.raison_sociale : null,
          clientSiret: doc.clients?.type_client === "professionnel" ? doc.clients?.siret : null,
          entreprise: await getEntrepriseInfo(),
        })
      );
      total += buffer.length;
      attachments.push({
        filename: `${doc.type}-${doc.numero}.pdf`,
        content: buffer.toString("base64"),
      });
      continue;
    }

    throw new Error("Pièce jointe inconnue.");
  }

  if (total > MAX_PIECES_JOINTES_BYTES) {
    const mo = (total / (1024 * 1024)).toFixed(1).replace(".", ",");
    throw new Error(
      `Les pièces jointes pèsent ${mo} Mo au total, au-delà de la limite de 40 Mo. Décoche quelques fichiers.`
    );
  }

  return attachments;
}

/**
 * Nom du fichier joint : le nom saisi dans le back-office, avec l'extension du
 * fichier stocké si elle manque. Sans ça, « Carte grise » arrive sans
 * extension et certains clients de messagerie refusent de l'ouvrir.
 */
function nomFichier(nom: string, storagePath: string): string {
  const base = nom.trim() || "document";
  if (/\.[a-z0-9]{2,5}$/i.test(base)) return base;
  const ext = storagePath.match(/\.([a-z0-9]{2,5})$/i)?.[1];
  return ext ? `${base}.${ext}` : base;
}
