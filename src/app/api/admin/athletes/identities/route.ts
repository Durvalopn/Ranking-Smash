import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

const ADMIN_EMAIL = "eng.durvalneto@gmail.com";

export const dynamic = "force-dynamic";

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

function logTechnicalError(context: string, error: unknown) {
  console.error(`[admin/athletes/identities] ${context}`, error);
}

export async function GET() {
  let supabase: Awaited<ReturnType<typeof createClient>>;
  try {
    supabase = await createClient();
  } catch (error) {
    logTechnicalError("falha ao criar cliente server-side", error);
    return NextResponse.json({ error: "Não foi possível validar a sessão." }, { status: 500 });
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) {
    logTechnicalError("falha ao validar autenticação", authError);
    return NextResponse.json({ error: "Não foi possível validar a sessão." }, { status: 500 });
  }
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  if (user.email?.trim().toLowerCase() !== ADMIN_EMAIL && user.app_metadata?.role !== "admin") {
    return NextResponse.json({ error: "Acesso permitido somente ao administrador." }, { status: 403 });
  }

  const { data: athletes, error: athleteError } = await supabase
    .from("athletes")
    .select("id,user_id,current_class,status")
    .order("current_class");
  if (athleteError) {
    logTechnicalError("falha ao consultar atletas com a sessão autenticada e as políticas RLS", athleteError);
    return NextResponse.json(
      { error: "Não foi possível consultar a lista de atletas. Verifique as permissões administrativas." },
      { status: 500 },
    );
  }

  const athleteRows = (athletes ?? []) as Athlete[];
  const userIds = [...new Set(athleteRows.map((athlete) => athlete.user_id))];
  let authUsers: { id: string; user_metadata: Record<string, unknown> }[];
  try {
    const adminClient = createAdminClient();
    const { data, error: usersError } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (usersError) throw usersError;
    authUsers = data.users.map((authUser) => ({
      id: authUser.id,
      user_metadata: authUser.user_metadata ?? {},
    }));
  } catch (error) {
    logTechnicalError("falha ao consultar datas de nascimento nos metadados do Supabase Auth", error);
    return NextResponse.json(
      { error: "Não foi possível consultar as datas de nascimento dos atletas." },
      { status: 500 },
    );
  }
  const birthDates = new Map(
    authUsers.map((authUser) => [
      authUser.id,
      typeof authUser.user_metadata.birth_date === "string" ? authUser.user_metadata.birth_date : null,
    ]),
  );
  const profileNames = new Map<string, string>();
  if (userIds.length > 0) {
    try {
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id,full_name")
        .in("id", userIds);
      if (profileError) {
        logTechnicalError("falha ao consultar nomes em profiles; a lista será mantida", profileError);
      } else {
        for (const profile of (profiles ?? []) as Profile[]) {
          if (profile.full_name?.trim()) profileNames.set(profile.id, profile.full_name.trim());
        }
      }
    } catch (error) {
      logTechnicalError("erro inesperado ao consultar profiles; a lista será mantida", error);
    }
  }

  const currentUserName = metadataName(user.user_metadata) || user.email?.split("@")[0] || null;
  const responseAthletes = athleteRows.map((athlete) => {
    const isCurrentUser = athlete.user_id === user.id;
    return {
      ...athlete,
      status: athlete.status === "ativo" ? "active" : athlete.status,
      birth_date: birthDates.get(athlete.user_id) ?? null,
      name: profileNames.get(athlete.user_id) ||
        (isCurrentUser ? currentUserName : null) ||
        `Atleta ${athlete.user_id.slice(0, 8)}`,
      email: isCurrentUser ? user.email ?? null : null,
    };
  });

  return NextResponse.json(
    { athletes: responseAthletes },
    { headers: { "Cache-Control": "no-store, private" } },
  );
}
