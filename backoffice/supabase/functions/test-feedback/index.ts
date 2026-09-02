// Supabase Edge Function — réception du questionnaire de test utilisateur du
// site vitrine DIMZ. Même logique que lead-intake (pas d'authentification,
// appelée par un visiteur anonyme, contourne la protection Vercel).

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

const TEXT_FIELDS = [
  "comprehension_immediate",
  "confiance_site",
  "offres_faciles",
  "tarifs_clairs",
  "navigation_facile",
  "note_design_general",
  "note_professionnalisme",
  "note_logo",
  "note_couleurs",
  "note_lisibilite",
  "note_modernite",
  "ressenti_duree",
  "hesite_abandonner",
  "note_experience_formulaire",
  "offre_choisie",
  "prix_coherents",
  "meilleur_rapport_qualite_prix",
  "utiliserait_dimz",
  "recommanderait_dimz",
  "note_globale",
  "duree_secondes",
  "duree_declaree",
] as const;

const INT_FIELDS = new Set([
  "confiance_site",
  "note_design_general",
  "note_professionnalisme",
  "note_logo",
  "note_couleurs",
  "note_lisibilite",
  "note_modernite",
  "note_experience_formulaire",
  "note_globale",
  "duree_secondes",
]);

const TEXT_FIELD_MAX_LENGTH = 2000;
const BODY_MAX_BYTES = 50_000;

// Limite de fréquence par IP, sur une fenêtre fixe de 10 minutes, pour
// contenir le spam sur ce formulaire public. Compteur en base (fonction
// increment_rate_limit, migration 0040) : incrément atomique, pas de
// condition de course entre deux requêtes simultanées de la même IP.
const RATE_LIMIT = 3;
const RATE_WINDOW_MS = 10 * 60 * 1000;

// deno-lint-ignore no-explicit-any
async function isRateLimited(db: any, ip: string): Promise<boolean> {
  if (Math.random() < 0.05) await db.rpc("cleanup_rate_limits");
  const windowStart = new Date(Math.floor(Date.now() / RATE_WINDOW_MS) * RATE_WINDOW_MS).toISOString();
  const { data: count } = await db.rpc("increment_rate_limit", {
    p_ip: ip,
    p_endpoint: "test-feedback",
    p_window: windowStart,
  });
  return (count ?? 0) > RATE_LIMIT;
}

function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd ? fwd.split(",")[0].trim() : "unknown";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const rawBody = await req.text();
  if (rawBody.length > BODY_MAX_BYTES) {
    return jsonResponse({ error: "Requête trop volumineuse" }, 413);
  }

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(rawBody);
  } catch {
    return jsonResponse({ error: "JSON invalide" }, 400);
  }

  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  if (await isRateLimited(db, getClientIp(req))) {
    return jsonResponse({ error: "Trop de requêtes, réessayez plus tard." }, 429);
  }

  const payload: Record<string, unknown> = {
    donnees_brutes: (data.donnees_brutes && typeof data.donnees_brutes === "object") ? data.donnees_brutes : {},
  };

  for (const field of TEXT_FIELDS) {
    const value = data[field];
    if (value === undefined || value === null || value === "") continue;
    payload[field] = INT_FIELDS.has(field) ? Number(value) : String(value).slice(0, TEXT_FIELD_MAX_LENGTH);
  }

  const { data: created, error } = await db
    .from("test_feedback")
    .insert(payload)
    .select("id, reference")
    .single();

  if (error || !created) {
    return jsonResponse({ error: "Erreur enregistrement" }, 500);
  }

  await db.from("notifications").insert({
    titre: "Nouveau retour de test utilisateur",
    message: created.reference,
    type: "test_feedback",
    lien: `/retours-test/${created.id}`,
  });

  return jsonResponse({ status: "ok", reference: created.reference });
});
