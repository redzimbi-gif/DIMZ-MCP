// Supabase Edge Function — intake public des formulaires du site DIMZ.
// Ne nécessite pas de session (à déployer avec la vérification JWT désactivée),
// car appelée par n'importe quel visiteur anonyme du site vitrine.

import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function pick(data: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function guessOffre(label: string | null): string | null {
  if (!label) return null;
  const lower = label.toLowerCase();
  if (lower.includes("découverte")) return "decouverte";
  if (lower.includes("plus")) return "copilote_plus";
  if (lower.includes("copilote")) return "copilote";
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  let data: Record<string, unknown>;
  try {
    data = await req.json();
  } catch {
    return jsonResponse({ error: "JSON invalide" }, 400);
  }

  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const formulaire = pick(data, "Formulaire") || "Accompagnement";
  const isConvoyage = formulaire.toLowerCase() === "convoyage";

  const nom =
    pick(data, "Informations personnelles — Nom") ||
    pick(data, "Le véhicule — Marque") ||
    "Nouveau contact";
  const prenom = pick(data, "Informations personnelles — Prénom");
  const telephone = pick(data, "Informations personnelles — Téléphone", "Le trajet — Téléphone");
  const email = pick(data, "Informations personnelles — Email", "Le trajet — Email");

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
      if (error || !created) return jsonResponse({ error: "Erreur client" }, 500);
      clientId = created.id;
    }
  } else {
    const { data: created, error } = await db
      .from("clients")
      .insert({ nom, prenom, telephone })
      .select("id")
      .single();
    if (error || !created) return jsonResponse({ error: "Erreur client" }, 500);
    clientId = created.id;
  }

  const vehiculeRecherche = isConvoyage
    ? [pick(data, "Le véhicule — Marque"), pick(data, "Le véhicule — Modèle")].filter(Boolean).join(" ") || null
    : pick(data, "Véhicules souhaités — Véhicules ciblés");

  const offreLabel = pick(data, "Projet et délai — Accompagnement recherché");

  const usedKeys = new Set([
    "Informations personnelles — Nom",
    "Informations personnelles — Prénom",
    "Informations personnelles — Téléphone",
    "Informations personnelles — Email",
    "Le trajet — Téléphone",
    "Le trajet — Email",
    "Formulaire",
    "Horodatage",
  ]);
  const remaining = Object.entries(data)
    .filter(([key, value]) => !usedKeys.has(key) && typeof value === "string" && (value as string).trim())
    .map(([key, value]) => `${key} : ${value}`)
    .join("\n");

  const payload = {
    client_id: clientId,
    offre: isConvoyage ? "convoyage_seul" : guessOffre(offreLabel),
    budget: pick(data, "Budget et financement — Budget total envisagé"),
    vehicule_recherche: vehiculeRecherche,
    boite_vitesses: pick(data, "Le véhicule — Transmission"),
    km_max: pick(data, "Votre quotidien — Kilométrage annuel estimé"),
    commentaires: remaining || null,
    source: "site",
    donnees_brutes: data,
  };

  const { data: dossier, error: dossierError } = await db
    .from("dossiers")
    .insert(payload)
    .select("id, reference")
    .single();

  if (dossierError || !dossier) return jsonResponse({ error: "Erreur dossier" }, 500);

  await db.from("dossier_statut_history").insert({
    dossier_id: dossier.id,
    statut: "demande_recue",
  });

  await db.from("notifications").insert({
    titre: `Nouvelle demande : ${formulaire}`,
    message: `${prenom ?? ""} ${nom} — ${dossier.reference}`.trim(),
    type: "nouveau_dossier",
    lien: `/dossiers/${dossier.id}`,
  });

  return jsonResponse({ status: "ok", dossier: dossier.reference });
});
