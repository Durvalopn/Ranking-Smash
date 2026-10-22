"use client";

import { FormEvent, useMemo, useState } from "react";

type SeasonStatus = "planned" | "open" | "closed" | "cancelled";
type RoundStatus = "planned" | "open" | "closed" | "cancelled";
type MatchStatus =
  | "scheduled"
  | "pending"
  | "awaiting_result"
  | "result_submitted"
  | "confirmed"
  | "contested"
  | "completed"
  | "walkover"
  | "cancelled";

export interface AdminSeason {
  id: string;
  name: string;
  year: number;
  status: SeasonStatus;
  currentRound?: number | null;
}

export interface AdminRound {
  id: string;
  seasonId: string;
  number: number;
  status: RoundStatus;
  startsAt?: string | null;
  endsAt?: string | null;
  matchesCount?: number;
}

export interface AdminMatch {
  id: string;
  seasonId: string;
  roundId: string;
  classNumber: number;
  athleteOneName: string;
  athleteTwoName?: string | null;
  status: MatchStatus;
}

export interface AdminPanelStats {
  activeAthletes: number;
  licensedAthletes: number;
  openMatches: number;
  contestedMatches: number;
}

interface AdminPanelProps {
  seasons?: AdminSeason[];
  rounds?: AdminRound[];
  matches?: AdminMatch[];
  stats?: Partial<AdminPanelStats>;
}

type Feedback = {
  type: "success" | "error" | "info";
  message: string;
} | null;

const seasonStatusLabels: Record<SeasonStatus, string> = {
  planned: "Planejada",
  open: "Aberta",
  closed: "Encerrada",
  cancelled: "Cancelada",
};

const roundStatusLabels: Record<RoundStatus, string> = {
  planned: "Planejada",
  open: "Aberta",
  closed: "Encerrada",
  cancelled: "Cancelada",
};

const matchStatusLabels: Record<MatchStatus, string> = {
  scheduled: "Agendada",
  pending: "Pendente",
  awaiting_result: "Aguardando resultado",
  result_submitted: "Resultado enviado",
  confirmed: "Confirmada",
  contested: "Contestada",
  completed: "Concluída",
  walkover: "WO",
  cancelled: "Cancelada",
};

const defaultStats: AdminPanelStats = {
  activeAthletes: 0,
  licensedAthletes: 0,
  openMatches: 0,
  contestedMatches: 0,
};

function formatDate(value?: string | null) {
  if (!value) {
    return "Não definida";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Data inválida";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function statusClass(status: string) {
  switch (status) {
    case "open":
    case "confirmed":
    case "completed":
      return "border-emerald-400/30 bg-emerald-400/10 text-emerald-300";

    case "contested":
    case "cancelled":
      return "border-red-400/30 bg-red-400/10 text-red-300";

    case "closed":
    case "walkover":
      return "border-violet-400/30 bg-violet-400/10 text-violet-300";

    case "result_submitted":
    case "awaiting_result":
      return "border-amber-400/30 bg-amber-400/10 text-amber-300";

    default:
      return "border-slate-500/40 bg-slate-500/10 text-slate-300";
  }
}

async function readResponse(response: Response) {
  const contentType = response.headers.get("content-type");

  if (contentType?.includes("application/json")) {
    return response.json() as Promise<Record<string, unknown>>;
  }

  return {
    message: await response.text(),
  };
}

function getErrorMessage(data: Record<string, unknown>) {
  if (typeof data.error === "string") {
    return data.error;
  }

  if (typeof data.message === "string") {
    return data.message;
  }

  return "Não foi possível concluir a operação.";
}

export default function AdminPanel({
  seasons = [],
  rounds = [],
  matches = [],
  stats: receivedStats = {},
}: AdminPanelProps) {
  const stats: AdminPanelStats = {
    ...defaultStats,
    ...receivedStats,
  };

  const [selectedSeasonId, setSelectedSeasonId] = useState(
    seasons.find((season) => season.status === "open")?.id ??
      seasons[0]?.id ??
      "",
  );

  const availableRounds = useMemo(
    () => rounds.filter((round) => round.seasonId === selectedSeasonId),
    [rounds, selectedSeasonId],
  );

  const [selectedRoundId, setSelectedRoundId] = useState(
    availableRounds.find((round) => round.status === "open")?.id ??
      availableRounds[0]?.id ??
      "",
  );

  const [feedback, setFeedback] = useState<Feedback>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const selectedSeason = seasons.find(
    (season) => season.id === selectedSeasonId,
  );

  const selectedRound = rounds.find((round) => round.id === selectedRoundId);

  const selectedSeasonMatches = useMemo(
    () =>
      matches.filter(
        (match) =>
          !selectedSeasonId || match.seasonId === selectedSeasonId,
      ),
    [matches, selectedSeasonId],
  );

  const contestedMatches = useMemo(
    () => matches.filter((match) => match.status === "contested"),
    [matches],
  );

  function handleSeasonChange(seasonId: string) {
    setSelectedSeasonId(seasonId);

    const seasonRounds = rounds.filter(
      (round) => round.seasonId === seasonId,
    );

    const nextRound =
      seasonRounds.find((round) => round.status === "open") ??
      seasonRounds.find((round) => round.status === "planned") ??
      seasonRounds[0];

    setSelectedRoundId(nextRound?.id ?? "");
    setFeedback(null);
  }

  async function handleDraw(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedSeasonId || !selectedRoundId) {
      setFeedback({
        type: "error",
        message: "Selecione uma temporada e uma rodada.",
      });
      return;
    }

    const confirmed = window.confirm(
      "Deseja gerar o sorteio desta rodada? A operação será registrada na auditoria.",
    );

    if (!confirmed) {
      return;
    }

    setIsDrawing(true);
    setFeedback({
      type: "info",
      message: "Gerando o sorteio inteligente...",
    });

    try {
      const response = await fetch("/api/admin/draw", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          seasonId: selectedSeasonId,
          roundId: selectedRoundId,
        }),
      });

      const data = await readResponse(response);

      if (!response.ok) {
        throw new Error(getErrorMessage(data));
      }

      const matchesCreated =
        typeof data.matchesCreated === "number"
          ? ` ${data.matchesCreated} confronto(s) foram criados.`
          : "";

      setFeedback({
        type: "success",
        message: `Sorteio concluído com sucesso.${matchesCreated}`,
      });

      window.setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Erro inesperado ao gerar o sorteio.",
      });
    } finally {
      setIsDrawing(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-col gap-5 border-b border-slate-800 pb-7 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">
              App Ranking Smash
            </p>

            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Painel administrativo
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Gerencie atletas, temporadas, rodadas, sorteios, resultados e
              contestações.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href="/dashboard"
              className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              Ver dashboard
            </a>

            <a
              href="/assistente"
              className="rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
            >
              Abrir assistente
            </a>
          </div>
        </header>

        {feedback && (
          <div
            role={feedback.type === "error" ? "alert" : "status"}
            aria-live="polite"
            className={`rounded-xl border px-4 py-3 text-sm ${
              feedback.type === "success"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                : feedback.type === "error"
                  ? "border-red-500/30 bg-red-500/10 text-red-200"
                  : "border-blue-500/30 bg-blue-500/10 text-blue-200"
            }`}
          >
            {feedback.message}
          </div>
        )}

        <section
          aria-label="Resumo administrativo"
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          <StatCard
            label="Atletas ativos"
            value={stats.activeAthletes}
            description="Aptos a participar"
            color="emerald"
          />

          <StatCard
            label="Atletas licenciados"
            value={stats.licensedAthletes}
            description="Com licença registrada"
            color="blue"
          />

          <StatCard
            label="Partidas em aberto"
            value={stats.openMatches}
            description="Aguardando conclusão"
            color="amber"
          />

          <StatCard
            label="Contestações"
            value={stats.contestedMatches}
            description="Exigem análise"
            color="red"
          />
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl shadow-black/10 sm:p-6">
            <div className="mb-6">
              <h2 className="text-xl font-bold">Controle da competição</h2>
              <p className="mt-1 text-sm text-slate-400">
                Selecione a temporada e a rodada que deseja administrar.
              </p>
            </div>

            <form onSubmit={handleDraw} className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm font-medium text-slate-200">
                  <span>Temporada</span>

                  <select
                    value={selectedSeasonId}
                    onChange={(event) =>
                      handleSeasonChange(event.target.value)
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
                  >
                    <option value="">Selecione uma temporada</option>

                    {seasons.map((season) => (
                      <option key={season.id} value={season.id}>
                        {season.name} — {season.year}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2 text-sm font-medium text-slate-200">
                  <span>Rodada</span>

                  <select
                    value={selectedRoundId}
                    onChange={(event) =>
                      setSelectedRoundId(event.target.value)
                    }
                    disabled={!selectedSeasonId}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none transition disabled:cursor-not-allowed disabled:opacity-50 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
                  >
                    <option value="">Selecione uma rodada</option>

                    {availableRounds.map((round) => (
                      <option key={round.id} value={round.id}>
                        Rodada {round.number} —{" "}
                        {roundStatusLabels[round.status]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4 sm:grid-cols-2">
                <InfoItem
                  label="Temporada"
                  value={
                    selectedSeason
                      ? seasonStatusLabels[selectedSeason.status]
                      : "Não selecionada"
                  }
                />

                <InfoItem
                  label="Rodada"
                  value={
                    selectedRound
                      ? roundStatusLabels[selectedRound.status]
                      : "Não selecionada"
                  }
                />

                <InfoItem
                  label="Abertura"
                  value={formatDate(selectedRound?.startsAt)}
                />

                <InfoItem
                  label="Encerramento"
                  value={formatDate(selectedRound?.endsAt)}
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  disabled={
                    isDrawing || !selectedSeasonId || !selectedRoundId
                  }
                  className="rounded-lg bg-emerald-500 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                >
                  {isDrawing
                    ? "Gerando sorteio..."
                    : "Gerar sorteio inteligente"}
                </button>

                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="rounded-lg border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500"
                >
                  Atualizar dados
                </button>
              </div>
            </form>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">Ações rápidas</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Áreas administrativas.
                </p>
              </div>
            </div>

            <nav aria-label="Ações administrativas">
              <ul className="space-y-3">
                <QuickAction
                  href="/admin/atletas"
                  title="Gerenciar atletas"
                  description="Classes, status e licenças"
                />

                <QuickAction
                  href="/admin/temporadas"
                  title="Gerenciar temporadas"
                  description="Abertura e encerramento"
                />

                <QuickAction
                  href="/admin/rodadas"
                  title="Gerenciar rodadas"
                  description="Prazos, sorteios e fechamento"
                />

                <QuickAction
                  href="/admin/resultados"
                  title="Revisar resultados"
                  description="Confirmações e contestações"
                />

                <QuickAction
                  href="/admin/auditoria"
                  title="Consultar auditoria"
                  description="Histórico de operações"
                />
              </ul>
            </nav>
          </section>
        </div>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-bold">Confrontos da temporada</h2>
              <p className="mt-1 text-sm text-slate-400">
                Acompanhe a situação dos jogos da temporada selecionada.
              </p>
            </div>

            <span className="text-sm text-slate-400">
              {selectedSeasonMatches.length} confronto(s)
            </span>
          </div>

          {selectedSeasonMatches.length === 0 ? (
            <EmptyState message="Nenhum confronto encontrado para esta temporada." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-3 py-3 font-semibold">Classe</th>
                    <th className="px-3 py-3 font-semibold">Atleta 1</th>
                    <th className="px-3 py-3 font-semibold">Atleta 2</th>
                    <th className="px-3 py-3 font-semibold">Situação</th>
                    <th className="px-3 py-3 text-right font-semibold">
                      Ação
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800">
                  {selectedSeasonMatches.map((match) => (
                    <tr key={match.id} className="hover:bg-slate-800/40">
                      <td className="px-3 py-4 text-slate-300">
                        Classe {match.classNumber}
                      </td>

                      <td className="px-3 py-4 font-medium text-white">
                        {match.athleteOneName}
                      </td>

                      <td className="px-3 py-4 text-slate-300">
                        {match.athleteTwoName ?? "Sem adversário"}
                      </td>

                      <td className="px-3 py-4">
                        <StatusBadge
                          className={statusClass(match.status)}
                          label={matchStatusLabels[match.status]}
                        />
                      </td>

                      <td className="px-3 py-4 text-right">
                        <a
                          href={`/admin/resultados/${match.id}`}
                          className="font-semibold text-emerald-400 hover:text-emerald-300 focus:outline-none focus:underline"
                        >
                          Analisar
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5 sm:p-6">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-red-100">
                Resultados contestados
              </h2>
              <p className="mt-1 text-sm text-red-200/70">
                Contestações devem ser analisadas antes do fechamento.
              </p>
            </div>

            <span className="rounded-full border border-red-400/30 bg-red-400/10 px-3 py-1 text-sm font-semibold text-red-200">
              {contestedMatches.length} pendente(s)
            </span>
          </div>

          {contestedMatches.length === 0 ? (
            <EmptyState message="Não existem contestações pendentes." />
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {contestedMatches.map((match) => (
                <li
                  key={match.id}
                  className="rounded-xl border border-red-400/20 bg-slate-950/50 p-4"
                >
                  <p className="text-sm text-red-200">
                    Classe {match.classNumber}
                  </p>

                  <p className="mt-1 font-semibold">
                    {match.athleteOneName} ×{" "}
                    {match.athleteTwoName ?? "Sem adversário"}
                  </p>

                  <a
                    href={`/admin/resultados/${match.id}`}
                    className="mt-3 inline-block text-sm font-semibold text-red-300 hover:text-red-200"
                  >
                    Revisar contestação
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  description: string;
  color: "emerald" | "blue" | "amber" | "red";
}

function StatCard({
  label,
  value,
  description,
  color,
}: StatCardProps) {
  const colorClasses = {
    emerald: "border-emerald-500/20 bg-emerald-500/5 text-emerald-300",
    blue: "border-blue-500/20 bg-blue-500/5 text-blue-300",
    amber: "border-amber-500/20 bg-amber-500/5 text-amber-300",
    red: "border-red-500/20 bg-red-500/5 text-red-300",
  };

  return (
    <article
      className={`rounded-2xl border p-5 ${colorClasses[color]}`}
    >
      <p className="text-sm font-medium text-slate-300">{label}</p>
      <p className="mt-2 text-3xl font-bold text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{description}</p>
    </article>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium text-slate-200">{value}</dd>
    </div>
  );
}

function StatusBadge({
  className,
  label,
}: {
  className: string;
  label: string;
}) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      {label}
    </span>
  );
}

function QuickAction({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <li>
      <a
        href={href}
        className="group flex items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-950/50 p-4 transition hover:border-emerald-500/40 hover:bg-slate-800/60 focus:outline-none focus:ring-2 focus:ring-emerald-400"
      >
        <span>
          <span className="block font-semibold text-white">{title}</span>
          <span className="mt-1 block text-xs text-slate-400">
            {description}
          </span>
        </span>

        <span
          aria-hidden="true"
          className="text-xl text-slate-500 transition group-hover:translate-x-1 group-hover:text-emerald-400"
        >
          →
        </span>
      </a>
    </li>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/40 px-5 py-8 text-center text-sm text-slate-400">
      {message}
    </div>
  );
}
