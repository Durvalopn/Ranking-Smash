"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type MatchStatus =
  | "scheduled"
  | "awaiting_result"
  | "result_submitted"
  | "confirmed"
  | "contested"
  | "completed"
  | "walkover";

type Match = {
  id: string;
  round: number;
  opponent: string;
  scheduledAt?: string;
  result?: string;
  points?: number;
  status: MatchStatus;
};

type Standing = {
  position: number;
  athlete: string;
  points: number;
  setBalance: number;
  gameBalance: number;
  currentUser?: boolean;
};

type AthleteDashboardProps = {
  athleteName?: string;
  athleteClass?: number;
  athleteStatus?: "active" | "licensed";
  seasonName?: string;
  currentRound?: number;
  totalRounds?: number;
  matches?: Match[];
  standings?: Standing[];
};

const defaultMatches: Match[] = [
  {
    id: "match-1",
    round: 4,
    opponent: "Carlos Oliveira",
    scheduledAt: "2026-03-28T19:30:00",
    status: "scheduled",
  },
  {
    id: "match-2",
    round: 3,
    opponent: "Bruno Martins",
    result: "7 × 5",
    points: 7,
    status: "confirmed",
  },
  {
    id: "match-3",
    round: 2,
    opponent: "Eduardo Lima",
    result: "4 × 6",
    points: 3,
    status: "completed",
  },
];

const defaultStandings: Standing[] = [
  {
    position: 1,
    athlete: "Carlos Oliveira",
    points: 21,
    setBalance: 3,
    gameBalance: 12,
  },
  {
    position: 2,
    athlete: "Você",
    points: 17,
    setBalance: 1,
    gameBalance: 6,
    currentUser: true,
  },
  {
    position: 3,
    athlete: "Bruno Martins",
    points: 13,
    setBalance: 0,
    gameBalance: 2,
  },
  {
    position: 4,
    athlete: "Eduardo Lima",
    points: 10,
    setBalance: -1,
    gameBalance: -4,
  },
];

const statusLabels: Record<MatchStatus, string> = {
  scheduled: "Agendado",
  awaiting_result: "Aguardando resultado",
  result_submitted: "Aguardando confirmação",
  confirmed: "Confirmado",
  contested: "Contestado",
  completed: "Concluído",
  walkover: "WO",
};

const statusStyles: Record<MatchStatus, string> = {
  scheduled: "border-sky-400/30 bg-sky-400/10 text-sky-300",
  awaiting_result: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  result_submitted: "border-violet-400/30 bg-violet-400/10 text-violet-300",
  confirmed: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  contested: "border-rose-400/30 bg-rose-400/10 text-rose-300",
  completed: "border-slate-400/30 bg-slate-400/10 text-slate-300",
  walkover: "border-orange-400/30 bg-orange-400/10 text-orange-300",
};

function formatDate(value?: string) {
  if (!value) return "Data a combinar";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Data a combinar";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function formatBalance(value: number) {
  return value > 0 ? `+${value}` : String(value);
}

export default function AthleteDashboard({
  athleteName = "Atleta Smash",
  athleteClass = 3,
  athleteStatus = "active",
  seasonName = "Austrália Open da Smash",
  currentRound = 4,
  totalRounds = 6,
  matches = defaultMatches,
  standings = defaultStandings,
}: AthleteDashboardProps) {
  const [matchFilter, setMatchFilter] = useState<
    "all" | "pending" | "finished"
  >("all");

  const filteredMatches = useMemo(() => {
    if (matchFilter === "pending") {
      return matches.filter((match) =>
        [
          "scheduled",
          "awaiting_result",
          "result_submitted",
          "contested",
        ].includes(match.status),
      );
    }

    if (matchFilter === "finished") {
      return matches.filter((match) =>
        ["confirmed", "completed", "walkover"].includes(match.status),
      );
    }

    return matches;
  }, [matchFilter, matches]);

  const currentAthlete = standings.find((athlete) => athlete.currentUser);
  const totalPoints = currentAthlete?.points ?? 0;
  const position = currentAthlete?.position ?? "-";
  const progress = Math.min(
    100,
    Math.max(0, Math.round((currentRound / totalRounds) * 100)),
  );

  return (
    <section className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-emerald-400">
              Painel do atleta
            </p>

            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Olá, {athleteName}
            </h1>

            <p className="mt-2 text-slate-400">
              Acompanhe seus jogos, resultados e classificação.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/resultados/registrar"
              className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
            >
              Registrar resultado
            </Link>

            <Link
              href="/perfil"
              className="rounded-xl border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:border-slate-500 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500"
            >
              Meu perfil
            </Link>
          </div>
        </header>

        <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Temporada atual</p>
            <p className="mt-2 font-semibold text-white">{seasonName}</p>
          </article>

          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Classe</p>
            <p className="mt-2 text-2xl font-bold text-emerald-400">
              {athleteClass}ª classe
            </p>
          </article>

          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Classificação</p>
            <p className="mt-2 text-2xl font-bold">
              {position}
              {typeof position === "number" ? "º lugar" : ""}
            </p>
          </article>

          <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Pontuação</p>
            <p className="mt-2 text-2xl font-bold">{totalPoints} pontos</p>
          </article>
        </div>

        <div className="mb-8 rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-slate-400">Andamento da temporada</p>
              <h2 className="mt-1 text-xl font-semibold">
                Rodada {currentRound} de {totalRounds}
              </h2>
            </div>

            <span
              className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${
                athleteStatus === "active"
                  ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                  : "border-amber-400/30 bg-amber-400/10 text-amber-300"
              }`}
            >
              {athleteStatus === "active" ? "Atleta ativo" : "Atleta licenciado"}
            </span>
          </div>

          <div
            className="mt-5 h-2 overflow-hidden rounded-full bg-slate-800"
            role="progressbar"
            aria-label="Progresso da temporada"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="grid gap-8 xl:grid-cols-[1.25fr_0.75fr]">
          <article className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
            <div className="flex flex-col gap-4 border-b border-slate-800 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div>
                <h2 className="text-xl font-semibold">Meus confrontos</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Consulte jogos pendentes e resultados anteriores.
                </p>
              </div>

              <div className="flex rounded-xl bg-slate-950 p-1">
                {(
                  [
                    ["all", "Todos"],
                    ["pending", "Pendentes"],
                    ["finished", "Finalizados"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setMatchFilter(value)}
                    className={`rounded-lg px-3 py-2 text-xs font-semibold transition sm:text-sm ${
                      matchFilter === value
                        ? "bg-emerald-500 text-slate-950"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="divide-y divide-slate-800">
              {filteredMatches.length > 0 ? (
                filteredMatches.map((match) => (
                  <div
                    key={match.id}
                    className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
                  >
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-400">
                        Rodada {match.round}
                      </p>

                      <h3 className="mt-1 font-semibold">
                        Você <span className="text-slate-500">×</span>{" "}
                        {match.opponent}
                      </h3>

                      <p className="mt-1 text-sm text-slate-400">
                        {match.result
                          ? `Resultado: ${match.result}`
                          : formatDate(match.scheduledAt)}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {typeof match.points === "number" && (
                        <span className="text-sm font-semibold text-white">
                          +{match.points} pts
                        </span>
                      )}

                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                          statusStyles[match.status]
                        }`}
                      >
                        {statusLabels[match.status]}
                      </span>

                      {["scheduled", "awaiting_result", "contested"].includes(
                        match.status,
                      ) && (
                        <Link
                          href={`/resultados/registrar?match=${match.id}`}
                          className="text-sm font-semibold text-emerald-400 hover:text-emerald-300"
                        >
                          Abrir jogo
                        </Link>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-sm text-slate-400">
                  Nenhum confronto encontrado neste filtro.
                </div>
              )}
            </div>
          </article>

          <aside className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
            <div className="border-b border-slate-800 p-5 sm:p-6">
              <h2 className="text-xl font-semibold">Classificação da classe</h2>
              <p className="mt-1 text-sm text-slate-400">
                Critérios: pontos, sets, games e maior idade.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead className="bg-slate-950/70 text-xs uppercase text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Pos.</th>
                    <th className="px-4 py-3">Atleta</th>
                    <th className="px-4 py-3 text-center">Pts.</th>
                    <th className="px-4 py-3 text-center">Sets</th>
                    <th className="px-4 py-3 text-center">Games</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800">
                  {standings.map((standing) => (
                    <tr
                      key={`${standing.position}-${standing.athlete}`}
                      className={
                        standing.currentUser
                          ? "bg-emerald-400/10 text-emerald-100"
                          : "text-slate-300"
                      }
                    >
                      <td className="px-4 py-4 font-bold">
                        {standing.position}º
                      </td>
                      <td className="px-4 py-4 font-medium">
                        {standing.athlete}
                      </td>
                      <td className="px-4 py-4 text-center font-bold">
                        {standing.points}
                      </td>
                      <td className="px-4 py-4 text-center">
                        {formatBalance(standing.setBalance)}
                      </td>
                      <td className="px-4 py-4 text-center">
                        {formatBalance(standing.gameBalance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t border-slate-800 p-5">
              <Link
                href="/classificacao"
                className="block rounded-xl border border-slate-700 px-4 py-3 text-center text-sm font-semibold transition hover:border-emerald-500 hover:text-emerald-400"
              >
                Ver classificação completa
              </Link>
            </div>
          </aside>
        </div>

        <section className="mt-8">
          <h2 className="mb-4 text-xl font-semibold">Acesso rápido</h2>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                href: "/resultados/registrar",
                title: "Registrar resultado",
                description: "Informe o placar do seu confronto.",
              },
              {
                href: "/classificacao",
                title: "Classificação",
                description: "Consulte a tabela da temporada.",
              },
              {
                href: "/historico",
                title: "Histórico",
                description: "Veja suas partidas anteriores.",
              },
              {
                href: "/notificacoes",
                title: "Notificações",
                description: "Acompanhe avisos e confirmações.",
              },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:-translate-y-0.5 hover:border-emerald-500/60 hover:bg-slate-900/80"
              >
                <h3 className="font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {item.description}
                </p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
