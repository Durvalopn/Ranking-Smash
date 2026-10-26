import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { AthleteStatus, Database } from "@/types/database";

const ADMIN_EMAIL = "eng.durvalneto@gmail.com";
const statuses: AthleteStatus[] = ["active", "licensed", "inactive", "pendente"];
type StatusClient = ReturnType<typeof createSupabaseClient<Database>>;

function isAdmin(user: { id: string; email?: string; app_metadata?: Record<string, unknown> }) {
  return user.email?.trim().toLowerCase() === ADMIN_EMAIL || user.app_metadata?.role === "admin";
}

function createUserDataClient(accessToken: string): StatusClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("A configuração pública do Supabase não está disponível no servidor.");
  }

  return createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}

async function hasFirstRoundBeenDrawn(db: StatusClient) {
  const { data: seasons, error: seasonError } = await db
    .from("seasons")
    .select("id,status,created_at")
    .in("status", ["active", "registration"])
    .order("created_at", { ascending: false });
  if (seasonError) throw new Error("Não foi possível verificar a temporada vigente.");

  const season = seasons.find((item) => item.status === "active") ?? seasons[0];
  if (!season) return false;

  const { data: round, error: roundError } = await db
    .from("rounds")
    .select("id,status,drawn_at")
    .eq("season_id", season.id)
    .eq("round_number", 1)
    .maybeSingle();
  if (roundError) throw new Error("Não foi possível verificar o sorteio da primeira rodada.");
  if (!round) return false;
  if (round.drawn_at || round.status === "drawn") return true;

  const { count, error: matchError } = await db
    .from("matches")
    .select("id", { count: "exact", head: true })
    .eq("round_id", round.id);
  if (matchError) throw new Error("Não foi possível verificar o sorteio da primeira rodada.");
  return (count ?? 0) > 0;
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Faça login para alterar seu status." }, { status: 401 });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    return NextResponse.json({ error: "Sua sessão expirou. Entre novamente para alterar o status." }, { status: 401 });
  }

  let body: { status?: unknown; athleteId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }
  if (typeof body.status !== "string" || !statuses.includes(body.status as AthleteStatus)) {
    return NextResponse.json({ error: "Status inválido." }, { status: 400 });
  }
  const status = body.status as AthleteStatus;
  if (body.athleteId !== undefined && typeof body.athleteId !== "string") {
    return NextResponse.json({ error: "Jogador inválido." }, { status: 400 });
  }

  const admin = isAdmin(user);
  if (!admin && status === "inactive") {
    return NextResponse.json({ error: "Somente o administrador pode definir esse status." }, { status: 403 });
  }
  if (!admin && body.athleteId) {
    return NextResponse.json({ error: "Você só pode alterar seu próprio status." }, { status: 403 });
  }

  if (admin && typeof body.athleteId === "string") {
    let db: ReturnType<typeof createAdminClient>;
    try {
      db = createAdminClient();
    } catch (error) {
      console.error("[athlete/status] cliente administrativo indisponível para alterar outro atleta", error);
      return NextResponse.json(
        { error: "A alteração de status de outros atletas requer SUPABASE_SERVICE_ROLE_KEY no servidor." },
        { status: 503 },
      );
    }
    const { data: athlete, error: athleteError } = await db
      .from("athletes")
      .select("id,user_id")
      .eq("id", body.athleteId)
      .maybeSingle();
    if (athleteError || !athlete) {
      return NextResponse.json({ error: "Jogador não encontrado." }, { status: 404 });
    }

    const { error } = await db.from("athletes").update({ status }).eq("id", athlete.id);
    if (error) {
      return NextResponse.json({ error: "Não foi possível atualizar o status do jogador." }, { status: 500 });
    }
    return NextResponse.json({ status });
  }

  let userDb: StatusClient;
  try {
    userDb = createUserDataClient(session.access_token);
  } catch (error) {
    console.error("[athlete/status] cliente autenticado indisponível", error);
    return NextResponse.json(
      { error: "A configuração NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY não está disponível no servidor." },
      { status: 503 },
    );
  }

  const { data: athlete, error: athleteError } = await userDb
    .from("athletes")
    .select("id,user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (athleteError || !athlete) return NextResponse.json({ error: "Jogador não encontrado." }, { status: 404 });

  if (!admin && status === "pendente") {
    try {
      if (await hasFirstRoundBeenDrawn(userDb)) {
        return NextResponse.json({ error: "Pendente só pode ser escolhido antes do sorteio da primeira rodada." }, { status: 409 });
      }
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível validar o status." }, { status: 503 });
    }
  }

  const { data: updatedAthlete, error } = await userDb
    .from("athletes")
    .update({ status })
    .eq("id", athlete.id)
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("[athlete/status] falha ao atualizar status do próprio atleta", {
      code: error.code,
      message: error.message,
    });
    return NextResponse.json({ error: "O banco recusou a alteração de status do atleta." }, { status: 500 });
  }
  if (!updatedAthlete) {
    return NextResponse.json(
      { error: "O banco não permitiu atualizar este atleta. Verifique a política RLS de athletes para o próprio usuário." },
      { status: 403 },
    );
  }
  return NextResponse.json({ status });
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Faça login para consultar seu status." }, { status: 401 });
  if (isAdmin(user)) return NextResponse.json({ canChoosePending: true });
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      return NextResponse.json({ error: "Sua sessão expirou. Entre novamente." }, { status: 401 });
    }
    const userDb = createUserDataClient(session.access_token);
    const canChoosePending = !(await hasFirstRoundBeenDrawn(userDb));
    return NextResponse.json({ canChoosePending });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível validar o status." }, { status: 503 });
  }
}