"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import type { Database } from "@/types/database";

type NavigationItem = { href: string; label: string; roles?: Array<"admin" | "athlete"> };
const items: NavigationItem[] = [
  { href: "/dashboard", label: "Início" },
  { href: "/partidas", label: "Partidas" },
  { href: "/classificacao", label: "Classificação" },
  { href: "/temporadas", label: "Temporadas" },
  { href: "/historico", label: "Histórico" },
  { href: "/notificacoes", label: "Notificações" },
  { href: "/admin", label: "Administração", roles: ["admin"] },
];

function isActive(pathname: string, href: string) {
  return href === "/dashboard" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

function getName(user: User | null) {
  return user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split("@")[0] || "Atleta";
}

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

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
    async function loadUser() {
      const { data } = await client.auth.getUser();
      if (mounted) {
        setUser(data.user);
        setLoading(false);
      }
    }
    void loadUser();
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => setMenuOpen(false), [pathname]);

  async function signOut() {
    if (!supabase || signingOut) return;
    setSigningOut(true);
    await supabase.auth.signOut();
    setUser(null);
    setSigningOut(false);
    router.replace("/login");
    router.refresh();
  }

  const role = user?.app_metadata?.role === "admin" ? "admin" : "athlete";
  const visibleItems = items.filter((item) => !item.roles || item.roles.includes(role));
  const name = getName(user);
  const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "AS";

  function renderItem(item: NavigationItem): ReactNode {
    const active = isActive(pathname, item.href);
    return <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} aria-current={active ? "page" : undefined} className={`rounded-xl px-3 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-emerald-400 ${active ? "bg-emerald-500 text-slate-950" : "text-slate-300 hover:bg-slate-800 hover:text-white"}`}>{item.label}</Link>;
  }

  return <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/95 text-white backdrop-blur"><nav className="page-container flex min-h-16 items-center justify-between gap-4 py-3" aria-label="Navegação principal"><div className="flex items-center gap-4"><button type="button" onClick={() => setMenuOpen((open) => !open)} className="rounded-lg border border-slate-700 px-3 py-2 text-sm lg:hidden" aria-expanded={menuOpen}>Menu</button><Link href="/dashboard" className="font-bold text-white">Ranking <span className="text-emerald-400">Smash</span></Link></div><div className="hidden items-center gap-1 lg:flex">{visibleItems.map(renderItem)}</div><div className="flex items-center gap-3">{loading ? <span className="h-8 w-20 animate-pulse rounded-lg bg-slate-800" /> : user ? <><Link href="/perfil" className="hidden text-right sm:block"><span className="block text-sm font-semibold">{name}</span><span className="block text-xs text-slate-400">{role === "admin" ? "Administrador" : "Atleta"}</span></Link><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500 text-xs font-bold text-slate-950">{initials}</span><button type="button" onClick={signOut} disabled={signingOut} className="hidden rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 sm:block">{signingOut ? "Saindo..." : "Sair"}</button></> : <Link href="/login" className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800">Entrar</Link>}</div></nav>{menuOpen && <div className="border-t border-slate-800 bg-slate-950 px-4 py-4 lg:hidden"><div className="flex flex-col gap-2">{visibleItems.map(renderItem)}</div>{user && <button type="button" onClick={signOut} disabled={signingOut} className="mt-3 w-full rounded-xl border border-red-500/30 px-3 py-2 text-left text-sm font-semibold text-red-300">{signingOut ? "Saindo..." : "Sair da conta"}</button>}</div>}</header>;
}
