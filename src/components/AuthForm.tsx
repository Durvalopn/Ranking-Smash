"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

type AuthMode = "login" | "register";

type AuthFormProps = {
  mode?: AuthMode;
};

type Feedback = {
  type: "error" | "success";
  message: string;
} | null;

function translateAuthError(message: string) {
  const normalizedMessage = message.toLowerCase();

  if (
    normalizedMessage.includes("invalid login credentials") ||
    normalizedMessage.includes("invalid credentials")
  ) {
    return "E-mail ou senha inválidos.";
  }

  if (normalizedMessage.includes("email not confirmed")) {
    return "Confirme seu e-mail antes de entrar.";
  }

  if (
    normalizedMessage.includes("user already registered") ||
    normalizedMessage.includes("already been registered")
  ) {
    return "Já existe uma conta cadastrada com este e-mail.";
  }

  if (normalizedMessage.includes("password should be at least")) {
    return "A senha deve possuir pelo menos 8 caracteres.";
  }

  if (normalizedMessage.includes("unable to validate email address")) {
    return "Informe um endereço de e-mail válido.";
  }

  if (normalizedMessage.includes("signup is disabled")) {
    return "O cadastro de novos usuários está temporariamente desabilitado.";
  }

  if (normalizedMessage.includes("rate limit")) {
    return "Muitas tentativas foram realizadas. Aguarde alguns minutos.";
  }

  if (normalizedMessage.includes("network")) {
    return "Não foi possível conectar ao servidor. Verifique sua internet.";
  }

  return message || "Não foi possível concluir a solicitação.";
}

export default function AuthForm({ mode = "login" }: AuthFormProps) {
  const router = useRouter();
  const isRegister = mode === "register";

  const supabase = useMemo(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error(
        "As variáveis NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY não foram configuradas.",
      );
    }

    return createBrowserClient(supabaseUrl, supabaseAnonKey);
  }, []);

  const [fullName, setFullName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [phone, setPhone] = useState("");
  const [classNumber, setClassNumber] = useState("6");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const maximumBirthDate = new Date().toISOString().split("T")[0];

  function validateRegistration() {
    if (!fullName.trim() || fullName.trim().length < 3) {
      return "Informe seu nome completo.";
    }

    if (!birthDate) {
      return "Informe sua data de nascimento.";
    }

    const selectedBirthDate = new Date(`${birthDate}T12:00:00`);

    if (
      Number.isNaN(selectedBirthDate.getTime()) ||
      selectedBirthDate > new Date()
    ) {
      return "Informe uma data de nascimento válida.";
    }

    if (!/^[1-6]$/.test(classNumber)) {
      return "Selecione uma classe válida.";
    }

    if (password.length < 8) {
      return "A senha deve possuir pelo menos 8 caracteres.";
    }

    if (password !== passwordConfirmation) {
      return "A confirmação da senha não corresponde à senha informada.";
    }

    if (!acceptedTerms) {
      return "Você precisa aceitar os Termos de Uso e a Política de Privacidade.";
    }

    return null;
  }

  async function handleLogin() {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      throw error;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  async function handleRegistration() {
    const validationError = validateRegistration();

    if (validationError) {
      setFeedback({
        type: "error",
        message: validationError,
      });

      return;
    }

    const emailRedirectTo = `${window.location.origin}/auth/callback?next=/dashboard`;

    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        emailRedirectTo,
        data: {
          full_name: fullName.trim(),
          birth_date: birthDate,
          phone: phone.trim() || null,
          class_number: Number(classNumber),

          /*
           * Estes valores também devem ser definidos obrigatoriamente pelo
           * trigger do banco de dados. Os metadados não substituem a regra SQL.
           */
          role: "athlete",
          athlete_status: "active",
        },
      },
    });

    if (error) {
      throw error;
    }

    if (data.session) {
      router.replace("/dashboard");
      router.refresh();
      return;
    }

    setFeedback({
      type: "success",
      message:
        "Cadastro realizado. Verifique sua caixa de entrada e confirme seu e-mail para acessar o aplicativo.",
    });

    setPassword("");
    setPasswordConfirmation("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setFeedback(null);
    setIsSubmitting(true);

    try {
      if (isRegister) {
        await handleRegistration();
      } else {
        await handleLogin();
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? translateAuthError(error.message)
          : "Ocorreu um erro inesperado. Tente novamente.";

      setFeedback({
        type: "error",
        message,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900/90 p-6 shadow-2xl shadow-black/20 backdrop-blur sm:p-8">
      <div className="mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-400 transition hover:text-emerald-300"
        >
          <span aria-hidden="true">←</span>
          Voltar para o início
        </Link>

        <p className="mt-6 text-sm font-semibold uppercase tracking-wider text-emerald-400">
          App Ranking Smash
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
          {isRegister ? "Crie sua conta" : "Acesse sua conta"}
        </h1>

        <p className="mt-2 leading-6 text-slate-400">
          {isRegister
            ? "Cadastre-se para participar das temporadas e acompanhar sua classificação."
            : "Entre para consultar seus jogos, resultados e classificação."}
        </p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit} noValidate>
        {isRegister && (
          <>
            <div>
              <label
                htmlFor="fullName"
                className="mb-2 block text-sm font-medium text-slate-200"
              >
                Nome completo
              </label>

              <input
                id="fullName"
                name="fullName"
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                disabled={isSubmitting}
                required
                minLength={3}
                placeholder="Digite seu nome completo"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="birthDate"
                  className="mb-2 block text-sm font-medium text-slate-200"
                >
                  Data de nascimento
                </label>

                <input
                  id="birthDate"
                  name="birthDate"
                  type="date"
                  autoComplete="bday"
                  value={birthDate}
                  max={maximumBirthDate}
                  onChange={(event) => setBirthDate(event.target.value)}
                  disabled={isSubmitting}
                  required
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>

              <div>
                <label
                  htmlFor="classNumber"
                  className="mb-2 block text-sm font-medium text-slate-200"
                >
                  Classe inicial
                </label>

                <select
                  id="classNumber"
                  name="classNumber"
                  value={classNumber}
                  onChange={(event) => setClassNumber(event.target.value)}
                  disabled={isSubmitting}
                  required
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="1">1ª classe</option>
                  <option value="2">2ª classe</option>
                  <option value="3">3ª classe</option>
                  <option value="4">4ª classe</option>
                  <option value="5">5ª classe</option>
                  <option value="6">6ª classe</option>
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="phone"
                className="mb-2 block text-sm font-medium text-slate-200"
              >
                Telefone{" "}
                <span className="font-normal text-slate-500">(opcional)</span>
              </label>

              <input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                disabled={isSubmitting}
                placeholder="(00) 00000-0000"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>
          </>
        )}

        <div>
          <label
            htmlFor="email"
            className="mb-2 block text-sm font-medium text-slate-200"
          >
            E-mail
          </label>

          <input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={isSubmitting}
            required
            placeholder="atleta@exemplo.com"
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-4">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-slate-200"
            >
              Senha
            </label>

            {!isRegister && (
              <Link
                href="/esqueci-minha-senha"
                className="text-sm font-semibold text-emerald-400 transition hover:text-emerald-300"
              >
                Esqueci minha senha
              </Link>
            )}
          </div>

          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete={isRegister ? "new-password" : "current-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={isSubmitting}
              required
              minLength={8}
              placeholder={
                isRegister
                  ? "Crie uma senha com 8 ou mais caracteres"
                  : "Digite sua senha"
              }
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 pr-20 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            />

            <button
              type="button"
              onClick={() => setShowPassword((currentValue) => !currentValue)}
              disabled={isSubmitting}
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              aria-pressed={showPassword}
              className="absolute inset-y-0 right-0 px-4 text-sm font-semibold text-slate-400 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {showPassword ? "Ocultar" : "Mostrar"}
            </button>
          </div>
        </div>

        {isRegister && (
          <>
            <div>
              <label
                htmlFor="passwordConfirmation"
                className="mb-2 block text-sm font-medium text-slate-200"
              >
                Confirme sua senha
              </label>

              <input
                id="passwordConfirmation"
                name="passwordConfirmation"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={passwordConfirmation}
                onChange={(event) =>
                  setPasswordConfirmation(event.target.value)
                }
                disabled={isSubmitting}
                required
                minLength={8}
                placeholder="Digite a senha novamente"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-4">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(event) => setAcceptedTerms(event.target.checked)}
                disabled={isSubmitting}
                required
                className="mt-1 h-4 w-4 shrink-0 rounded border-slate-600 bg-slate-900 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-950"
              />

              <span className="text-sm leading-6 text-slate-400">
                Li e aceito os{" "}
                <Link
                  href="/termos"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-emerald-400 hover:text-emerald-300"
                >
                  Termos de Uso
                </Link>{" "}
                e a{" "}
                <Link
                  href="/privacidade"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-emerald-400 hover:text-emerald-300"
                >
                  Política de Privacidade
                </Link>
                .
              </span>
            </label>
          </>
        )}

        {feedback && (
          <div
            role={feedback.type === "error" ? "alert" : "status"}
            aria-live="polite"
            className={`rounded-xl border px-4 py-3 text-sm leading-6 ${
              feedback.type === "error"
                ? "border-rose-400/30 bg-rose-400/10 text-rose-200"
                : "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
            }`}
          >
            {feedback.message}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full items-center justify-center rounded-xl bg-emerald-500 px-5 py-3.5 font-bold text-slate-950 transition hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting
            ? isRegister
              ? "Criando conta..."
              : "Entrando..."
            : isRegister
              ? "Criar minha conta"
              : "Entrar"}
        </button>
      </form>

      <div className="mt-6 border-t border-slate-800 pt-6 text-center">
        <p className="text-sm text-slate-400">
          {isRegister ? "Já possui uma conta?" : "Ainda não possui uma conta?"}{" "}
          <Link
            href={isRegister ? "/login" : "/cadastro"}
            className="font-semibold text-emerald-400 transition hover:text-emerald-300"
          >
            {isRegister ? "Entrar" : "Cadastre-se"}
          </Link>
        </p>
      </div>
    </div>
  );
}
