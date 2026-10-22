"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import type { Database } from "@/types/database";

const links = [
  ["/dashboard", "Início"],
  ["/partidas", "Partidas"],
  ["/classificacao", "Classificação"],
  ["/temporadas", "Temporadas"],
  ["/historico", "Histórico"],
  ["/notificacoes", "Notificações"],
] as const;

function getName(user: User | null): string {
  const metadata = (user?.user_metadata ?? {}) as Record<string, unknown>;
  if (typeof metadata.full_name === "string" && metadata.full_name.trim()) return metadata.full_name;
  if (typeof metadata.name === "string" && metadata.name.trim()) return metadata.name;
  return user?.email?.split("@")[0] ?? "Atleta";
}

function activePath(pathname: string, href: string): boolean {
  return href === "/dashboard" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const supabase = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    return url && key ? createBrowserClient<Database>(url, key) : null;
  }, []);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    const client = supabase;
    let mounted = true;

    void client.auth.getUser().then(({ data }) => {
      if (mounted) {
        setUser(data.user);
        setLoading(false);
      }
    });

    const { data } = client.auth.onAuthStateChange((_event, session) => {
      if (mounted) setUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => setMenuOpen(false), [pathname]);

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
    router.replace("/login");
    router.refresh();
  }

  const name = getName(user);
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part: string) => part.charAt(0))
    .join("")
    .toUpperCase() || "AS";
  const isAdmin = user?.app_metadata?.role === "admin";

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/95 text-white backdrop-blur">
      <nav className="page-container flex min-h-16 items-center justify-between gap-4 py-3" aria-label="Navegação principal">
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => setMenuOpen((value) => !value)} className="rounded-lg border border-slate-700 px-3 py-2 text-sm lg:hidden" aria-expanded={menuOpen}>Menu</button>
          <Link href="/dashboard" className="font-bold">Ranking <span className="text-emerald-400">Smash</span></Link>
        </div>
        <div className="hidden items-center gap-1 lg:flex">
          {links.map(([href, label]) => <Link key={href} href={href} className={`rounded-xl px-3 py-2 text-sm font-semibold ${activePath(pathname, href) ? "bg-emerald-500 text-slate-950" : "text-slate-300 hover:bg-slate-800"}`}>{label}</Link>)}
          {isAdmin && <Link href="/admin" className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800">Administração</Link>}
        </div>
        <div className="flex items-center gap-3">
          {loading ? <span className="h-8 w-20 animate-pulse rounded-lg bg-slate-800" /> : user ? <><Link href="/perfil" className="hidden text-right sm:block"><span className="block text-sm font-semibold">{name}</span><span className="block text-xs text-slate-400">{isAdmin ? "Administrador" : "Atleta"}</span></Link><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500 text-xs font-bold text-slate-950">{initials}</span><button type="button" onClick={signOut} className="hidden rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 sm:block">Sair</button></> : <Link href="/login" className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200">Entrar</Link>}
        </div>
      </nav>
      {menuOpen && <div className="border-t border-slate-800 bg-slate-950 px-4 py-4 lg:hidden"><div className="flex flex-col gap-2">{links.map(([href, label]) => <Link key={href} href={href} onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-300">{label}</Link>)}{isAdmin && <Link href="/admin" onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-300">Administração</Link>}</div>{user && <button type="button" onClick={signOut} className="mt-3 w-full rounded-xl border border-red-500/30 px-3 py-2 text-left text-sm font-semibold text-red-300">Sair da conta</button>}</div>}
    </header>
  );
}
