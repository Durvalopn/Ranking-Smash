import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { AthleteStatus } from "@/types/database";

const ADMIN_EMAIL = "eng.durvalneto@gmail.com";
const statuses: AthleteStatus[] = ["active", "licensed", "inactive", "pendente"];

async function isAdmin(supabase: Awaited<ReturnType<typeof createClient>>, user: { id: string; email?: string; app_metadata?: Record<string, unknown> }) {
  if (user.email?.trim().toLowerCase() === ADMIN_EMAIL || user.app_metadata?.role === "admin") return true;
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
  return (data as { role?: string } | null)?.role?.trim().toLowerCase() === "admin";
}

async function hasFirstRoundBeenDrawn(db: any) {
  const { data: seasons, error: seasonError } = await db
    .from("seasons")
    .select("id,status,created_at")
    .neq("season_type", "finals")
    .in("status", ["active", "registration", "planned", "open", "closed"])
    .order("created_at", { ascending: false });
  if (seasonError) throw new Error("Não foi possível verificar a temporada vigente.");

  const season = seasons?.find((item: { status: string }) => item.status === "open") ?? seasons?.[0];
  if (!season) return false;

  const { data: round, error: roundError } = await db
    .from("rounds")
    .select("id,status,drawn_at")
    .eq("season_id", season.id)
    .eq("round_number", 1)
    .maybeSingle();
  if (roundError) throw new Error("Não foi possível verificar o sorteio da primeira rodada.");
  if (!round) return false;
  if (round.drawn_at || ["drawn", "open", "closed"].includes(round.status)) return true;

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

  let body: { status?: unknown; athleteId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }
  if (typeof body.status !== "string" || !statuses.includes(body.status as AthleteStatus)) {
    return NextResponse.json({ error: "Status inválido." }, { status: 400 });
  }
  if (body.athleteId !== undefined && typeof body.athleteId !== "string") {
    return NextResponse.json({ error: "Jogador inválido." }, { status: 400 });
  }

  const admin = await isAdmin(supabase, user);
  if (!admin && body.status === "inactive") {
    return NextResponse.json({ error: "Somente o administrador pode definir esse status." }, { status: 403 });
  }
  if (!admin && body.athleteId) {
    return NextResponse.json({ error: "Você só pode alterar seu próprio status." }, { status: 403 });
  }

  let db: any;
  try {
    db = createAdminClient();
  } catch {
    return NextResponse.json({ error: "A alteração de status não está disponível no servidor." }, { status: 503 });
  }
  const athleteQuery = db.from("athletes").select("id,user_id");
  const athleteColumn = admin && typeof body.athleteId === "string" ? "id" : "user_id";
  const athleteId = athleteColumn === "id" ? body.athleteId : user.id;
  const { data: athlete, error: athleteError } = await athleteQuery.eq(athleteColumn, athleteId).maybeSingle();
  if (athleteError || !athlete) return NextResponse.json({ error: "Jogador não encontrado." }, { status: 404 });

  if (!admin && body.status === "pendente") {
    try {
      if (await hasFirstRoundBeenDrawn(db)) {
        return NextResponse.json({ error: "Pendente só pode ser escolhido antes do sorteio da primeira rodada." }, { status: 409 });
      }
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível validar o status." }, { status: 503 });
    }
  }

  const { error } = await db.from("athletes").update({ status: body.status }).eq("id", athlete.id);
  if (error) return NextResponse.json({ error: "Não foi possível atualizar o status do jogador." }, { status: 500 });
  return NextResponse.json({ status: body.status });
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Faça login para consultar seu status." }, { status: 401 });
  try {
    const canChoosePending = !(await hasFirstRoundBeenDrawn(createAdminClient() as any));
    return NextResponse.json({ canChoosePending });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível validar o status." }, { status: 503 });
  }
}