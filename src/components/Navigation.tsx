"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { useEffect, useMemo, useRef, useState } from "react";

type UserRole = "admin" | "athlete";

type NavigationLink = {
  href: string;
  label: string;
  icon: React.ReactNode;
  roles?: UserRole[];
};

const navigationLinks: NavigationLink[] = [
  { href: "/dashboard", label: "Início", icon: <HomeIcon /> },
  { href: "/partidas", label: "Partidas", icon: <RacketIcon /> },
  { href: "/classificacao", label: "Classificação", icon: <RankingIcon /> },
  { href: "/temporadas", label: "Temporadas", icon: <CalendarIcon /> },
  { href: "/historico", label: "Histórico", icon: <HistoryIcon /> },
  { href: "/notificacoes", label: "Notificações", icon: <NotificationIcon /> },
  { href: "/admin", label: "Administração", roles: ["admin"], icon: <SettingsIcon /> },
];

function getUserRole(user: User | null): UserRole {
  const appRole = user?.app_metadata?.role;
  const metadataRole = user?.user_metadata?.role;
  return appRole === "admin" || metadataRole === "admin" ? "admin" : "athlete";
}

function getUserName(user: User | null) {
  const metadata = user?.user_metadata;
  const name = metadata?.full_name || metadata?.name || metadata?.display_name || user?.email?.split("@")[0];
  return typeof name === "string" && name.trim() ? name.trim() : "Atleta";
}

function getInitials(name: string) {
  const initials = name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join("");
  return initials || "AS";
}

function isCurrentRoute(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  const supabase = useMemo(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) return null;
    return createBrowserClient(supabaseUrl, supabaseAnonKey);
  }, []);

  const role = getUserRole(user);
  const userName = getUserName(user);
  const userInitials = getInitials(userName);
  const visibleNavigationLinks = navigationLinks.filter((link) => !link.roles || link.roles.includes(role));

  useEffect(() => {
    if (!supabase) {
      setIsLoadingUser(false);
      return;
    }
    let isMounted = true;
    async function loadAuthenticatedUser() {
      const { data: { user: authenticatedUser } } = await supabase.auth.getUser();
      if (isMounted) {
        setUser(authenticatedUser);
        setIsLoadingUser(false);
      }
    }
    void loadAuthenticatedUser();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      setUser(session?.user ?? null);
      setIsLoadingUser(false);
    });
    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsUserMenuOpen(false);
    setLogoutError("");
  }, [pathname]);

  useEffect(() => {
    function closeMenusWithEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setIsMobileMenuOpen(false);
      setIsUserMenuOpen(false);
    }
    document.addEventListener("keydown", closeMenusWithEscape);
    return () => document.removeEventListener("keydown", closeMenusWithEscape);
  }, []);

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileMenuOpen]);

  async function handleSignOut() {
    if (!supabase || isSigningOut) return;
    setIsSigningOut(true);
    setLogoutError("");
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      setIsMobileMenuOpen(false);
      setIsUserMenuOpen(false);
      router.replace("/login");
      router.refresh();
    } catch {
      setLogoutError("Não foi possível sair. Tente novamente.");
    } finally {
      setIsSigningOut(false);
    }
  }

  function renderNavigationLink(link: NavigationLink, mobile = false) {
    const active = isCurrentRoute(pathname, link.href);
    return (
      <Link
        key={link.href}
        href={link.href}
        aria-current={active ? "page" : undefined}
        onClick={() => {
          setIsMobileMenuOpen(false);
          setIsUserMenuOpen(false);
        }}
        className={["flex items-center gap-3 rounded-xl font-medium transition", "focus:outline-none focus:ring-2 focus:ring-emerald-400", mobile ? "px-4 py-3 text-base" : "px-3 py-2 text-sm", active ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-950/20" : "text-slate-300 hover:bg-slate-800 hover:text-white"].join(" ")}
      >
        <span className="shrink-0" aria-hidden="true">{link.icon}</span>
        <span>{link.label}</span>
      </Link>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/95 text-white shadow-lg shadow-black/10 backdrop-blur">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8" aria-label="Navegação principal">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" onClick={() => { setIsMobileMenuOpen((current) => !current); setIsUserMenuOpen(false); }} aria-label={isMobileMenuOpen ? "Fechar menu de navegação" : "Abrir menu de navegação"} aria-expanded={isMobileMenuOpen} aria-controls="mobile-navigation" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-800 text-slate-300 transition hover:border-slate-700 hover:bg-slate-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-400 lg:hidden">
              {isMobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
            <Link href="/dashboard" className="flex min-w-0 items-center gap-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400" aria-label="App Ranking Smash — página inicial">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 font-black text-slate-950 shadow-lg shadow-emerald-950/30">RS</span>
              <span className="hidden min-w-0 sm:block"><span className="block truncate text-sm font-bold text-white">App Ranking Smash</span><span className="block text-xs text-slate-400">Ranking de tênis</span></span>
            </Link>
          </div>
          <div className="hidden items-center gap-1 lg:flex">{visibleNavigationLinks.filter((link) => ["/dashboard", "/partidas", "/classificacao", "/temporadas", "/historico"].includes(link.href)).map((link) => renderNavigationLink(link))}</div>
          <div className="flex items-center gap-2">
            {!isLoadingUser && user && <Link href="/notificacoes" aria-label="Abrir notificações" className={["relative hidden h-10 w-10 items-center justify-center rounded-xl border transition sm:flex", "focus:outline-none focus:ring-2 focus:ring-emerald-400", isCurrentRoute(pathname, "/notificacoes") ? "border-emerald-500 bg-emerald-500 text-slate-950" : "border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800 hover:text-white"].join(" ")}><NotificationIcon /></Link>}
            {isLoadingUser ? <div className="h-10 w-28 animate-pulse rounded-xl bg-slate-800" aria-label="Carregando usuário" /> : user ? <div className="relative">
              <button type="button" onClick={() => { setIsUserMenuOpen((current) => !current); setIsMobileMenuOpen(false); }} aria-expanded={isUserMenuOpen} aria-haspopup="menu" className="flex h-11 items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 px-2 pr-3 transition hover:border-slate-700 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-xs font-extrabold text-slate-950">{userInitials}</span>
                <span className="hidden max-w-36 text-left sm:block"><span className="block truncate text-sm font-semibold text-white">{userName}</span><span className="block text-xs capitalize text-slate-400">{role === "admin" ? "Administrador" : "Atleta"}</span></span>
                <ChevronDownIcon className={`hidden transition-transform sm:block ${isUserMenuOpen ? "rotate-180" : ""}`} />
              </button>
              {isUserMenuOpen && <><button type="button" aria-label="Fechar menu do usuário" onClick={() => setIsUserMenuOpen(false)} className="fixed inset-0 z-40 cursor-default" /><div role="menu" aria-label="Menu do usuário" className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 p-2 shadow-2xl shadow-black/40">
                <div className="border-b border-slate-800 px-3 py-3"><p className="truncate font-semibold text-white">{userName}</p><p className="mt-1 truncate text-sm text-slate-400">{user.email}</p></div>
                <div className="py-2"><Link href="/perfil" role="menuitem" onClick={() => setIsUserMenuOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"><UserIcon />Meu perfil</Link>{role === "admin" && <Link href="/admin" role="menuitem" onClick={() => setIsUserMenuOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"><SettingsIcon />Painel administrativo</Link>}</div>
                {logoutError && <p role="alert" className="mx-2 mb-2 rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{logoutError}</p>}
                <div className="border-t border-slate-800 pt-2"><button type="button" role="menuitem" onClick={handleSignOut} disabled={isSigningOut} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-rose-300 transition hover:bg-rose-500/10 hover:text-rose-200 focus:outline-none focus:ring-2 focus:ring-rose-400 disabled:cursor-not-allowed disabled:opacity-60"><LogoutIcon />{isSigningOut ? "Saindo..." : "Sair da conta"}</button></div>
              </div></>}
            </div> : <div className="flex items-center gap-2"><Link href="/login" className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-400">Entrar</Link><Link href="/cadastro" className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-300">Cadastrar</Link></div>}
          </div>
        </nav>
      </header>
      {isMobileMenuOpen && <div id="mobile-navigation" ref={mobileMenuRef} className="fixed inset-0 z-50 lg:hidden"><button type="button" aria-label="Fechar menu" onClick={() => setIsMobileMenuOpen(false)} className="absolute inset-0 bg-black/70 backdrop-blur-sm" /><aside className="relative flex h-full w-[min(88vw,22rem)] flex-col border-r border-slate-800 bg-slate-950 p-4 text-white shadow-2xl" aria-label="Menu de navegação">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4"><Link href="/dashboard" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 font-black text-slate-950">RS</span><span><span className="block font-bold">Ranking Smash</span><span className="block text-xs text-slate-400">Menu principal</span></span></Link><button type="button" onClick={() => setIsMobileMenuOpen(false)} aria-label="Fechar menu de navegação" className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"><CloseIcon /></button></div>
        {user && <div className="my-4 flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-sm font-extrabold text-slate-950">{userInitials}</span><div className="min-w-0"><p className="truncate font-semibold text-white">{userName}</p><p className="truncate text-xs text-slate-400">{user.email}</p></div></div>}
        <div className="flex-1 space-y-1 overflow-y-auto py-2">{visibleNavigationLinks.map((link) => renderNavigationLink(link, true))}{user && <Link href="/perfil" onClick={() => setIsMobileMenuOpen(false)} className={["flex items-center gap-3 rounded-xl px-4 py-3 text-base font-medium transition", "focus:outline-none focus:ring-2 focus:ring-emerald-400", isCurrentRoute(pathname, "/perfil") ? "bg-emerald-500 text-slate-950" : "text-slate-300 hover:bg-slate-800 hover:text-white"].join(" ")}><UserIcon />Meu perfil</Link>}</div>
        {user && <div className="border-t border-slate-800 pt-4">{logoutError && <p role="alert" className="mb-3 rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{logoutError}</p>}<button type="button" onClick={handleSignOut} disabled={isSigningOut} className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-500/30 px-4 py-3 font-semibold text-rose-300 transition hover:bg-rose-500/10 focus:outline-none focus:ring-2 focus:ring-rose-400 disabled:cursor-not-allowed disabled:opacity-60"><LogoutIcon />{isSigningOut ? "Saindo..." : "Sair da conta"}</button></div>}
      </aside></div>}
    </>
  );
}

type IconProps = { className?: string };
function HomeIcon({ className = "h-5 w-5" }: IconProps) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="m3 11 9-8 9 8v9a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1v-9Z" /></svg>; }
function RacketIcon({ className = "h-5 w-5" }: IconProps) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true"><ellipse cx="14.5" cy="8.5" rx="5.5" ry="7.5" /><path strokeLinecap="round" d="m11 14-8 7m3-1-2-2m8-12 6 6m-8-3 6 6" /></svg>; }
function RankingIcon({ className = "h-5 w-5" }: IconProps) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M4 20V10h4v10H4Zm6 0V4h4v16h-4Zm6 0v-7h4v7h-4Z" /></svg>; }
function CalendarIcon({ className = "h-5 w-5" }: IconProps) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" /><path strokeLinecap="round" d="M8 3v4m8-4v4M3 10h18" /></svg>; }
function HistoryIcon({ className = "h-5 w-5" }: IconProps) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M3 12a9 9 0 1 0 3-6.7L3 8m0-5v5h5m4-1v5l3 2" /></svg>; }
function NotificationIcon({ className = "h-5 w-5" }: IconProps) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Zm-8 12h4" /></svg>; }
function SettingsIcon({ className = "h-5 w-5" }: IconProps) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true"><circle cx="12" cy="12" r="3" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" /></svg>; }
function UserIcon({ className = "h-5 w-5" }: IconProps) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true"><circle cx="12" cy="8" r="4" /><path strokeLinecap="round" strokeLinejoin="round" d="M4 21a8 8 0 0 1 16 0" /></svg>; }
function LogoutIcon({ className = "h-5 w-5" }: IconProps) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M10 5H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h5m5-4 4-3-4-3m4 3H9" /></svg>; }
function MenuIcon({ className = "h-6 w-6" }: IconProps) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true"><path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" /></svg>; }
function CloseIcon({ className = "h-6 w-6" }: IconProps) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true"><path strokeLinecap="round" d="m6 6 12 12M18 6 6 18" /></svg>; }
function ChevronDownIcon({ className = "h-4 w-4" }: IconProps) { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" /></svg>; }
