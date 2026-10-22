"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import QuickMatchResult from "@/components/QuickMatchResult";

type Props = {
  athleteName: string;
  athleteClass: number;
  athleteStatus: string;
  seasonName?: string;
  currentRound?: number;
  totalRounds?: number;
  matches: unknown[];
  standings: unknown[];
};

export default function AthleteDashboard({ athleteName, athleteClass, athleteStatus, seasonName = "Nenhuma temporada ativa", currentRound = 0, totalRounds = 0, matches, standings }: Props) {
  const supabase = createClient();
  const [status, setStatus] = useState(athleteStatus);
  const [savingStatus, setSavingStatus] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusError, setStatusError] = useState("");

  async function changeStatus(nextStatus: "active" | "licensed") {
    if (nextStatus === status || savingStatus) return;
    setSavingStatus(true); setStatusMessage(""); setStatusError("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setStatusError("Não foi possível identificar o usuário."); setSavingStatus(false); return; }
    const { error } = await supabase.from("athletes").update({ status: nextStatus }).eq("user_id", user.id);
    if (error) { setStatusError(`Não foi possível atualizar o status: ${error.message}`); setSavingStatus(false); return; }
    setStatus(nextStatus);
    setStatusMessage(nextStatus === "licensed" ? "Você está licenciado. Não participará do próximo sorteio e receberá 3 pontos na próxima rodada." : "Você está ativo e poderá participar do próximo sorteio.");
    setSavingStatus(false);
  }

  const isLicensed = status === "licensed";

  return <>
    <main className="page-container py-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">Painel do atleta</p><h1 className="mt-3 text-4xl font-bold text-white">Olá, {athleteName}</h1><p className="mt-2 text-slate-400">Acompanhe seus jogos, resultados e classificação.</p></div><Link href="/perfil" className="rounded-lg border border-slate-700 px-5 py-3 font-semibold text-white hover:border-emerald-400">Meu perfil</Link></div>
        <div className="mt-8 grid gap-4 sm:grid-cols-4"><div className="rounded-2xl bg-slate-900 p-5"><p className="text-sm text-slate-400">Temporada atual</p><p className="mt-3 font-semibold text-white">{seasonName}</p></div><div className="rounded-2xl bg-slate-900 p-5"><p className="text-sm text-slate-400">Classe</p><p className="mt-3 text-2xl font-bold text-emerald-400">{athleteClass}ª classe</p></div><div className="rounded-2xl bg-slate-900 p-5"><p className="text-sm text-slate-400">Rodada</p><p className="mt-3 text-2xl font-bold text-white">{currentRound} de {totalRounds}</p></div><div className={`rounded-2xl p-5 ${isLicensed ? "border border-amber-500/30 bg-amber-500/10" : "bg-slate-900"}`}><p className="text-sm text-slate-400">Status</p><div className="mt-3 flex flex-wrap items-center gap-2"><select value={status === "licensed" ? "licensed" : "active"} onChange={(event) => void changeStatus(event.target.value as "active" | "licensed")} disabled={savingStatus} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-semibold text-white disabled:opacity-50"><option value="active">Ativo</option><option value="licensed">Licenciado</option></select>{savingStatus && <span className="text-xs text-slate-400">Salvando...</span>}</div><p className={`mt-2 text-xs ${isLicensed ? "text-amber-200" : "text-slate-500"}`}>{isLicensed ? "Não entra no próximo sorteio e recebe 3 pontos." : "Participa do próximo sorteio."}</p></div></div>
        {statusMessage && <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">{statusMessage}</div>}
        {statusError && <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{statusError}</div>}
        <div className="mt-8"><QuickMatchResult /></div>
        <section className="mt-8 grid gap-6 lg:grid-cols-2"><div className="rounded-2xl bg-slate-900 p-6"><h2 className="text-xl font-semibold text-white">Meus confrontos</h2><p className="mt-2 text-slate-400">{matches.length ? `${matches.length} confronto(s) carregado(s).` : "Nenhum confronto encontrado nesta rodada."}</p></div><div className="rounded-2xl bg-slate-900 p-6"><h2 className="text-xl font-semibold text-white">Classificação da classe</h2><p className="mt-2 text-slate-400">{standings.length ? `${standings.length} atleta(s) na classificação.` : "Ainda não há classificação disponível."}</p></div></section>
      </div>
    </main>
  </>;
}
