import "server-only";

// ============================================================================
// Client Supabase ADMIN (clé service_role).
// ⚠️ CONTOURNE LA RLS. À n'utiliser QUE côté serveur, pour des opérations
// privilégiées explicitement contrôlées :
//   - génération de licences (Super Admin, Module 1)
//   - activation de licence + création du compte entreprise (Module 2)
//   - création de comptes employés par un manager (Module 3)
// Ne JAMAIS importer ce fichier dans un Composant Client.
// ============================================================================
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Variables Supabase manquantes : NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requises."
    );
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
