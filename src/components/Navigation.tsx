"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const ADMIN_EMAIL = "eng.durvalneto@gmail.com";
const links = [["/dashboard", "Início"], ["/partidas", "Partidas"], ["/classificacao", "Classificação"], ["/temporadas", "Temporadas"], ["/historico", "Histórico"], ["/notificacoes", "Notificações"]] as const;
type RoleRow = { role: string | null };
type RoleQueryResult = { data: RoleRow | null; error: { message: string } | null };

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: roleRow } = (await supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle()) as unknown as RoleQueryResult;
      if (mounted) {
        setUserEmail(user.email?.toLowerCase() ?? null);
        setIsAdmin(user.email?.toLowerCase() === ADMIN_EMAIL || roleRow?.role === "admin" || user.app_metadata?.role === "admin");
      }
    };
    void load();
    const { data: subscription } = supabase.auth.onAuthStateChange(() => { void load(); });
    return () => { mounted = false; subscription.subscription.unsubscribe(); };
  }, [supabase]);

  const signOut = async () => { await supabase.auth.signOut(); router.replace("/login"); router.refresh(); };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/95 text-white backdrop-blur">
      <nav className="page-container flex min-h-16 items-center justify-between gap-4 py-3" aria-label="Navegação principal">
        <div className="flex items-center gap-4"><button type="button" onClick={() => setMenuOpen((value) => !value)} className="rounded-lg border border-slate-700 px-3 py-2 text-sm lg:hidden">Menu</button><Link href="/dashboard" className="font-bold">Ranking <span className="text-emerald-400">Smash</span></Link></div>
        <div className="hidden items-center gap-1 lg:flex">{links.map(([href, label]) => <Link key={href} href={href} className={`rounded-xl px-3 py-2 text-sm font-semibold ${pathname === href || pathname.startsWith(`${href}/`) ? "bg-emerald-500 text-slate-950" : "text-slate-300 hover:bg-slate-800"}`}>{label}</Link>)}{isAdmin && <Link href="/admin" className={`rounded-xl px-3 py-2 text-sm font-semibold ${pathname.startsWith("/admin") ? "bg-emerald-500 text-slate-950" : "text-slate-300 hover:bg-slate-800"}`}>Administração</Link>}</div>
        <div className="flex items-center gap-2"><Link href="/perfil" className="hidden text-right sm:block"><span className="block text-sm font-semibold">Minha conta</span><span className="block text-xs text-slate-400">{isAdmin ? "Administrador" : "Atleta"}</span></Link><button type="button" onClick={() => void signOut()} className="hidden rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 sm:block">Sair</button></div>
      </nav>
      {menuOpen && <div className="border-t border-slate-800 bg-slate-950 px-4 py-4 lg:hidden"><div className="page-container flex flex-col gap-2">{links.map(([href, label]) => <Link key={href} href={href} onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800">{label}</Link>)}{isAdmin && <Link href="/admin" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800">Administração</Link>}<button type="button" onClick={() => void signOut()} className="mt-2 rounded-xl border border-red-500/30 px-3 py-2 text-left text-sm font-semibold text-red-300">Sair da conta</button></div></div>}
    </header>
  );
}
