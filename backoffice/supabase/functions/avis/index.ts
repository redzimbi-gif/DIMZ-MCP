// Supabase Edge Function — avis clients du site vitrine DIMZ (autre domaine).
// GET  : liste les avis publiés (publie = true) uniquement.
// POST : enregistre un nouvel avis, toujours non publié (publie = false)
//        tant qu'il n'a pas été validé manuellement — aucun avis ne doit
//        pouvoir apparaître sur le site sans passer par cette validation.
// Déploiement (JWT désactivé, comme les autres fonctions publiques) :
//   npx supabase functions deploy avis --project-ref TON-PROJET --no-verify-jwt

import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

const NOM_MAX_LENGTH = 200;
const COMMENTAIRE_MAX_LENGTH = 4000;

// Limite de fréquence par IP, sur une fenêtre fixe de 10 minutes — seul le
// POST écrit en base, le GET (liste publique) reste sans limite. Compteur en
// base (fonction increment_rate_limit, migration 0040) : incrément atomique,
// pas de condition de course entre deux requêtes simultanées de la même IP.
const RATE_LIMIT = 3;
const RATE_WINDOW_MS = 10 * 60 * 1000;

// deno-lint-ignore no-explicit-any
async function isRateLimited(db: any, ip: string): Promise<boolean> {
  if (Math.random() < 0.05) await db.rpc("cleanup_rate_limits");
  const windowStart = new Date(Math.floor(Date.now() / RATE_WINDOW_MS) * RATE_WINDOW_MS).toISOString();
  const { data: count } = await db.rpc("increment_rate_limit", {
    p_ip: ip,
    p_endpoint: "avis",
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

  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  if (req.method === "GET") {
    const { data, error } = await db
      .from("avis")
      .select("nom, note, commentaire, created_at")
      .eq("publie", true)
      .order("created_at", { ascending: false });
    if (error) return jsonResponse({ error: "Erreur de lecture" }, 500);
    return jsonResponse({ avis: data ?? [] });
  }

  if (req.method === "POST") {
    if (await isRateLimited(db, getClientIp(req))) {
      return jsonResponse({ error: "Trop de requêtes, réessayez plus tard." }, 429);
    }

    let data: Record<string, unknown>;
    try {
      data = await req.json();
    } catch {
      return jsonResponse({ error: "JSON invalide" }, 400);
    }

    const nom = typeof data.nom === "string" ? data.nom.trim().slice(0, NOM_MAX_LENGTH) : "";
    const commentaire =
      typeof data.commentaire === "string" ? data.commentaire.trim().slice(0, COMMENTAIRE_MAX_LENGTH) : "";
    const note = Number(data.note);
    const offre = typeof data.offre === "string" && data.offre.trim() ? data.offre.trim().slice(0, 100) : null;

    if (!nom || !commentaire || !Number.isInteger(note) || note < 1 || note > 5) {
      return jsonResponse({ error: "Champs invalides" }, 400);
    }

    const { error } = await db.from("avis").insert({
      nom,
      note,
      commentaire,
      offre,
      publie: false,
    });
    if (error) return jsonResponse({ error: "Erreur d'enregistrement" }, 500);
    return jsonResponse({ status: "ok" });
  }

  return jsonResponse({ error: "Méthode non supportée" }, 405);
});
