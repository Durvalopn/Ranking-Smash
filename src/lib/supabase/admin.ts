import "server-only";

import {
  createClient as createSupabaseClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

import type { Database } from "@/types/database";

let adminClient: SupabaseClient<Database> | undefined;

/**
 * Cria e reutiliza um cliente administrativo do Supabase.
 *
 * ATENÇÃO:
 * - Utiliza a chave service_role;
 * - Ignora as políticas de RLS;
 * - Deve ser usado exclusivamente no servidor;
 * - Nunca deve ser importado por Client Components.
 */
export function createAdminClient(): SupabaseClient<Database> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error(
      "A variável NEXT_PUBLIC_SUPABASE_URL não está configurada.",
    );
  }

  if (!serviceRoleKey) {
    throw new Error(
      "A variável SUPABASE_SERVICE_ROLE_KEY não está configurada.",
    );
  }

  if (!adminClient) {
    adminClient = createSupabaseClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });
  }

  return adminClient;
}
