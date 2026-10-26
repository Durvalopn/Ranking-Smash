import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const ADMIN_EMAIL = "eng.durvalneto@gmail.com";
const AUTH_LOOKUP_CONCURRENCY = 8;

type Profile = { id: string; full_name: string | null };
type Athlete = { user_id: string };

function metadataName(metadata: Record<string, unknown>) {
  for (const key of ["full_name", "name", "display_name"]) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  if (user.email?.trim().toLowerCase() !== ADMIN_EMAIL && user.app_metadata?.role !== "admin") {
    return NextResponse.json({ error: "Acesso permitido somente ao administrador." }, { status: 403 });
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ error: "Consulta administrativa indisponível." }, { status: 503 });
  }

  const { data: athletes, error: athleteError } = await admin.from("athletes").select("user_id");
  if (athleteError) {
    console.error("[admin/athletes/identities] falha ao consultar atletas", { code: athleteError.code });
    return NextResponse.json({ error: "Não foi possível consultar identificações." }, { status: 500 });
  }

  const userIds = [...new Set(((athletes ?? []) as Athlete[]).map((athlete) => athlete.user_id))];
  const profilesById = new Map<string, Profile>();
  if (userIds.length > 0) {
    const { data: profiles, error: profileError } = await admin
      .from("profiles")
      .select("id,full_name")
      .in("id", userIds);
    if (profileError) {
      console.error("[admin/athletes/identities] falha ao consultar perfis", { code: profileError.code });
    } else {
      for (const profile of (profiles ?? []) as Profile[]) profilesById.set(profile.id, profile);
    }
  }

  const identities: Record<string, { name: string; email: string | null }> = {};
  let nextIndex = 0;
  async function resolveAuthUsers() {
    while (nextIndex < userIds.length) {
      const userId = userIds[nextIndex++];
      const profile = profilesById.get(userId);
      const { data, error } = await admin.auth.admin.getUserById(userId);
      if (error) {
        console.error("[admin/athletes/identities] falha ao consultar usuário de autenticação", { code: error.status });
      }

      const authUser = data.user;
      const email = authUser?.email ?? null;
      const name = profile?.full_name?.trim() ||
        (authUser ? metadataName(authUser.user_metadata) : null) ||
        email?.split("@")[0] ||
        `Atleta ${userId.slice(0, 8)}`;
      identities[userId] = { name, email };
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(AUTH_LOOKUP_CONCURRENCY, userIds.length) }, () => resolveAuthUsers()),
  );

  return NextResponse.json({ identities }, { headers: { "Cache-Control": "no-store" } });
}
