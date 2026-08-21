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
    let data: Record<string, unknown>;
    try {
      data = await req.json();
    } catch {
      return jsonResponse({ error: "JSON invalide" }, 400);
    }

    const nom = typeof data.nom === "string" ? data.nom.trim() : "";
    const commentaire = typeof data.commentaire === "string" ? data.commentaire.trim() : "";
    const note = Number(data.note);
    const offre = typeof data.offre === "string" && data.offre.trim() ? data.offre.trim() : null;

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
