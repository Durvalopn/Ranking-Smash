"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { buildRoundDraw, type DrawAthlete, type ExistingMatch } from "@/lib/round-draw";

export type AdminSeason = {
  id: string;
  name: string;
  year: number;
  status: "registration" | "active" | "planned" | "open" | "closed" | "finished" | "cancelled";
  roundsCount?: number;
};

export type AdminRound = {
  id: string;
  seasonId: string;
  number: number;
  status: "draft" | "open" | "drawn" | "closed" | "cancelled" | "planned";
  startsAt?: string | null;
  endsAt?: string | null;
  matchesCount?: number;
};

export type AdminMatch = {
  id: string;
  seasonId: string;
  roundId: string;
  classNumber: number;
  athleteOneName: string;
  athleteTwoName?: string | null;
  status: string;
};

export type AdminPanelStats = {
  activeAthletes: number;
  licensedAthletes: number;
  openMatches: number;
  contestedMatches: number;
};

type Props = {
  seasons?: AdminSeason[];
  rounds?: AdminRound[];
  matches?: AdminMatch[];
  stats?: AdminPanelStats;
  onRefresh?: () => Promise<void>;
};

type DbAthlete = DrawAthlete;
type DbMatch = ExistingMatch & { round_id: string };
type DbRound = { id: string; round_number: number; status: AdminRound["status"] };

const statusLabel: Record<string, string> = {
  registration: "Em inscrição",
  active: "Ativa",
  planned: "Planejada",
  open: "Aberta",
  drawn: "Sorteada",
  draft: "Rascunho",
  closed: "Encerrada",
  finished: "Finalizada",
  cancelled: "Cancelada",
};

const date = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value))
    : "Ainda não definida";

export default function AdminPanel({
  seasons = [],
  rounds = [],
  matches = [],
  stats = { activeAthletes: 0, licensedAthletes: 0, openMatches: 0, contestedMatches: 0 },
  onRefresh,
}: Props) {
  const db = createClient() as any;
  const [seasonId, setSeasonId] = useState(
    seasons.find((season) => ["registration", "active", "planned", "open"].includes(season.status))?.id ??
      seasons[0]?.id ??
      "",
  );
  const [generating, setGenerating] = useState(false);
  const [movementBusy, setMovementBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const season = seasons.find((item) => item.id === seasonId);
  const seasonRounds = useMemo(
    () => rounds.filter((round) => round.seasonId === seasonId).sort((left, right) => right.number - left.number),
    [rounds, seasonId],
  );
  const current = seasonRounds.find((round) => round.status === "open") ?? seasonRounds[0];
  const nextRoundNumber = Math.max(0, ...seasonRounds.map((round) => round.number)) + 1;
  const roundLimit = season?.roundsCount ?? 0;
  const canGenerate = Boolean(
    season &&
      ["registration", "active"].includes(season.status) &&
      (nextRoundNumber <= roundLimit || seasonRounds.some((round) => round.status === "open" && !round.matchesCount)),
  );

  function clearFeedback() {
    setMessage("");
    setError("");
  }

  async function generateRound() {
    clearFeedback();
    if (!season || !["registration", "active"].includes(season.status)) {
      setError("Selecione uma temporada em inscrição ou ativa para gerar uma rodada.");
      return;
    }

    setGenerating(true);
    try {
      const { data: roundRows, error: roundsError } = await db
        .from("rounds")
        .select("id,round_number,status")
        .eq("season_id", season.id)
        .order("round_number", { ascending: true });
      if (roundsError) throw new Error(`Não foi possível consultar as rodadas: ${roundsError.message}`);

      const liveRounds = (roundRows ?? []) as DbRound[];
      const { data: existingMatches, error: matchesError } = await db
        .from("matches")
        .select("round_id,athlete_one_id,athlete_two_id")
        .eq("season_id", season.id);
      if (matchesError) throw new Error(`Não foi possível consultar os confrontos anteriores: ${matchesError.message}`);

      const allMatches = (existingMatches ?? []) as DbMatch[];
      const openRound = [...liveRounds]
        .filter((round) => round.status === "open")
        .sort((left, right) => right.round_number - left.round_number)[0];
      if (openRound && allMatches.some((match) => match.round_id === openRound.id)) {
        throw new Error(`A Rodada ${openRound.round_number} já está aberta. Encerre-a antes de gerar a próxima.`);
      }

      const roundNumber = openRound?.round_number ?? Math.max(0, ...liveRounds.map((round) => round.round_number)) + 1;
      if (roundNumber > (season.roundsCount ?? 0)) {
        throw new Error(`A temporada já atingiu o limite de ${season.roundsCount ?? 0} rodadas.`);
      }

      const { data: athleteRows, error: athletesError } = await db
        .from("athletes")
        .select("id,current_class,status")
        .in("status", ["active", "licensed"])
        .order("id", { ascending: true });
      if (athletesError) throw new Error(`Não foi possível carregar os atletas: ${athletesError.message}`);

      const athletes = (athleteRows ?? []) as DbAthlete[];
      const activeAthletes = athletes.filter((athlete) => athlete.status === "active");
      if (activeAthletes.length === 0) {
        throw new Error("Não há atletas ativos para sortear nesta temporada.");
      }

      const seed = crypto.randomUUID();
      const draw = buildRoundDraw(activeAthletes, allMatches, seed);
      if (draw.length === 0) throw new Error("O sorteio não gerou partidas para os atletas ativos.");

      const now = new Date().toISOString();
      const assignments = athletes.map((athlete) => ({
        season_id: season.id,
        athlete_id: athlete.id,
        class_number: athlete.current_class,
        source: "season_start",
        created_at: now,
      }));
      const { error: assignmentError } = await db
        .from("season_athlete_classes")
        .upsert(assignments, { onConflict: "season_id,athlete_id", ignoreDuplicates: true });
      if (assignmentError) {
        throw new Error(`Não foi possível registrar as classes da temporada: ${assignmentError.message}`);
      }

      if (season.status === "registration") {
        const { data: activatedSeason, error: seasonError } = await db
          .from("seasons")
          .update({ status: "active" })
          .eq("id", season.id)
          .select("id")
          .maybeSingle();
        if (seasonError) throw new Error(`Não foi possível iniciar a temporada: ${seasonError.message}`);
        if (!activatedSeason) throw new Error("O banco não permitiu iniciar a temporada selecionada.");
      }

      let roundId = openRound?.id;
      if (!roundId) {
        const { data: newRound, error: createRoundError } = await db
          .from("rounds")
          .insert({
            season_id: season.id,
            round_number: roundNumber,
            name: `Rodada ${roundNumber}`,
            status: "open",
          })
          .select("id")
          .single();
        if (createRoundError) throw new Error(`Não foi possível criar a Rodada ${roundNumber}: ${createRoundError.message}`);
        roundId = newRound.id;
      }

      const matchRows = draw.map((pair) => ({
        season_id: season.id,
        round_id: roundId,
        class_number: pair.classNumber,
        athlete_one_id: pair.athleteOneId,
        athlete_two_id: pair.athleteTwoId,
        draw_order: pair.drawOrder,
        status: pair.isBye ? "completed" : "scheduled",
        result_type: pair.isBye ? "bye" : null,
        athlete_one_sets: 0,
        athlete_two_sets: 0,
        athlete_one_games: 0,
        athlete_two_games: 0,
        athlete_one_points: pair.isBye ? 7 : 0,
        athlete_two_points: 0,
        winner_athlete_id: null,
        seed,
        draw_cost: 0,
        justification: pair.justification,
        audit: { seed, is_bye: pair.isBye, generated_by: "admin_panel" },
        created_at: now,
        updated_at: now,
      }));
      const { error: drawError } = await db.from("matches").insert(matchRows);
      if (drawError) {
        const details = [drawError.message, drawError.details, drawError.hint].filter(Boolean).join(" ");
        throw new Error(`Não foi possível gravar as partidas da Rodada ${roundNumber}. ${details}`);
      }

      const { error: standingsError } = await db.rpc("refresh_season_standings", { p_season_id: season.id });
      const byeCount = draw.filter((pair) => pair.isBye).length;
      const drawMessage =
        `Rodada ${roundNumber} gerada com ${draw.length} partida(s)` +
        (byeCount ? ` e ${byeCount} BYE(s)` : "") +
        ".";
      if (standingsError) {
        setError(`${drawMessage} Não foi possível atualizar a classificação: ${standingsError.message}`);
      } else {
        setMessage(drawMessage);
      }
      await onRefresh?.();
    } catch (generationError) {
      const errorMessage = generationError instanceof Error ? generationError.message : "Não foi possível gerar a rodada.";
      setError(errorMessage);
      if (onRefresh) {
        try {
          await onRefresh();
        } catch (refreshError) {
          const refreshMessage = refreshError instanceof Error ? refreshError.message : "erro desconhecido";
          setError(`${errorMessage} O painel também não pôde ser atualizado: ${refreshMessage}`);
        }
      }
    } finally {
      setGenerating(false);
    }
  }

  async function applyMovement() {
    clearFeedback();
    if (!season || season.status !== "finished") {
      setError("Finalize a temporada antes de aplicar acesso e rebaixamento.");
      return;
    }
    setMovementBusy(true);
    const { error: rpcError } = await db.rpc("apply_season_class_movements", { p_season_id: season.id });
    if (rpcError) setError(`Não foi possível aplicar acesso/rebaixamento: ${rpcError.message}`);
    else setMessage("Acesso e rebaixamento aplicados com sucesso.");
    setMovementBusy(false);
  }

  return (
    <section className="mt-8 rounded-2xl border border-emerald-500/30 bg-slate-900/70 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-300">Painel administrativo</p>
          <h2 className="mt-2 text-2xl font-bold text-white">Rodadas e sorteios</h2>
          <p className="mt-2 text-slate-400">Gere rodadas, lance resultados, finalize temporadas e aplique os movimentos de classe.</p>
        </div>
        <Link href="/classificacao" className="text-sm font-semibold text-emerald-300">Ver classificação</Link>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void generateRound()}
          disabled={generating || !canGenerate}
          className="rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {generating ? "Gerando rodada..." : "Gerar rodada"}
        </button>
        <button
          type="button"
          disabled={!current || current.status !== "open"}
          className="rounded-lg border border-amber-400/50 px-4 py-2 font-semibold text-amber-200 disabled:opacity-40"
        >
          Fechar rodada
        </button>
        <button
          type="button"
          disabled={!season || season.status !== "closed"}
          className="rounded-lg border border-violet-400/50 px-4 py-2 font-semibold text-violet-200 disabled:opacity-40"
        >
          Finalizar temporada
        </button>
        <button
          type="button"
          onClick={() => void applyMovement()}
          disabled={movementBusy || !season || season.status !== "finished"}
          className="rounded-lg border border-emerald-400/50 px-4 py-2 font-semibold text-emerald-200 disabled:opacity-40"
        >
          {movementBusy ? "Aplicando..." : "Aplicar acesso/rebaixamento"}
        </button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <label className="text-sm text-slate-300">
          Temporada
          <select
            value={seasonId}
            onChange={(event) => {
              setSeasonId(event.target.value);
              clearFeedback();
            }}
            disabled={generating}
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white disabled:opacity-50"
          >
            <option value="">Selecione</option>
            {seasons.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} {item.year} · {statusLabel[item.status] ?? item.status}
              </option>
            ))}
          </select>
        </label>
        <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4 text-sm text-slate-300">
          <p>
            Ativos: <strong className="text-white">{stats.activeAthletes}</strong> · Licenciados:{" "}
            <strong className="text-white">{stats.licensedAthletes}</strong> · Partidas abertas:{" "}
            <strong className="text-white">{stats.openMatches}</strong>
          </p>
          <p className="mt-2 text-slate-500">
            {season ? `${seasonRounds.length} rodada(s) gerada(s) nesta temporada.` : "Selecione uma temporada para administrar."}
          </p>
        </div>
      </div>

      {message && <p className="mt-4 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-300">{message}</p>}
      {error && <p className="mt-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {seasonRounds.map((round) => (
          <div key={round.id} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/40 p-4">
            <div>
              <p className="font-semibold text-white">Rodada {round.number}</p>
              <p className="text-sm text-slate-400">
                {round.matchesCount ?? 0} partida(s) · {statusLabel[round.status] ?? round.status} · Finaliza em{" "}
                {date(round.endsAt)}
              </p>
            </div>
            <Link href={`/partidas?round=${round.id}`} className="text-sm font-semibold text-emerald-300">
              Ver partidas
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
