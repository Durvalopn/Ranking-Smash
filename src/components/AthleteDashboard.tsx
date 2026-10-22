"use client";

import Link from "next/link";
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
  return <>
    <main className="page-container py-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">Painel do atleta</p><h1 className="mt-3 text-4xl font-bold text-white">Olá, {athleteName}</h1><p className="mt-2 text-slate-400">Acompanhe seus jogos, resultados e classificação.</p></div><Link href="/perfil" className="rounded-lg border border-slate-700 px-5 py-3 font-semibold text-white hover:border-emerald-400">Meu perfil</Link></div>
        <div className="mt-8 grid gap-4 sm:grid-cols-4"><div className="rounded-2xl bg-slate-900 p-5"><p className="text-sm text-slate-400">Temporada atual</p><p className="mt-3 font-semibold text-white">{seasonName}</p></div><div className="rounded-2xl bg-slate-900 p-5"><p className="text-sm text-slate-400">Classe</p><p className="mt-3 text-2xl font-bold text-emerald-400">{athleteClass}ª classe</p></div><div className="rounded-2xl bg-slate-900 p-5"><p className="text-sm text-slate-400">Rodada</p><p className="mt-3 text-2xl font-bold text-white">{currentRound} de {totalRounds}</p></div><div className="rounded-2xl bg-slate-900 p-5"><p className="text-sm text-slate-400">Status</p><p className="mt-3 font-semibold text-white">{athleteStatus}</p></div></div>
        <div className="mt-8"><QuickMatchResult /></div>
        <section className="mt-8 grid gap-6 lg:grid-cols-2"><div className="rounded-2xl bg-slate-900 p-6"><h2 className="text-xl font-semibold text-white">Meus confrontos</h2><p className="mt-2 text-slate-400">{matches.length ? `${matches.length} confronto(s) carregado(s).` : "Nenhum confronto encontrado nesta rodada."}</p></div><div className="rounded-2xl bg-slate-900 p-6"><h2 className="text-xl font-semibold text-white">Classificação da classe</h2><p className="mt-2 text-slate-400">{standings.length ? `${standings.length} atleta(s) na classificação.` : "Ainda não há classificação disponível."}</p></div></section>
      </div>
    </main>
  </>;
}
