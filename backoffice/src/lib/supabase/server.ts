import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Client Supabase lié à la session de l'utilisateur connecté (cookies).
 * À utiliser uniquement pour l'authentification (lecture de session, login,
 * logout) — pas pour les requêtes de données, qui passent par le client
 * admin (service role) dans admin.ts.
 */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Appelé depuis un Server Component : le middleware se charge
            // de rafraîchir la session, on peut ignorer l'erreur ici.
          }
        },
      },
    }
  );
}
