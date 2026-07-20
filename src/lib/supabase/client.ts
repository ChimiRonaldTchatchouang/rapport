"use client";

// ============================================================================
// Client Supabase pour les Composants Client (navigateur).
// Utilise la clé ANON publique : toutes les requêtes sont soumises à la RLS.
// ============================================================================
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
