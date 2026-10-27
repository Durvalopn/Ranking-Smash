"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import QuickMatchResult from "@/components/QuickMatchResult";

type Match = {
  id: string;
  athlete_one_id: string;
  athlete_two_id: string | null;
  athlete_one_name?: string;
  athlete_two_name?: string | null;
};

type Props = {
  athleteId?: string;
  athleteName: string;
  athleteClass: number;
  athleteStatus: string;
  seasonName?: string;
  currentRound?: number;
  totalRounds?: number;
  roundDeadline?: string | null;
  matches: Match[];
};

export default function AthleteDashboard({
  athleteId,
  athleteName,
  athleteClass,
  athleteStatus,
  seasonName = "Nenhuma temporada ativa",
  currentRound = 0,
  totalRounds = 0,
  roundDeadline = null,
  matches,
}: Props) {
  const [status, setStatus] = useState(athleteStatus);
  const [canChoosePending, setCanChoosePending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void fetch("/api/athlete/status")
      .then((response) => response.ok ? response.json() : null)
      .then((result) => {
        if (active && typeof result?.canChoosePending === "boolean") {
          setCanChoosePending(result.canChoosePending);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const deadline = roundDeadline
    ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(roundDeadline))
    : null;

  async function changeStatus(next: "active" | "licensed" | "pendente") {
    if (next === status || saving) return;
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/athlete/status", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const result = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(result?.error ?? "Não foi possível atualizar o status.");
      }

      setStatus(next);
      setMessage(
        next === "licensed"
          ? "Você está licenciado."
          : next === "pendente"
            ? "Você está pendente e não participará dos sorteios."
            : "Você está ativo e poderá participar do próximo sorteio.",
      );
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : "Não foi possível atualizar o status.");
    } finally {
      setSaving(false);
    }
  }

  const match = matches[0];
  const userIsFirst = Boolean(match && (!athleteId || match.athlete_one_id === athleteId));
  const isBye = Boolean(match && !match.athlete_two_id);
  const isLicensedWithoutMatch = !match && status === "licensed";
  const opponent = match?.athlete_two_id
    ? userIsFirst
      ? match.athlete_two_name ?? "Atleta"
      : match.athlete_one_name ?? "Atleta"
    : "BYE";

  return (
    <main className="page-container py-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-400">Painel do atleta</p>
            <h1 className="mt-3 text-4xl font-bold text-white">Olá, {athleteName}</h1>
            <p className="mt-2 text-slate-400">Acompanhe seus jogos, resultados e classificação.</p>
          </div>
          <Link href="/perfil" className="rounded-lg border border-slate-700 px-5 py-3 font-semibold text-white">
            Meu perfil
          </Link>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Temporada atual</p>
            <p className="mt-3 font-semibold text-white">{seasonName}</p>
          </div>
          <div className="rounded-2xl bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Classe</p>
            <p className="mt-3 text-2xl font-bold text-emerald-400">
              {athleteClass === 7 ? "Feminino" : `${athleteClass}ª classe`}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Rodada</p>
            <p className="mt-3 text-2xl font-bold text-white">{currentRound} de {totalRounds}</p>
            {deadline && (
              <p className="mt-2 text-sm text-slate-400">
                Data limite: <strong className="text-amber-300">{deadline}</strong>
              </p>
            )}
          </div>
          <div className="rounded-2xl bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Status</p>
            <select
              value={status}
              onChange={(event) => void changeStatus(event.target.value as "active" | "licensed" | "pendente")}
              disabled={saving}
              className="mt-3 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-semibold text-white"
            >
              <option value="active">Ativo</option>
              <option value="licensed">Licenciado</option>
              <option value="pendente" disabled={!canChoosePending}>Pendente</option>
            </select>
            <p className="mt-2 text-xs text-slate-500">
              {status === "licensed"
                ? "Recebe 3 pontos por rodada encerrada."
                : status === "pendente"
                  ? "Permanece na classe e fica fora dos sorteios e da classificação."
                  : "Participa dos sorteios e da classificação."}
            </p>
          </div>
        </div>

        {message && <div className="mt-4 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-300">{message}</div>}
        {error && <div className="mt-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}

        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400">
                Rodada {currentRound}
              </p>
              <h2 className="mt-1 text-2xl font-bold text-white">Seu confronto</h2>
            </div>
            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-sm text-emerald-300">
              {match ? "1 jogo" : "Nenhum jogo"}
            </span>
          </div>

          {match ? (
            isBye ? (
              <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                <p className="font-semibold text-emerald-300">BYE nesta rodada</p>
                <p className="mt-1 text-sm text-slate-300">
                  Você foi escolhido para folgar nesta rodada. Os pontos previstos para o BYE serão contabilizados
                  sem alterar seu saldo de sets ou games. Não precisa lançar resultado.
                </p>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-400">Adversário: {opponent}</p>
            )
          ) : isLicensedWithoutMatch ? (
            <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
              <p className="font-semibold text-amber-200">Você está licenciado nesta rodada</p>
              <p className="mt-1 text-sm text-slate-300">
                Você não participa do sorteio e receberá 3 pontos quando a rodada for encerrada.
              </p>
            </div>
          ) : (
            <p className="mt-4 text-slate-400">Nenhum confronto disponível na rodada atual.</p>
          )}
        </section>

        {!isBye && !isLicensedWithoutMatch && (
          <section className="mt-8">
            <QuickMatchResult />
          </section>
        )}

      </div>
    </main>
  );
}
