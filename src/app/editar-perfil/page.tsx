"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const classes = [1, 2, 3, 4, 5, 6];

type FormData = {
  fullName: string;
  birthDate: string;
  phone: string;
  classNumber: string;
};

function normalizeClass(value: unknown) {
  const match = String(value ?? "").match(/[1-6]/);
  return match?.[0] ?? "";
}

export default function EditarPerfilPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormData>({ fullName: "", birthDate: "", phone: "", classNumber: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const loadUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }

      const metadata = user.user_metadata ?? {};
      const { data: athlete } = await supabase
        .from("athletes")
        .select("current_class")
        .eq("user_id", user.id)
        .maybeSingle();

      setForm({
        fullName: metadata.full_name ?? "",
        birthDate: metadata.birth_date ?? "",
        phone: metadata.phone ?? "",
        classNumber: normalizeClass(athlete?.current_class ?? metadata.class_number),
      });
      setLoading(false);
    };

    void loadUser();
  }, [router]);

  const update = (field: keyof FormData, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setSuccess("");
    setError("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/login");
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        full_name: form.fullName.trim(),
        birth_date: form.birthDate,
        phone: form.phone.trim(),
        class_number: form.classNumber,
      },
    });

    if (updateError) {
      setError("Não foi possível salvar as alterações. Tente novamente.");
      setSaving(false);
      return;
    }

    const { error: athleteError } = await supabase
      .from("athletes")
      .update({ current_class: Number(form.classNumber) })
      .eq("user_id", user.id);

    if (athleteError) {
      setError("Os dados da conta foram salvos, mas não foi possível atualizar a classe do atleta.");
      setSaving(false);
      return;
    }

    setSuccess("Perfil atualizado com sucesso.");
    setSaving(false);
  };

  if (loading) {
    return <main className="page-container py-10 text-slate-300">Carregando perfil...</main>;
  }

  return (
    <main className="page-container py-10">
      <div className="mx-auto max-w-2xl">
        <Link href="/perfil" className="text-sm text-emerald-400 hover:text-emerald-300">
          ← Voltar ao perfil
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-white">Editar perfil</h1>
        <p className="mt-2 text-slate-400">Corrija seus dados de atleta sem precisar acessar o Supabase.</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl">
          {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}
          {success && <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">{success}</div>}

          <label className="block text-sm text-slate-300">
            Nome completo
            <input value={form.fullName} onChange={(event) => update("fullName", event.target.value)} required className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-emerald-400" />
          </label>

          <label className="block text-sm text-slate-300">
            Data de nascimento
            <input type="date" value={form.birthDate} onChange={(event) => update("birthDate", event.target.value)} required className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-emerald-400" />
          </label>

          <label className="block text-sm text-slate-300">
            Telefone com DDD
            <input value={form.phone} onChange={(event) => update("phone", event.target.value)} required className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-emerald-400" />
          </label>

          <label className="block text-sm text-slate-300">
            Classe que você joga
            <select value={form.classNumber} onChange={(event) => update("classNumber", event.target.value)} required className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-emerald-400">
              <option value="">Selecione sua classe</option>
              {classes.map((item) => <option key={item} value={String(item)}>{item}ª Classe</option>)}
            </select>
          </label>

          <button type="submit" disabled={saving} className="w-full rounded-lg bg-emerald-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60">
            {saving ? "Salvando..." : "Salvar alterações"}
          </button>
        </form>
      </div>
    </main>
  );
}
