import Link from "next/link";
import Navigation from "@/components/Navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Meu perfil",
  description: "Visualize seus dados de atleta no Ranking Smash.",
};

type ProfileRecord = {
  full_name: string | null;
};

export default async function PerfilPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = (await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle()) as { data: ProfileRecord | null };

  const fullName = profile?.full_name ?? user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "Atleta";
  const initials = fullName
    .split(/\s+/)
    .slice(0, 2)
    .map((part: string) => part.charAt(0))
    .join("")
    .toUpperCase();

  return (
    <>
      <Navigation />
      <main className="page-container py-10">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8">
            <Link href="/dashboard" className="text-sm text-emerald-400 hover:text-emerald-300">
              ← Voltar ao dashboard
            </Link>
            <h1 className="mt-4 text-3xl font-bold text-white">Meu perfil</h1>
            <p className="mt-2 text-slate-400">Confira os dados da sua conta no Ranking Smash.</p>
          </div>

          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl">
            <div className="flex items-center gap-4 border-b border-slate-800 pb-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-xl font-bold text-slate-950">
                {initials || "AS"}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">{fullName}</h2>
                <p className="text-sm text-slate-400">{user.email}</p>
              </div>
            </div>

            <dl className="mt-6 grid gap-5 sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Nome completo</dt>
                <dd className="mt-1 text-slate-200">{fullName}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">E-mail</dt>
                <dd className="mt-1 break-all text-slate-200">{user.email}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Conta criada em</dt>
                <dd className="mt-1 text-slate-200">{new Date(user.created_at).toLocaleDateString("pt-BR")}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Status</dt>
                <dd className="mt-1 text-emerald-400">Conta confirmada</dd>
              </div>
            </dl>
          </section>
        </div>
      </main>
    </>
  );
}
