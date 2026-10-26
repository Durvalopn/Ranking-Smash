"use client";

import {
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type RegistrationForm = {
  fullName: string;
  birthDate: string;
  phone: string;
  classNumber: string;
  email: string;
  password: string;
  passwordConfirmation: string;
  acceptedTerms: boolean;
};

const INITIAL_FORM: RegistrationForm = {
  fullName: "",
  birthDate: "",
  phone: "",
  classNumber: "",
  email: "",
  password: "",
  passwordConfirmation: "",
  acceptedTerms: false,
};

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
    return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /><circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.7" /></svg>;
  }
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none"><path d="m3 3 18 18M10.6 6.2A8.6 8.6 0 0 1 12 6c6 0 9.5 6 9.5 6a16 16 0 0 1-3 3.7M6.2 6.2C3.9 7.8 2.5 12 2.5 12s3.5 6 9.5 6a9 9 0 0 0 3.1-.5M9.9 9.9a3 3 0 0 0 4.2 4.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function LoadingIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 animate-spin" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" className="opacity-25" /><path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-90" /></svg>;
}

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function getPasswordValidation(password: string) {
  return { minimumLength: password.length >= 8, hasUppercase: /[A-ZÀ-Ý]/.test(password), hasLowercase: /[a-zà-ÿ]/.test(password), hasNumber: /\d/.test(password) };
}

function isPasswordValid(password: string): boolean {
  return Object.values(getPasswordValidation(password)).every(Boolean);
}

function translateAuthError(message: string): string {
  const normalizedMessage = message.toLowerCase();
  if (normalizedMessage.includes("user already registered") || normalizedMessage.includes("already been registered")) return "Já existe uma conta cadastrada com este e-mail.";
  if (normalizedMessage.includes("invalid email")) return "Informe um endereço de e-mail válido.";
  if (normalizedMessage.includes("password should be") || normalizedMessage.includes("weak password")) return "A senha informada não atende aos requisitos de segurança.";
  if (normalizedMessage.includes("rate limit") || normalizedMessage.includes("too many requests")) return "Muitas tentativas foram realizadas. Aguarde alguns minutos.";
  if (normalizedMessage.includes("failed to fetch") || normalizedMessage.includes("network")) return "Não foi possível conectar ao servidor. Verifique sua internet.";
  return "Não foi possível concluir o cadastro. Tente novamente.";
}

export default function CadastroPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [form, setForm] = useState<RegistrationForm>(INITIAL_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const passwordValidation = getPasswordValidation(form.password);

  useEffect(() => {
    let isMounted = true;
    async function checkCurrentSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!isMounted) return;
      if (session) {
        router.replace("/dashboard");
        router.refresh();
        return;
      }
      setIsCheckingSession(false);
    }
    void checkCurrentSession();
    return () => { isMounted = false; };
  }, [router, supabase]);

  function updateField(field: keyof RegistrationForm, value: string | boolean) {
    setForm((current) => ({ ...current, [field]: value }));
    if (errorMessage) setErrorMessage("");
  }

  function handlePhoneChange(event: ChangeEvent<HTMLInputElement>) {
    updateField("phone", formatPhone(event.target.value));
  }

  function validateForm(): string | null {
    const normalizedName = form.fullName.trim();
    const normalizedPhone = form.phone.replace(/\D/g, "");
    const normalizedEmail = form.email.trim();
    if (normalizedName.length < 3 || !normalizedName.includes(" ")) return "Informe seu nome completo.";
    if (!form.birthDate) return "Informe sua data de nascimento.";
    const birthDate = new Date(`${form.birthDate}T12:00:00`);
    if (Number.isNaN(birthDate.getTime()) || birthDate > new Date()) return "Informe uma data de nascimento válida.";
    if (normalizedPhone.length < 10) return "Informe um telefone válido com DDD.";
    if (!form.classNumber) return "Selecione sua classe.";
    if (!/^[1-7]$/.test(form.classNumber)) return "Selecione uma classe válida.";
    if (!normalizedEmail) return "Informe seu e-mail.";
    if (!isPasswordValid(form.password)) return "A senha precisa atender a todos os requisitos de segurança.";
    if (form.password !== form.passwordConfirmation) return "A confirmação da senha não corresponde à senha informada.";
    if (!form.acceptedTerms) return "Você precisa aceitar os Termos de Uso e a Política de Privacidade.";
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isLoading) return;
    setErrorMessage("");
    setSuccessMessage("");
    const validationError = validateForm();
    if (validationError) { setErrorMessage(validationError); return; }
    setIsLoading(true);
    const normalizedEmail = form.email.trim().toLowerCase();
    const normalizedPhone = form.phone.replace(/\D/g, "");
    const normalizedName = form.fullName.trim().replace(/\s+/g, " ");
    const classNumber = Number(form.classNumber);
    try {
      const emailRedirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent("/dashboard")}`;
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: form.password,
        options: {
          emailRedirectTo,
          data: { full_name: normalizedName, phone: normalizedPhone, birth_date: form.birthDate, class_number: classNumber },
        },
      });
      if (error) { setErrorMessage(translateAuthError(error.message)); return; }
      if (data.session) {
        router.replace("/dashboard");
        router.refresh();
        return;
      }
      setForm(INITIAL_FORM);
      setShowPassword(false);
      setShowPasswordConfirmation(false);
      setSuccessMessage("Cadastro realizado. Enviamos um link de confirmação para o seu e-mail. Verifique também a caixa de spam.");
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
      <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-7xl items-start gap-12 px-4 py-12 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8 lg:py-20">
        <section className="hidden max-w-lg lg:sticky lg:top-12 lg:block">
          <Link href="/" className="inline-flex items-center gap-3 rounded-xl text-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-4 focus-visible:ring-offset-slate-950" aria-label="Voltar para a página inicial do Ranking Smash"><TennisBallIcon /><span><strong className="block text-xl text-white">Ranking Smash</strong><span className="text-sm text-slate-400">Sua competição, em um só lugar</span></span></Link>
          <h1 className="mt-12 text-5xl font-black leading-tight tracking-tight">Faça parte do<span className="mt-2 block bg-gradient-to-r from-emerald-300 via-emerald-400 to-green-500 bg-clip-text text-transparent">Ranking Smash.</span></h1>
          <p className="mt-6 text-lg leading-8 text-slate-300">Cadastre-se para participar das temporadas, acompanhar seus confrontos e disputar cada posição do ranking.</p>
          <ul className="mt-9 space-y-4 text-slate-300">{["Cinco temporadas por ano", "Seis rodadas por temporada", "Classificação por classe", "Histórico completo de partidas", "Promoções e rebaixamentos"].map((item) => <li key={item} className="flex items-center gap-3"><span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-sm font-bold text-emerald-400">✓</span>{item}</li>)}</ul>
          <div className="mt-10 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-5"><p className="text-sm font-semibold text-amber-200">Seleção de classe</p><p className="mt-2 text-sm leading-6 text-amber-100/75">A classe informada poderá ser revisada pela administração. Atletas que ingressarem durante uma temporada ativa somente poderão entrar inicialmente na 6ª classe e em rodadas ainda não sorteadas.</p></div>
        </section>
        <section aria-labelledby="registration-title" className="mx-auto w-full max-w-2xl">
          <div className="mb-8 text-center lg:hidden"><Link href="/" className="inline-flex items-center gap-3 rounded-xl text-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400" aria-label="Voltar para a página inicial do Ranking Smash"><TennisBallIcon /><span className="text-left"><strong className="block text-lg text-white">Ranking Smash</strong><span className="text-xs text-slate-400">Sua competição, em um só lugar</span></span></Link></div>
          <div className="rounded-3xl border border-white/10 bg-slate-900/85 p-6 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-8">
            <header><p className="text-sm font-bold uppercase tracking-widest text-emerald-400">Novo atleta</p><h2 id="registration-title" className="mt-2 text-3xl font-bold tracking-tight text-white">Crie sua conta</h2><p className="mt-3 text-sm leading-6 text-slate-400">Preencha seus dados para participar do App Ranking Smash.</p></header>
            {successMessage && <div role="status" aria-live="polite" className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-4 text-sm leading-6 text-emerald-200"><p className="font-semibold">Cadastro recebido!</p><p className="mt-1">{successMessage}</p><Link href="/login" className="mt-3 inline-flex font-bold text-emerald-300 underline underline-offset-4 transition hover:text-white">Ir para o login</Link></div>}
            {errorMessage && <div role="alert" aria-live="assertive" className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-200">{errorMessage}</div>}
            <form onSubmit={handleSubmit} className="mt-7 space-y-6" noValidate>
              <fieldset disabled={isLoading} className="space-y-6"><legend className="sr-only">Dados do atleta</legend>
                <div><label htmlFor="fullName" className="mb-2 block text-sm font-semibold text-slate-200">Nome completo</label><input id="fullName" name="fullName" type="text" autoComplete="name" required minLength={3} value={form.fullName} onChange={(event) => updateField("fullName", event.target.value)} placeholder="Digite seu nome completo" className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 hover:border-slate-600 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60" /></div>
                <div className="grid gap-5 sm:grid-cols-2"><div><label htmlFor="birthDate" className="mb-2 block text-sm font-semibold text-slate-200">Data de nascimento</label><input id="birthDate" name="birthDate" type="date" autoComplete="bday" required max={new Date().toISOString().split("T")[0]} value={form.birthDate} onChange={(event) => updateField("birthDate", event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-white outline-none transition [color-scheme:dark] hover:border-slate-600 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60" /></div><div><label htmlFor="phone" className="mb-2 block text-sm font-semibold text-slate-200">Telefone com DDD</label><input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" required value={form.phone} onChange={handlePhoneChange} placeholder="(00) 00000-0000" className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 hover:border-slate-600 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60" /></div></div>
                <div><label htmlFor="classNumber" className="mb-2 block text-sm font-semibold text-slate-200">Classe pretendida</label><select id="classNumber" name="classNumber" required value={form.classNumber} onChange={(event) => updateField("classNumber", event.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-white outline-none transition hover:border-slate-600 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"><option value="">Selecione sua classe</option><option value="1">1ª classe</option><option value="2">2ª classe</option><option value="3">3ª classe</option><option value="4">4ª classe</option><option value="5">5ª classe</option><option value="6">6ª classe</option><option value="7">Feminino</option></select><p className="mt-2 text-xs leading-5 text-slate-500">A classe poderá ser ajustada pela administração conforme as regras da competição.</p></div>
                <div><label htmlFor="email" className="mb-2 block text-sm font-semibold text-slate-200">E-mail</label><input id="email" name="email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} required value={form.email} onChange={(event) => updateField("email", event.target.value)} placeholder="seuemail@exemplo.com" className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 hover:border-slate-600 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60" /></div>
                <div className="grid gap-5 sm:grid-cols-2"><div><label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-200">Senha</label><div className="relative"><input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="new-password" required minLength={8} value={form.password} onChange={(event) => updateField("password", event.target.value)} placeholder="Crie uma senha" aria-describedby="password-requirements" className="w-full rounded-xl border border-slate-700 bg-slate-950/80 py-3 pl-4 pr-12 text-white outline-none transition placeholder:text-slate-600 hover:border-slate-600 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60" /><button type="button" onClick={() => setShowPassword((current) => !current)} className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-slate-400 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-400 disabled:cursor-not-allowed disabled:opacity-60" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} aria-pressed={showPassword}><EyeIcon hidden={!showPassword} /></button></div></div><div><label htmlFor="passwordConfirmation" className="mb-2 block text-sm font-semibold text-slate-200">Confirme a senha</label><div className="relative"><input id="passwordConfirmation" name="passwordConfirmation" type={showPasswordConfirmation ? "text" : "password"} autoComplete="new-password" required minLength={8} value={form.passwordConfirmation} onChange={(event) => updateField("passwordConfirmation", event.target.value)} placeholder="Repita sua senha" className="w-full rounded-xl border border-slate-700 bg-slate-950/80 py-3 pl-4 pr-12 text-white outline-none transition placeholder:text-slate-600 hover:border-slate-600 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60" /><button type="button" onClick={() => setShowPasswordConfirmation((current) => !current)} className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-slate-400 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-400 disabled:cursor-not-allowed disabled:opacity-60" aria-label={showPasswordConfirmation ? "Ocultar confirmação da senha" : "Mostrar confirmação da senha"} aria-pressed={showPasswordConfirmation}><EyeIcon hidden={!showPasswordConfirmation} /></button></div></div></div>
                <div id="password-requirements" className="rounded-xl border border-white/10 bg-slate-950/50 p-4"><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Sua senha deve possuir:</p><ul className="mt-3 grid gap-2 text-xs sm:grid-cols-2"><PasswordRequirement valid={passwordValidation.minimumLength} label="No mínimo 8 caracteres" /><PasswordRequirement valid={passwordValidation.hasUppercase} label="Uma letra maiúscula" /><PasswordRequirement valid={passwordValidation.hasLowercase} label="Uma letra minúscula" /><PasswordRequirement valid={passwordValidation.hasNumber} label="Um número" /></ul></div>
                <div className="rounded-xl border border-white/10 bg-slate-950/50 p-4"><label className="flex cursor-pointer items-start gap-3"><input name="acceptedTerms" type="checkbox" required checked={form.acceptedTerms} onChange={(event) => updateField("acceptedTerms", event.target.checked)} className="mt-1 h-4 w-4 shrink-0 rounded border-slate-600 bg-slate-900 text-emerald-500 accent-emerald-500 focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-950" /><span className="text-sm leading-6 text-slate-300">Li e concordo com os <Link href="/termos" target="_blank" rel="noopener noreferrer" className="font-semibold text-emerald-400 underline underline-offset-4 transition hover:text-emerald-300">Termos de Uso</Link> e com a <Link href="/privacidade" target="_blank" rel="noopener noreferrer" className="font-semibold text-emerald-400 underline underline-offset-4 transition hover:text-emerald-300">Política de Privacidade</Link>.</span></label></div>
              </fieldset>
              <button type="submit" disabled={isLoading || Boolean(successMessage)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 font-bold text-slate-950 transition hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-4 focus-visible:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-60">{isLoading ? <><LoadingIcon />Criando conta...</> : "Criar minha conta"}</button>
            </form>
            <div className="mt-7 border-t border-white/10 pt-6 text-center"><p className="text-sm text-slate-400">Já possui uma conta? <Link href="/login" className="font-bold text-emerald-400 transition hover:text-emerald-300 hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400">Entrar</Link></p></div>
          </div>
        </section>
      </div>
    </div>
  );
}

function PasswordRequirement({ valid, label }: { valid: boolean; label: string }) {
  return <li className={`flex items-center gap-2 ${valid ? "text-emerald-300" : "text-slate-500"}`}><span aria-hidden="true" className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${valid ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-800 text-slate-500"}`}>{valid ? "✓" : "•"}</span>{label}</li>;
}
