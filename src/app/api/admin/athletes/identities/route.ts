import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

const ADMIN_EMAIL = "eng.durvalneto@gmail.com";
const AUTH_LOOKUP_CONCURRENCY = 8;

type Athlete = Omit<
  Pick<Database["public"]["Tables"]["athletes"]["Row"], "id" | "user_id" | "current_class" | "status">,
  "status"
> & { status: string };
type Profile = Pick<Database["public"]["Tables"]["profiles"]["Row"], "id" | "full_name">;

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

  const { data: athletes, error: athleteError } = await admin
    .from("athletes")
    .select("id,user_id,current_class,status")
    .order("current_class");
  if (athleteError) {
    console.error("[admin/athletes/identities] falha ao consultar atletas", {
      code: athleteError.code,
      message: athleteError.message,
      details: athleteError.details,
      hint: athleteError.hint,
    });
    return NextResponse.json({ error: "Não foi possível consultar identificações." }, { status: 500 });
  }

  const athleteRows = (athletes ?? []) as Athlete[];
  const userIds = [...new Set(athleteRows.map((athlete) => athlete.user_id))];
  const profileNames = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: profiles, error: profileError } = await admin
      .from("profiles")
      .select("id,full_name")
      .in("id", userIds);
    if (profileError) {
      console.error("[admin/athletes/identities] falha ao consultar perfis", {
        code: profileError.code,
        message: profileError.message,
        details: profileError.details,
        hint: profileError.hint,
      });
    } else {
      for (const profile of (profiles ?? []) as Profile[]) {
        if (profile.full_name?.trim()) profileNames.set(profile.id, profile.full_name.trim());
      }
    }
  }

  const identities: Record<string, { name: string; email: string | null }> = {};
  let nextIndex = 0;
  async function resolveAuthUsers() {
    while (nextIndex < userIds.length) {
      const userId = userIds[nextIndex++];
      let email: string | null = null;
      try {
        const { data, error } = await admin.auth.admin.getUserById(userId);
        if (error) {
          console.error("[admin/athletes/identities] falha ao consultar usuário de autenticação", {
            status: error.status,
            message: error.message,
          });
        } else {
          email = data.user.email ?? null;
          identities[userId] = {
            name: profileNames.get(userId) ||
              metadataName(data.user.user_metadata) ||
              email?.split("@")[0] ||
              `Atleta ${userId.slice(0, 8)}`,
            email,
          };
        }
      } catch (error) {
        console.error("[admin/athletes/identities] falha ao consultar usuário de autenticação", {
          message: error instanceof Error ? error.message : "Erro desconhecido",
        });
      }
      if (!identities[userId]) {
        identities[userId] = {
          name: profileNames.get(userId) || `Atleta ${userId.slice(0, 8)}`,
          email,
        };
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(AUTH_LOOKUP_CONCURRENCY, userIds.length) }, () => resolveAuthUsers()),
  );

  const responseAthletes = athleteRows.map((athlete) => ({
    ...athlete,
    status: athlete.status === "ativo" ? "active" : athlete.status,
    ...identities[athlete.user_id],
  }));
  return NextResponse.json(
    { athletes: responseAthletes },
    { headers: { "Cache-Control": "no-store, private" } },
  );
}
