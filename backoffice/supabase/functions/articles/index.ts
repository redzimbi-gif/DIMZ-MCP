// Supabase Edge Function — articles ("Actualités") du site vitrine DIMZ
// (autre domaine). Lecture seule : contrairement à "avis" ou "lead-intake",
// aucun visiteur ne crée d'article depuis le site public — ils sont rédigés
// et publiés depuis le back-office (page /actualites). Cette fonction ne
// fait donc que GET : liste les articles publiés (publie = true), avec une
// URL signée (1h) pour chaque image, générée à la volée à chaque appel
// plutôt que stockée : le bucket de stockage est privé (comme le reste du
// stockage DIMZ), pas de bucket public dédié à créer pour autant.
//
// Déploiement (JWT désactivé, comme les autres fonctions publiques) :
//   npx supabase functions deploy articles --project-ref TON-PROJET --no-verify-jwt

import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const BUCKET = "dimz-files";

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
  if (req.method !== "GET") {
    return jsonResponse({ error: "Méthode non supportée" }, 405);
  }

  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data, error } = await db
    .from("articles")
    .select("id, titre, extrait, contenu, image_path, created_at")
    .eq("publie", true)
    .order("created_at", { ascending: false });
  if (error) return jsonResponse({ error: "Erreur de lecture" }, 500);

  const articles = data ?? [];
  const imagePaths = articles.map((a) => a.image_path).filter((p): p is string => Boolean(p));
  const signedUrls: Record<string, string> = {};
  if (imagePaths.length > 0) {
    const { data: signed } = await db.storage.from(BUCKET).createSignedUrls(imagePaths, 3600);
    (signed ?? []).forEach((entry) => {
      if (entry.path && entry.signedUrl) signedUrls[entry.path] = entry.signedUrl;
    });
  }

  return jsonResponse({
    articles: articles.map((a) => ({
      id: a.id,
      titre: a.titre,
      extrait: a.extrait,
      contenu: a.contenu,
      image_url: a.image_path ? signedUrls[a.image_path] ?? null : null,
      created_at: a.created_at,
    })),
  });
});
