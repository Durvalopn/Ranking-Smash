import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type AdminClient = ReturnType<typeof createSupabaseClient<Database>>;
let adminClient: AdminClient | undefined;

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl) throw new Error("A variável NEXT_PUBLIC_SUPABASE_URL não está configurada.");
  if (!serviceRoleKey) throw new Error("A variável SUPABASE_SERVICE_ROLE_KEY não está configurada.");
  if (!adminClient) {
    adminClient = createSupabaseClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });
  }
  return adminClient;
}
