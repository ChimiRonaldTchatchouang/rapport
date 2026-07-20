import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Middleware racine : rafraîchit la session et protège les routes privées.
export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Toutes les routes sauf les assets statiques et les images.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
