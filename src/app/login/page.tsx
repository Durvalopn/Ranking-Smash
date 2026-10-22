"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function TennisBallIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 64 64" className="h-11 w-11" fill="none">
      <circle cx="32" cy="32" r="28" fill="currentColor" />
      <path d="M10.5 19.5c13 1.5 20.5 9 22 22M53.5 44.5c-13-1.5-20.5-9-22-22" stroke="#052e16" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function EyeIcon({ hidden }: { hidden: boolean }) {
  if (hidden) {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none">
        <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none">
      <path d="m3 3 18 18M10.6 6.2A8.6 8.6 0 0 1 12 6c6 0 9.5 6 9.5 6a16 16 0 0 1-3 3.7M6.2 6.2C3.9 7.8 2.5 12 2.5 12s3.5 6 9.5 6a9 9 0 0 0 3.1-.5M9.9 9.9a3 3 0 0 0 4.2 4.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LoadingIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 animate-spin" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" className="opacity-25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-90" />
    </svg>
  );
}

function getSafeRedirectPath(): string {
  if (typeof window === "undefined") return "/dashboard";
  const requestedPath = new URLSearchParams(window.location.search).get("next");
  if (!requestedPath || !requestedPath.startsWith("/") || requestedPath.startsWith("//") || requestedPath.startsWith("/login") || requestedPath.startsWith("/auth/")) return "/dashboard";
  return requestedPath;
}

function translateAuthError(message: string): string {
  const normalizedMessage = message.toLowerCase();
  if (normalizedMessage.includes("invalid login credentials")) return "E-mail ou senha incorretos.";
  if (normalizedMessage.includes("email not confirmed")) return "Confirme seu e-mail antes de entrar.";
  if (normalizedMessage.includes("too many requests")) return "Muitas tentativas foram realizadas. Aguarde alguns minutos.";
  if (normalizedMessage.includes("failed to fetch") || normalizedMessage.includes("network")) return "Não foi possível conectar ao servidor. Verifique sua internet.";
  return "Não foi possível entrar. Confira os dados e tente novamente.";
}

export default function LoginPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [informationMessage, setInformationMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function checkCurrentSession() {
      const params = new URLSearchParams(window.location.search);
      const message = params.get("mensagem");
      if (message === "senha-alterada") setInformationMessage("Senha alterada com sucesso. Entre com sua nova senha.");
      if (message === "email-confirmado") setInformationMessage("E-mail confirmado com sucesso. Você já pode entrar.");

      const { data: { session } } = await supabase.auth.getSession();
      if (!isMounted) return;
      if (session) {
        router.replace(getSafeRedirectPath());
        router.refresh();
        return;
      }
      setIsCheckingSession(false);
    }

    void checkCurrentSession();
    return () => { isMounted = false; };
  }, [router, supabase]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLoading) return;
    setErrorMessage("");
    setInformationMessage("");
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) { setErrorMessage("Informe seu e-mail."); return; }
    if (!password) { setErrorMessage("Informe sua senha."); return; }
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
      if (error) { setErrorMessage(translateAuthError(error.message)); return; }
      router.replace(getSafeRedirectPath());
      router.refresh();
    } catch {
      setErrorMessage("Ocorreu um erro inesperado. Aguarde alguns instantes e tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }

  if (isCheckingSession) {
    return <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-slate-950 px-4 text-white"><div className="flex items-center gap-3 text-sm text-slate-400" role="status" aria-live="polite"><LoadingIcon />Verificando sua sessão...</div></div>;
  }

  return (
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-slate-950 text-white">
      <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.16),transparent_35%),radial-gradient(circle_at_85%_70%,rgba(14,165,233,0.10),transparent_30%)]" />
      <div aria-hidden="true" className="absolute left-1/2 top-1/3 h-96 w-96 -translate-x-1/2 rounded-full bg-emerald-500/5 blur-3xl" />

      <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-7xl items-center gap-12 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-20">
        <section className="hidden max-w-xl lg:block">
          <Link href="/" className="inline-flex items-center gap-3 rounded-xl text-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-4 focus-visible:ring-offset-slate-950" aria-label="Voltar para a página inicial do Ranking Smash"><TennisBallIcon /><span><strong className="block text-xl text-white">Ranking Smash</strong><span className="text-sm text-slate-400">Sua competição, em um só lugar</span></span></Link>
          <h1 className="mt-12 text-5xl font-black leading-tight tracking-tight">Entre em quadra.<span className="mt-2 block bg-gradient-to-r from-emerald-300 via-emerald-400 to-green-500 bg-clip-text text-transparent">Supere seus limites.</span></h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-slate-300">Acompanhe seus confrontos, registre resultados, consulte a classificação e dispute cada posição no App Ranking Smash.</p>
          <ul className="mt-9 space-y-4 text-slate-300">{["Classificação atualizada por classe", "Confrontos e prazos de cada rodada", "Histórico de partidas e resultados", "Notificações sobre a competição"].map((item) => <li key={item} className="flex items-center gap-3"><span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-sm font-bold text-emerald-400">✓</span>{item}</li>)}</ul>
        </section>

        <section aria-labelledby="login-title" className="mx-auto w-full max-w-md">
          <div className="mb-8 text-center lg:hidden"><Link href="/" className="inline-flex items-center gap-3 rounded-xl text-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400" aria-label="Voltar para a página inicial do Ranking Smash"><TennisBallIcon /><span className="text-left"><strong className="block text-lg text-white">Ranking Smash</strong><span className="text-xs text-slate-400">Sua competição, em um só lugar</span></span></Link></div>
          <div className="rounded-3xl border border-white/10 bg-slate-900/85 p-6 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-8">
            <div><p className="text-sm font-bold uppercase tracking-widest text-emerald-400">Área do atleta</p><h2 id="login-title" className="mt-2 text-3xl font-bold tracking-tight text-white">Acesse sua conta</h2><p className="mt-3 text-sm leading-6 text-slate-400">Informe seu e-mail e sua senha para continuar.</p></div>
            {informationMessage && <div role="status" aria-live="polite" className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm leading-6 text-emerald-200">{informationMessage}</div>}
            {errorMessage && <div role="alert" aria-live="assertive" className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-200">{errorMessage}</div>}
            <form onSubmit={handleSubmit} className="mt-7 space-y-5" noValidate>
              <div><label htmlFor="email" className="mb-2 block text-sm font-semibold text-slate-200">E-mail</label><input id="email" name="email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} required disabled={isLoading} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="seuemail@exemplo.com" className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 hover:border-slate-600 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60" /></div>
              <div><div className="mb-2 flex items-center justify-between gap-4"><label htmlFor="password" className="block text-sm font-semibold text-slate-200">Senha</label><Link href="/esqueci-minha-senha" className="text-sm font-medium text-emerald-400 transition hover:text-emerald-300 hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400">Esqueci minha senha</Link></div><div className="relative"><input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required disabled={isLoading} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Digite sua senha" className="w-full rounded-xl border border-slate-700 bg-slate-950/80 py-3 pl-4 pr-12 text-white outline-none transition placeholder:text-slate-600 hover:border-slate-600 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60" /><button type="button" disabled={isLoading} onClick={() => setShowPassword((current) => !current)} className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-slate-400 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-400 disabled:cursor-not-allowed disabled:opacity-60" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} aria-pressed={showPassword}><EyeIcon hidden={!showPassword} /></button></div></div>
              <button type="submit" disabled={isLoading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 font-bold text-slate-950 transition hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-4 focus-visible:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-60">{isLoading ? <><LoadingIcon />Entrando...</> : "Entrar"}</button>
            </form>
            <div className="mt-7 border-t border-white/10 pt-6 text-center"><p className="text-sm text-slate-400">Ainda não possui uma conta? <Link href="/cadastro" className="font-bold text-emerald-400 transition hover:text-emerald-300 hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400">Cadastre-se</Link></p></div>
          </div>
          <p className="mt-6 text-center text-xs leading-5 text-slate-500">Ao acessar, você declara estar de acordo com os <Link href="/termos" className="text-slate-400 underline underline-offset-2 transition hover:text-white">Termos de Uso</Link> e com a <Link href="/privacidade" className="text-slate-400 underline underline-offset-2 transition hover:text-white">Política de Privacidade</Link>.</p>
        </section>
      </div>
    </div>
  );
}
