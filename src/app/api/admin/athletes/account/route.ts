import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const ADMIN_EMAIL = "eng.durvalneto@gmail.com";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type AdminContext =
  | { error: NextResponse }
  | { adminClient: ReturnType<typeof createAdminClient>; adminUserId: string };

async function authorize(): Promise<AdminContext> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Faça login para continuar." }, { status: 401 }) };
  const isAdmin = user.email?.trim().toLowerCase() === ADMIN_EMAIL || user.app_metadata?.role === "admin";
  if (!isAdmin) return { error: NextResponse.json({ error: "Acesso permitido somente ao administrador." }, { status: 403 }) };
  try {
    return { adminClient: createAdminClient(), adminUserId: user.id };
  } catch {
    return { error: NextResponse.json({ error: "Não foi possível validar a permissão administrativa no servidor." }, { status: 503 }) };
  }
}

async function readBody(request: Request) {
  try {
    return await request.json() as { athleteId?: unknown; email?: unknown };
  } catch {
    return null;
  }
}

export async function PATCH(request: Request) {
  const context = await authorize();
  if ("error" in context) return context.error;
  const body = await readBody(request);
  if (!body || typeof body.athleteId !== "string" || !body.athleteId) {
    return NextResponse.json({ error: "Jogador inválido." }, { status: 400 });
  }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!EMAIL_PATTERN.test(email)) return NextResponse.json({ error: "Informe um e-mail válido." }, { status: 400 });

  const { adminClient } = context;
  const { data: athlete } = await adminClient.from("athletes").select("user_id").eq("id", body.athleteId).maybeSingle();
  if (!athlete) return NextResponse.json({ error: "Jogador não encontrado." }, { status: 404 });

  const { error: authError } = await adminClient.auth.admin.updateUserById(athlete.user_id, { email, email_confirm: true });
  if (authError) {
    console.error("[admin/athletes/account] falha ao alterar e-mail no Auth", authError);
    return NextResponse.json({ error: "Não foi possível alterar o e-mail. Verifique se ele já está em uso." }, { status: 409 });
  }
  const { error: profileError } = await adminClient.from("profiles").update({ email }).eq("id", athlete.user_id);
  if (profileError) console.error("[admin/athletes/account] falha ao sincronizar e-mail em profiles", profileError);

  return NextResponse.json({ email });
}

export async function DELETE(request: Request) {
  const context = await authorize();
  if ("error" in context) return context.error;
  const body = await readBody(request);
  if (!body || typeof body.athleteId !== "string" || !body.athleteId) {
    return NextResponse.json({ error: "Jogador inválido." }, { status: 400 });
  }

  const { adminClient, adminUserId } = context;
  const { data: athlete } = await adminClient.from("athletes").select("id,user_id").eq("id", body.athleteId).maybeSingle();
  if (!athlete) return NextResponse.json({ error: "Jogador não encontrado." }, { status: 404 });
  if (athlete.user_id === adminUserId) {
    return NextResponse.json({ error: "Não é possível excluir a própria conta de administrador." }, { status: 400 });
  }

  const { count, error: matchError } = await adminClient
    .from("matches")
    .select("id", { count: "exact", head: true })
    .or(`athlete_one_id.eq.${athlete.id},athlete_two_id.eq.${athlete.id}`);
  if (matchError) return NextResponse.json({ error: "Não foi possível verificar as partidas do jogador." }, { status: 500 });
  if ((count ?? 0) > 0) {
    return NextResponse.json({ error: "Este jogador já possui partidas e não pode ser excluído." }, { status: 409 });
  }

  const { error: athleteError } = await adminClient.from("athletes").delete().eq("id", athlete.id);
  if (athleteError) {
    console.error("[admin/athletes/account] falha ao excluir atleta", athleteError);
    return NextResponse.json({ error: "Não foi possível excluir o jogador." }, { status: 500 });
  }
  const { error: userError } = await adminClient.auth.admin.deleteUser(athlete.user_id);
  if (userError) {
    console.error("[admin/athletes/account] falha ao excluir usuário no Auth", userError);
    return NextResponse.json({ error: "Jogador removido, mas não foi possível excluir o login. Exclua-o no painel do Supabase." }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}
