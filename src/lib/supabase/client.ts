import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

type BrowserClient = ReturnType<typeof createBrowserClient<Database>>;
let browserClient: BrowserClient | undefined;

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl) throw new Error("A variável NEXT_PUBLIC_SUPABASE_URL não está configurada.");
  if (!supabaseAnonKey) throw new Error("A variável NEXT_PUBLIC_SUPABASE_ANON_KEY não está configurada.");
  if (!browserClient) browserClient = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
  return browserClient;
}
