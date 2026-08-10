import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Client Supabase avec la clé "service role" — contourne RLS.
 * Ne doit JAMAIS être importé dans un composant client ("use client") ni
 * exposé au navigateur : réservé aux Server Components, Server Actions et
 * Route Handlers.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      // Next.js met en cache les appels fetch() par défaut, y compris ceux
      // faits par le client Supabase — sans ça, une donnée mise à jour dans
      // une Server Action (ex. le statut d'un dossier) peut être relue
      // périmée par une action suivante (ex. l'email envoyé juste après).
      global: { fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }) },
    }
  );
}
