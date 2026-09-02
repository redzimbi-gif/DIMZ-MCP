// Supabase Edge Function — formulaire de contact de la FAQ du site vitrine.
// Ne nécessite pas de session (à déployer avec la vérification JWT
// désactivée), car appelée par n'importe quel visiteur anonyme.
// Déploiement (JWT désactivé, comme les autres fonctions publiques) :
//   npx supabase functions deploy contact-faq --project-ref TON-PROJET --no-verify-jwt

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

function cap(value: string, max: number): string {
  return value.length > max ? value.slice(0, max) : value;
}

// Limite de fréquence par IP, sur une fenêtre fixe de 10 minutes, pour
// contenir le spam sur ce formulaire public. Compteur en base (fonction
// increment_rate_limit, migration 0040) : incrément atomique, pas de
// condition de course entre deux requêtes simultanées de la même IP.
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 10 * 60 * 1000;

// deno-lint-ignore no-explicit-any
async function isRateLimited(db: any, ip: string): Promise<boolean> {
  if (Math.random() < 0.05) await db.rpc("cleanup_rate_limits");
  const windowStart = new Date(Math.floor(Date.now() / RATE_WINDOW_MS) * RATE_WINDOW_MS).toISOString();
  const { data: count } = await db.rpc("increment_rate_limit", {
    p_ip: ip,
    p_endpoint: "contact-faq",
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
  if (req.method !== "POST") {
    return jsonResponse({ error: "Méthode non supportée" }, 405);
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

  const ip = getClientIp(req);
  if (await isRateLimited(db, ip)) {
    return jsonResponse({ error: "Trop de requêtes, réessayez plus tard." }, 429);
  }

  const nom = typeof data.nom === "string" ? cap(data.nom.trim(), 200) : "";
  const email = typeof data.email === "string" ? cap(data.email.trim(), 254) : "";
  const message = typeof data.message === "string" ? cap(data.message.trim(), 4000) : "";

  if (!nom || !email || !email.includes("@") || !message) {
    return jsonResponse({ error: "Champs invalides" }, 400);
  }

  const { data: created, error } = await db
    .from("contacts_faq")
    .insert({ nom, email, message })
    .select("id")
    .single();

  if (error || !created) {
    return jsonResponse({ error: "Erreur d'enregistrement" }, 500);
  }

  await db.from("notifications").insert({
    titre: `Question FAQ de ${nom}`,
    message: message.slice(0, 140) + (message.length > 140 ? "…" : ""),
    type: "contact_faq",
    lien: "/contact-faq",
  });

  return jsonResponse({ status: "ok" });
});
