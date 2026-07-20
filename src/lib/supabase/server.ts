import "server-only";

// ============================================================================
// Client Supabase pour les Composants Serveur, Server Actions et Route Handlers.
// Utilise la clé ANON : les requêtes restent soumises à la RLS, l'identité de
// l'utilisateur étant portée par les cookies de session.
// ============================================================================
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

type CookieToSet = { name: string; value: string; options: CookieOptions };

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // `setAll` est appelé depuis un Server Component : ignoré.
            // Le rafraîchissement de session est assuré par le middleware.
          }
        },
      },
    }
  );
}
