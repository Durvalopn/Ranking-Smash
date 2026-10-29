import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const ADMIN_EMAIL = "eng.durvalneto@gmail.com";

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Faça login para alterar a classe." }, { status: 401 });

  const isAdmin = user.email?.trim().toLowerCase() === ADMIN_EMAIL || user.app_metadata?.role === "admin";
  if (!isAdmin) return NextResponse.json({ error: "Acesso permitido somente ao administrador." }, { status: 403 });

  let body: { athleteId?: unknown; currentClass?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }
  if (typeof body.athleteId !== "string" || !body.athleteId) {
    return NextResponse.json({ error: "Jogador inválido." }, { status: 400 });
  }
  if (typeof body.currentClass !== "number" || !Number.isInteger(body.currentClass) || body.currentClass < 1 || body.currentClass > 7) {
    return NextResponse.json({ error: "Classe inválida." }, { status: 400 });
  }

  let adminClient: ReturnType<typeof createAdminClient>;
  try {
    adminClient = createAdminClient();
  } catch {
    return NextResponse.json({ error: "Não foi possível validar a permissão administrativa no servidor." }, { status: 503 });
  }

  const { data: athlete, error } = await adminClient
    .from("athletes")
    .update({ current_class: body.currentClass })
    .eq("id", body.athleteId)
    .select("id")
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: "Não foi possível atualizar a classe do jogador." }, { status: 500 });
  }
  if (!athlete) return NextResponse.json({ error: "Jogador não encontrado." }, { status: 404 });

  return NextResponse.json({ currentClass: body.currentClass });
}