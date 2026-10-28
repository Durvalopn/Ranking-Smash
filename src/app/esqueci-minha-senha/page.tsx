"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

function getCallbackErrorMessage(code: string | null): string {
  switch (code) {
    case "link_invalido":
      return "O link de recuperação é inválido ou expirou. Solicite outro e-mail.";
    case "codigo_ausente":
    case "codigo_invalido_ou_expirado":
      return "Não foi possível validar o link. Solicite um novo e-mail de recuperação.";
    case "configuracao_indisponivel":
      return "O serviço de autenticação está indisponível no momento.";
    default:
      return "";
  }
}

export default function EsqueciMinhaSenhaPage() {
  const [supabase] = useState(() => createClient());
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const errorCode = new URLSearchParams(window.location.search).get("erro");
    setErrorMessage(getCallbackErrorMessage(errorCode));
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLoading) return;

    setErrorMessage("");
    setSuccessMessage("");
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setErrorMessage("Informe seu e-mail.");
      return;
    }

    setIsLoading(true);
    try {
      const callbackUrl = new URL("/auth/callback", window.location.origin);
      callbackUrl.searchParams.set("next", "/redefinir-senha");

      const { error } = await supabase.auth.resetPasswordForEmail(
        normalizedEmail,
        { redirectTo: callbackUrl.toString() },
      );

      if (error) {
        const normalizedMessage = error.message.toLowerCase();
        setErrorMessage(
          normalizedMessage.includes("rate limit") ||
            normalizedMessage.includes("too many requests")
            ? "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente."
            : "Não foi possível enviar o e-mail. Confira o endereço e tente novamente.",
        );
        return;
      }

      setSuccessMessage(
        "Se houver uma conta com esse endereço, enviaremos um link para redefinir a senha. Confira também a caixa de spam.",
      );
    } catch {
      setErrorMessage("Ocorreu um erro inesperado. Tente novamente em alguns instantes.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden bg-slate-950 px-4 py-12 text-white">
      <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.16),transparent_35%),radial-gradient(circle_at_85%_70%,rgba(14,165,233,0.10),transparent_30%)]" />
      <section aria-labelledby="forgot-password-title" className="relative w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/90 p-6 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-8">
        <Link href="/login" className="text-sm font-semibold text-emerald-400 transition hover:text-emerald-300">
          Voltar para o login
        </Link>
        <p className="mt-8 text-sm font-bold uppercase tracking-widest text-emerald-400">Ranking Smash</p>
        <h1 id="forgot-password-title" className="mt-2 text-3xl font-bold tracking-tight">Recuperar senha</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Informe o e-mail da sua conta para receber o link de redefinição.
        </p>

        {errorMessage && <div role="alert" className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-200">{errorMessage}</div>}
        {successMessage && <div role="status" className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm leading-6 text-emerald-200">{successMessage}</div>}

        <form onSubmit={handleSubmit} className="mt-7 space-y-5" noValidate>
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-semibold text-slate-200">E-mail</label>
            <input id="email" name="email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} required disabled={isLoading} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="seuemail@exemplo.com" className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 hover:border-slate-600 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60" />
          </div>
          <button type="submit" disabled={isLoading} className="flex w-full items-center justify-center rounded-xl bg-emerald-500 px-5 py-3 font-bold text-slate-950 transition hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-4 focus-visible:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-60">
            {isLoading ? "Enviando..." : "Enviar link de recuperação"}
          </button>
        </form>
      </section>
    </main>
  );
}