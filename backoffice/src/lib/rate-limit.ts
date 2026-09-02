import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Limite de fréquence par IP pour les routes publiques non authentifiées
// (src/app/api/public/**), sur une fenêtre fixe de 10 minutes. Compteur en
// base (fonction increment_rate_limit, migration 0040) : incrément
// atomique, pas de condition de course entre deux requêtes simultanées de
// la même IP. Même mécanisme que celui dupliqué dans les Edge Functions
// Supabase (qui ne peuvent pas importer ce module, déployées comme fichiers
// autonomes).
const RATE_WINDOW_MS = 10 * 60 * 1000;

export function getClientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  return fwd ? fwd.split(",")[0].trim() : "unknown";
}

export async function isRateLimited(endpoint: string, ip: string, limit: number): Promise<boolean> {
  const db = createAdminClient();
  if (Math.random() < 0.05) await db.rpc("cleanup_rate_limits");
  const windowStart = new Date(Math.floor(Date.now() / RATE_WINDOW_MS) * RATE_WINDOW_MS).toISOString();
  const { data: count } = await db.rpc("increment_rate_limit", {
    p_ip: ip,
    p_endpoint: endpoint,
    p_window: windowStart,
  });
  return (count ?? 0) > limit;
}
