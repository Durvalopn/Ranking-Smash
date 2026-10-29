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
type Profile = Pick<Database["public"]["Tables"]["profiles"]["Row"], "id" | "email" | "full_name" | "phone">;

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

  let adminClient: ReturnType<typeof createAdminClient>;
  try {
    adminClient = createAdminClient();
  } catch (error) {
    logTechnicalError("falha ao criar cliente administrativo", error);
    return NextResponse.json(
      { error: "Não foi possível consultar a lista administrativa de atletas." },
      { status: 500 },
    );
  }

  const { data: athletes, error: athleteError } = await adminClient
    .from("athletes")
    .select("id,user_id,current_class,status")
    .order("current_class");
  if (athleteError) {
    logTechnicalError("falha ao consultar atletas", athleteError);
    return NextResponse.json(
      { error: "Não foi possível consultar a lista de atletas. Verifique as permissões administrativas." },
      { status: 500 },
    );
  }

  const athleteRows = (athletes ?? []) as Athlete[];
  const userIds = [...new Set(athleteRows.map((athlete) => athlete.user_id))];
  let authUsers: { id: string; email: string | null; user_metadata: Record<string, unknown> }[] = [];
  let birthDateWarning: string | null = null;
  try {
    const { data, error: usersError } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (usersError) throw usersError;
    authUsers = data.users.map((authUser) => ({
      id: authUser.id,
      email: authUser.email ?? null,
      user_metadata: authUser.user_metadata ?? {},
    }));
  } catch (error) {
    logTechnicalError("falha ao consultar datas de nascimento nos metadados do Supabase Auth", error);
    birthDateWarning = "Não foi possível consultar as idades; o desempate etário não foi aplicado nesta rodada.";
  }
  const birthDates = new Map(
    authUsers.map((authUser) => [
      authUser.id,
      typeof authUser.user_metadata.birth_date === "string" ? authUser.user_metadata.birth_date : null,
    ]),
  );
  const authUserById = new Map(authUsers.map((authUser) => [authUser.id, authUser]));
  const profileNames = new Map<string, string>();
  const profileContacts = new Map<string, { email: string; phone: string | null }>();
  if (userIds.length > 0) {
    try {
      const { data: profiles, error: profileError } = await adminClient
        .from("profiles")
        .select("id,email,full_name,phone")
        .in("id", userIds);
      if (profileError) {
        logTechnicalError("falha ao consultar nomes em profiles; a lista será mantida", profileError);
      } else {
        for (const profile of (profiles ?? []) as Profile[]) {
          if (profile.full_name?.trim()) profileNames.set(profile.id, profile.full_name.trim());
          profileContacts.set(profile.id, { email: profile.email, phone: profile.phone });
        }
      }
    } catch (error) {
      logTechnicalError("erro inesperado ao consultar profiles; a lista será mantida", error);
    }
  }

  const currentUserName = metadataName(user.user_metadata) || user.email?.split("@")[0] || null;
  const responseAthletes = athleteRows.map((athlete) => {
    const isCurrentUser = athlete.user_id === user.id;
    const authUser = authUserById.get(athlete.user_id);
    return {
      ...athlete,
      status: athlete.status === "ativo" ? "active" : athlete.status,
      birth_date: birthDates.get(athlete.user_id) ?? null,
      phone: typeof authUser?.user_metadata.phone === "string"
        ? authUser.user_metadata.phone
        : profileContacts.get(athlete.user_id)?.phone ?? null,
      name: profileNames.get(athlete.user_id) ||
        metadataName(authUser?.user_metadata ?? {}) ||
        (isCurrentUser ? currentUserName : null) ||
        `Atleta ${athlete.user_id.slice(0, 8)}`,
      email: authUser?.email || profileContacts.get(athlete.user_id)?.email || null,
    };
  });
  if (!birthDateWarning) {
    const missingBirthDates = responseAthletes.filter((athlete) => !athlete.birth_date).length;
    if (missingBirthDates > 0) {
      birthDateWarning = `${missingBirthDates} atleta(s) sem data de nascimento; o desempate etário não foi aplicado para eles.`;
    }
  }

  return NextResponse.json(
    { athletes: responseAthletes, warning: birthDateWarning },
    { headers: { "Cache-Control": "no-store, private" } },
  );
}
