import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "@/types/database";

/**
 * Cria um cliente Supabase para execução no servidor.
 *
 * Pode ser utilizado em:
 * - Server Components;
 * - Server Actions;
 * - Route Handlers;
 * - páginas e layouts executados no servidor.
 */
export async function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error(
      "A variável NEXT_PUBLIC_SUPABASE_URL não está configurada.",
    );
  }

  if (!supabaseAnonKey) {
    throw new Error(
      "A variável NEXT_PUBLIC_SUPABASE_ANON_KEY não está configurada.",
    );
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },

      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          /*
           * Server Components não podem modificar cookies diretamente.
           * Nesse caso, a atualização da sessão deve ser realizada pelo
           * middleware do Supabase.
           */
        }
      },
    },
  });
}
