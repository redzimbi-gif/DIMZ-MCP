import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyStaff } from "@/lib/log";
import { sendEmail, getAppUrl } from "@/lib/email";
import { confirmationDemandeEmail } from "@/lib/email-templates";
import type { DossierOffre } from "@/lib/types";

// Endpoint public appelé directement depuis le site vitrine DIMZ (autre
// domaine) à chaque soumission d'un formulaire. Aucune authentification :
// c'est une intake volontairement ouverte, protégée uniquement par le fait
// qu'elle ne fait qu'écrire des dossiers, jamais en lire.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

function pick(data: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function guessOffre(label: string | null): DossierOffre | null {
  if (!label) return null;
  const lower = label.toLowerCase();
  if (lower.includes("découverte")) return "decouverte";
  if (lower.includes("plus")) return "copilote_plus";
  if (lower.includes("copilote")) return "copilote";
  return null;
}

export async function POST(request: Request) {
  let data: Record<string, unknown>;
  try {
    data = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400, headers: CORS_HEADERS });
  }

  const db = createAdminClient();

  const formulaire = pick(data, "Formulaire") || "Accompagnement";
  const isConvoyage = formulaire.toLowerCase() === "convoyage";

  const nom =
    pick(data, "Informations personnelles — Nom") ||
    pick(data, "Le trajet — Nom (contact départ)") ||
    pick(data, "Le véhicule — Marque") ||
    "Nouveau contact";
  const prenom = pick(data, "Informations personnelles — Prénom", "Le trajet — Prénom (contact départ)");
  const telephone = pick(data, "Informations personnelles — Téléphone", "Le trajet — Téléphone (contact départ)");
  const email = pick(data, "Informations personnelles — Email", "Le trajet — Email (contact départ)");

  // Rattache à un client existant par email si possible, sinon en crée un.
  let clientId: string;
  if (email) {
    const { data: existing } = await db
      .from("clients")
      .select("id")
      .ilike("email", email)
      .maybeSingle();
    if (existing) {
      clientId = existing.id;
      await db.from("clients").update({ nom, prenom, telephone, email }).eq("id", clientId);
    } else {
      const { data: created, error } = await db
        .from("clients")
        .insert({ nom, prenom, telephone, email })
        .select("id")
        .single();
      if (error || !created) {
        return NextResponse.json({ error: "Erreur client" }, { status: 500, headers: CORS_HEADERS });
      }
      clientId = created.id;
    }
  } else {
    const { data: created, error } = await db
      .from("clients")
      .insert({ nom, prenom, telephone })
      .select("id")
      .single();
    if (error || !created) {
      return NextResponse.json({ error: "Erreur client" }, { status: 500, headers: CORS_HEADERS });
    }
    clientId = created.id;
  }

  const vehiculeRecherche = isConvoyage
    ? [pick(data, "Le véhicule — Marque"), pick(data, "Le véhicule — Modèle")].filter(Boolean).join(" ") || null
    : pick(data, "Véhicules souhaités — Véhicules ciblés");

  const offreLabel = pick(data, "Projet et délai — Accompagnement recherché");

  // Le détail complet de la soumission est conservé dans donnees_brutes et
  // affiché de façon structurée dans le back-office ; "commentaires" reste
  // un champ de notes libres pour l'équipe, pas un déversoir des réponses.
  const payload = {
    client_id: clientId,
    offre: isConvoyage ? ("convoyage_seul" as DossierOffre) : guessOffre(offreLabel),
    budget: pick(data, "Budget et financement — Budget total envisagé"),
    vehicule_recherche: vehiculeRecherche,
    boite_vitesses: pick(data, "Le véhicule — Transmission"),
    km_max: pick(data, "Votre quotidien — Kilométrage annuel estimé"),
    commentaires: null,
    source: "site",
    donnees_brutes: data,
  };

  const { data: dossier, error: dossierError } = await db
    .from("dossiers")
    .insert(payload)
    .select("id, reference, portal_token")
    .single();

  if (dossierError || !dossier) {
    return NextResponse.json({ error: "Erreur dossier" }, { status: 500, headers: CORS_HEADERS });
  }

  await db.from("dossier_statut_history").insert({
    dossier_id: dossier.id,
    statut: "demande_recue",
  });

  await notifyStaff({
    titre: `Nouvelle demande : ${formulaire}`,
    message: `${prenom ?? ""} ${nom} — ${dossier.reference}`.trim(),
    type: "nouveau_dossier",
    lien: `/dossiers/${dossier.id}`,
  });

  // Confirmation envoyée au client si on a son email ; un échec d'envoi ne
  // doit jamais faire échouer la création du dossier.
  if (email) {
    const { subject, html } = confirmationDemandeEmail({
      prenom,
      reference: dossier.reference,
      portalUrl: `${getAppUrl()}/suivi/${dossier.portal_token}`,
    });
    await sendEmail({ to: email, subject, html });
  }

  return NextResponse.json(
    { status: "ok", dossier: dossier.reference },
    { headers: CORS_HEADERS }
  );
}
