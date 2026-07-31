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
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
