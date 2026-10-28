"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

export default function RedefinirSenhaPage() {
  const [supabase] = useState(() => createClient());
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdated, setIsUpdated] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function checkRecoverySession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!isMounted) return;
      setHasRecoverySession(Boolean(session));
      setIsCheckingSession(false);
    }

    void checkRecoverySession();
    return () => { isMounted = false; };
  }, [supabase]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLoading) return;

    setErrorMessage("");
    if (password.length < 8) {
      setErrorMessage("A senha deve possuir pelo menos 8 caracteres.");
      return;
    }
    if (password !== passwordConfirmation) {
      setErrorMessage("A confirmação não corresponde à nova senha.");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setErrorMessage("Não foi possível alterar a senha. Solicite um novo link e tente novamente.");
        return;
      }
      setIsUpdated(true);
      setPassword("");
      setPasswordConfirmation("");
    } catch {
      setErrorMessage("Ocorreu um erro inesperado. Tente novamente em alguns instantes.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden bg-slate-950 px-4 py-12 text-white">
      <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.16),transparent_35%),radial-gradient(circle_at_85%_70%,rgba(14,165,233,0.10),transparent_30%)]" />
      <section aria-labelledby="reset-password-title" className="relative w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/90 p-6 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-8">
        <p className="text-sm font-bold uppercase tracking-widest text-emerald-400">Ranking Smash</p>
        <h1 id="reset-password-title" className="mt-2 text-3xl font-bold tracking-tight">Nova senha</h1>

        {isCheckingSession ? (
          <p role="status" className="mt-5 text-sm text-slate-400">Validando o link de recuperação...</p>
        ) : isUpdated ? (
          <div className="mt-6 space-y-5">
            <p role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm leading-6 text-emerald-200">Senha alterada com sucesso.</p>
            <Link href="/dashboard" className="flex w-full items-center justify-center rounded-xl bg-emerald-500 px-5 py-3 font-bold text-slate-950 transition hover:bg-emerald-400">Continuar para o Ranking Smash</Link>
          </div>
        ) : !hasRecoverySession ? (
          <div className="mt-5 space-y-5">
            <p role="alert" className="text-sm leading-6 text-slate-400">Este link é inválido ou expirou. Solicite um novo e-mail de recuperação.</p>
            <Link href="/esqueci-minha-senha" className="inline-flex font-semibold text-emerald-400 transition hover:text-emerald-300">Solicitar novo link</Link>
          </div>
        ) : (
          <>
            <p className="mt-3 text-sm leading-6 text-slate-400">Escolha uma senha com pelo menos 8 caracteres.</p>
            {errorMessage && <div role="alert" className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-200">{errorMessage}</div>}
            <form onSubmit={handleSubmit} className="mt-7 space-y-5" noValidate>
              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-200">Nova senha</label>
                <input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} disabled={isLoading} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Pelo menos 8 caracteres" className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 hover:border-slate-600 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60" />
              </div>
              <div>
                <label htmlFor="passwordConfirmation" className="mb-2 block text-sm font-semibold text-slate-200">Confirme a nova senha</label>
                <input id="passwordConfirmation" name="passwordConfirmation" type="password" autoComplete="new-password" required minLength={8} disabled={isLoading} value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} placeholder="Digite a senha novamente" className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 hover:border-slate-600 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60" />
              </div>
              <button type="submit" disabled={isLoading} className="flex w-full items-center justify-center rounded-xl bg-emerald-500 px-5 py-3 font-bold text-slate-950 transition hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-4 focus-visible:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-60">
                {isLoading ? "Salvando..." : "Salvar nova senha"}
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}