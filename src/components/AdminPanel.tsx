"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

type DbAthlete = DrawAthlete & { user_id: string };
type DbMatch = ExistingMatch & {
  id: string;
  round_id: string;
  status: string;
  result_type: string | null;
  athlete_one_points: number | null;
  athlete_two_points: number | null;
  athlete_one_sets: number | null;
  athlete_two_sets: number | null;
  athlete_one_games: number | null;
  athlete_two_games: number | null;
};
type DbRound = { id: string; round_number: number; status: AdminRound["status"] };
type LicensedAthlete = { id: string };
type RoundParticipant = { athlete_one_id: string; athlete_two_id: string | null };
type SeasonClassAssignment = { athlete_id: string; class_number: number };
type DrawIdentity = { id: string; birth_date: string | null };
type DrawMatchEvent = { round_id: string; athlete_id: string; event_type: string; points: number };

const completedMatchStatuses = new Set(["result_submitted", "completed", "confirmed", "walkover"]);

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
  const [closingRound, setClosingRound] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const reconciledRounds = useRef(new Set<string>());
  const automaticSeasonActions = useRef(new Set<string>());

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

  async function recordLicensedPoints(roundId: string, roundNumber: number) {
    if (!season) throw new Error("Selecione uma temporada antes de registrar os pontos.");

    const [athleteResult, assignmentResult, matchResult, eventResult] = await Promise.all([
      db.from("athletes").select("id").eq("status", "licensed"),
      db.from("season_athlete_classes").select("athlete_id").eq("season_id", season.id),
      db.from("matches").select("athlete_one_id,athlete_two_id").eq("round_id", roundId),
      db.from("match_events").select("athlete_id").eq("round_id", roundId).eq("event_type", "licensed"),
    ]);
    if (athleteResult.error) throw new Error(`Não foi possível consultar os atletas licenciados: ${athleteResult.error.message}`);
    if (assignmentResult.error) throw new Error(`Não foi possível consultar os atletas inscritos na temporada: ${assignmentResult.error.message}`);
    if (matchResult.error) throw new Error(`Não foi possível consultar os participantes da Rodada ${roundNumber}: ${matchResult.error.message}`);
    if (eventResult.error) throw new Error(`Não foi possível consultar os pontos de licenciamento: ${eventResult.error.message}`);

    const assignedAthletes = new Set(((assignmentResult.data ?? []) as { athlete_id: string }[]).map((assignment) => assignment.athlete_id));
    const participants = new Set(
      ((matchResult.data ?? []) as RoundParticipant[]).flatMap((match) =>
        [match.athlete_one_id, match.athlete_two_id].filter((athleteId): athleteId is string => Boolean(athleteId)),
      ),
    );
    const alreadyCredited = new Set(((eventResult.data ?? []) as { athlete_id: string }[]).map((event) => event.athlete_id));
    const credits = ((athleteResult.data ?? []) as LicensedAthlete[])
      .filter((athlete) => assignedAthletes.has(athlete.id) && !participants.has(athlete.id) && !alreadyCredited.has(athlete.id))
      .map((athlete) => ({
        id: crypto.randomUUID(),
        season_id: season.id,
        round_id: roundId,
        match_id: null,
        athlete_id: athlete.id,
        event_type: "licensed",
        points: 3,
        set_balance_delta: 0,
        game_balance_delta: 0,
        wins_delta: 0,
        losses_delta: 0,
        metadata: { source: "licensed_status", round_number: roundNumber },
        created_at: new Date().toISOString(),
      }));

    if (!credits.length) return;
    const { error: insertError } = await db.from("match_events").insert(credits);
    if (insertError) {
      throw new Error(`Não foi possível registrar os pontos dos licenciados na Rodada ${roundNumber}: ${insertError.message}`);
    }
  }

  async function finalizeSeasonAutomatically(targetSeason: AdminSeason) {
    if (automaticSeasonActions.current.has(targetSeason.id)) return false;
    automaticSeasonActions.current.add(targetSeason.id);
    let completed = false;
    try {
      const { data: seasonState, error: seasonQueryError } = await db
        .from("seasons")
        .select("id,status,rounds_count,class_movement_applied_at")
        .eq("id", targetSeason.id)
        .single();
      if (seasonQueryError) throw new Error(`Não foi possível verificar a temporada: ${seasonQueryError.message}`);

      const requiredRounds = seasonState.rounds_count ?? 0;
      if (requiredRounds < 1) return false;

      const { data: roundRows, error: roundsError } = await db
        .from("rounds")
        .select("id,round_number,status")
        .eq("season_id", targetSeason.id);
      if (roundsError) throw new Error(`Não foi possível verificar as rodadas da temporada: ${roundsError.message}`);
      if (
        !roundRows ||
        roundRows.length !== requiredRounds ||
        roundRows.some((round: { round_number: number; status: string }) =>
          round.round_number > requiredRounds || !["closed", "finished"].includes(round.status),
        )
      ) {
        return false;
      }

      const { data: roundMatches, error: matchesError } = await db
        .from("matches")
        .select("id,status")
        .eq("season_id", targetSeason.id);
      if (matchesError) throw new Error(`Não foi possível verificar as partidas da temporada: ${matchesError.message}`);
      const pendingMatches = (roundMatches ?? []).filter(
        (match: { id: string; status: string }) =>
          !["completed", "confirmed", "result_submitted", "walkover"].includes(match.status),
      );
      if (pendingMatches.length) return false;

      if (seasonState.status !== "finished") {
        const { data: finishedSeason, error: finishError } = await db
          .from("seasons")
          .update({ status: "finished" })
          .eq("id", targetSeason.id)
          .in("status", ["active", "closed"])
          .select("id")
          .maybeSingle();
        if (finishError) throw new Error(`Não foi possível finalizar a temporada: ${finishError.message}`);
        if (!finishedSeason) throw new Error("A temporada mudou de estado antes da finalização automática.");
      }

      if (seasonState.class_movement_applied_at) {
        completed = true;
        return true;
      }

      const { error: movementError } = await db.rpc("apply_season_class_movements", {
        p_season_id: targetSeason.id,
      });
      if (movementError) {
        throw new Error(`A temporada foi finalizada, mas não foi possível aplicar a movimentação automática: ${movementError.message}`);
      }

      const { data: updatedState, error: verifyError } = await db
        .from("seasons")
        .select("class_movement_applied_at")
        .eq("id", targetSeason.id)
        .single();
      if (verifyError) throw new Error(`Não foi possível confirmar a movimentação de classes: ${verifyError.message}`);
      if (!updatedState.class_movement_applied_at) {
        throw new Error("A movimentação foi solicitada, mas o banco não confirmou a atualização das classes.");
      }
      completed = true;
      return true;
    } catch (automaticError) {
      throw automaticError;
    } finally {
      if (!completed) automaticSeasonActions.current.delete(targetSeason.id);
    }
  }

  useEffect(() => {
    if (!season) return;
    const closedRounds = seasonRounds.filter((round) => ["closed", "finished"].includes(round.status));
    void (async () => {
      for (const round of closedRounds) {
        const reconciliationKey = `${season.id}:${round.id}`;
        if (reconciledRounds.current.has(reconciliationKey)) continue;
        reconciledRounds.current.add(reconciliationKey);
        try {
          await recordLicensedPoints(round.id, round.number);
        } catch (reconciliationError) {
          reconciledRounds.current.delete(reconciliationKey);
          throw reconciliationError;
        }
      }
      const { error: standingsError } = await db.rpc("refresh_season_standings", { p_season_id: season.id });
      if (standingsError) {
        throw new Error(`Não foi possível atualizar a classificação dos licenciados: ${standingsError.message}`);
      }
    })().catch((reconciliationError) => {
      setError(reconciliationError instanceof Error ? reconciliationError.message : "Não foi possível reconciliar os pontos dos licenciados.");
    });
  }, [season, seasonRounds]);

  useEffect(() => {
    if (!season || !seasonRounds.length) return;
    if (!seasonRounds.every((round) => ["closed", "finished"].includes(round.status))) return;
    void finalizeSeasonAutomatically(season)
      .then((completed) => completed ? onRefresh?.() : undefined)
      .catch((automaticError) => {
        setError(automaticError instanceof Error ? automaticError.message : "Não foi possível finalizar a temporada automaticamente.");
      });
  }, [season, seasonRounds]);

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
        .select("id,round_id,athlete_one_id,athlete_two_id,result_type,status,athlete_one_points,athlete_two_points,athlete_one_sets,athlete_two_sets,athlete_one_games,athlete_two_games")
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
      const isFinalRound = roundNumber === season.roundsCount;
      if (isFinalRound) {
        const previousRounds = liveRounds.filter((round) => round.round_number < roundNumber);
        if (
          previousRounds.length !== roundNumber - 1 ||
          previousRounds.some((round) => !["closed", "finished"].includes(round.status))
        ) {
          throw new Error("Encerre todas as rodadas anteriores antes de gerar o sorteio decisivo da temporada.");
        }
      }

      const closedRounds = [...liveRounds]
        .filter((round) => ["closed", "finished"].includes(round.status))
        .sort((left, right) => right.round_number - left.round_number);
      for (const closedRound of closedRounds) {
        await recordLicensedPoints(closedRound.id, closedRound.round_number);
      }

      const [athleteResult, assignmentResult, profileResult, eventResult] = await Promise.all([
        db.from("athletes").select("id,user_id,current_class,status").in("status", ["active", "licensed"]).order("id", { ascending: true }),
        db.from("season_athlete_classes").select("athlete_id,class_number").eq("season_id", season.id),
        fetch("/api/admin/athletes/identities", { cache: "no-store" }),
        db.from("match_events").select("round_id,athlete_id,event_type,points").eq("season_id", season.id).in("event_type", ["bye", "licensed"]),
      ]);
      if (athleteResult.error) throw new Error(`Não foi possível carregar os atletas: ${athleteResult.error.message}`);
      if (assignmentResult.error) throw new Error(`Não foi possível consultar as classes da temporada: ${assignmentResult.error.message}`);
      if (eventResult.error) throw new Error(`Não foi possível consultar os pontos adicionais: ${eventResult.error.message}`);
      const identityPayload = await profileResult.json().catch(() => ({}));
      if (!profileResult.ok) {
        throw new Error(identityPayload.error ?? "Não foi possível consultar as datas de nascimento dos atletas.");
      }

      const athletes = (athleteResult.data ?? []) as DbAthlete[];
      const seasonClassByAthlete = new Map(
        ((assignmentResult.data ?? []) as SeasonClassAssignment[]).map((assignment) => [assignment.athlete_id, assignment.class_number]),
      );
      const birthDateByAthlete = new Map(
        ((identityPayload.athletes ?? []) as DrawIdentity[]).map((identity) => [identity.id, identity.birth_date]),
      );
      const drawAthletes = athletes.map((athlete) => ({
        ...athlete,
        current_class: seasonClassByAthlete.get(athlete.id) ?? athlete.current_class,
        birth_date: birthDateByAthlete.get(athlete.id) ?? null,
        points: 0,
        set_balance: 0,
        game_balance: 0,
      }));
      const athleteById = new Map(drawAthletes.map((athlete) => [athlete.id, athlete]));
      const closedRoundIds = new Set(
        liveRounds.filter((round) => ["closed", "finished"].includes(round.status)).map((round) => round.id),
      );
      const standingsThroughRound = roundNumber - 1;
      const standingsRoundIds = new Set(
        liveRounds
          .filter((round) => round.round_number <= standingsThroughRound && ["closed", "finished"].includes(round.status))
          .map((round) => round.id),
      );
      for (const match of allMatches) {
        if (!standingsRoundIds.has(match.round_id) || !completedMatchStatuses.has(match.status)) continue;
        const first = athleteById.get(match.athlete_one_id);
        const second = match.athlete_two_id ? athleteById.get(match.athlete_two_id) : null;
        if (!first) continue;
        first.points = (first.points ?? 0) + (match.athlete_one_points ?? 0);
        first.set_balance = (first.set_balance ?? 0) + (match.athlete_one_sets ?? 0) - (match.athlete_two_sets ?? 0);
        first.game_balance = (first.game_balance ?? 0) + (match.athlete_one_games ?? 0) - (match.athlete_two_games ?? 0);
        if (second) {
          second.points = (second.points ?? 0) + (match.athlete_two_points ?? 0);
          second.set_balance = (second.set_balance ?? 0) + (match.athlete_two_sets ?? 0) - (match.athlete_one_sets ?? 0);
          second.game_balance = (second.game_balance ?? 0) + (match.athlete_two_games ?? 0) - (match.athlete_one_games ?? 0);
        }
      }
      for (const event of (eventResult.data ?? []) as DrawMatchEvent[]) {
        if (!standingsRoundIds.has(event.round_id)) continue;
        const athlete = athleteById.get(event.athlete_id);
        if (athlete) athlete.points = (athlete.points ?? 0) + event.points;
      }

      const activeAthletes = drawAthletes.filter((athlete) => athlete.status === "active");
      if (activeAthletes.length === 0) {
        throw new Error("Não há atletas ativos para sortear nesta temporada.");
      }

      const seed = crypto.randomUUID();
      const historicalMatches = allMatches.filter(
        (match) => closedRoundIds.has(match.round_id) && completedMatchStatuses.has(match.status),
      );
      const draw = buildRoundDraw(drawAthletes, historicalMatches, seed, { finalRound: isFinalRound });
      if (draw.length === 0) throw new Error("O sorteio não gerou partidas para os atletas ativos.");

      const now = new Date().toISOString();
      const assignments = drawAthletes.map((athlete) => ({
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
        id: crypto.randomUUID(),
        season_id: season.id,
        round_id: roundId,
        class_number: pair.classNumber,
        athlete_one_id: pair.athleteOneId,
        athlete_two_id: pair.athleteTwoId,
        draw_order: pair.drawOrder,
        status: pair.isBye ? "completed" : "scheduled",
        result_type: pair.isBye ? "double_walkover" : "normal",
        athlete_one_sets: 0,
        athlete_two_sets: 0,
        athlete_one_games: 0,
        athlete_two_games: 0,
        athlete_one_points: 0,
        athlete_two_points: 0,
        winner_athlete_id: null,
        seed,
        draw_cost: 0,
        justification: pair.justification,
        audit: { seed, is_bye: pair.isBye, generated_by: "admin_panel" },
        created_at: now,
        updated_at: now,
      }));
      const { data: insertedMatches, error: drawError } = await db.from("matches").insert(matchRows).select("id");
      if (drawError) {
        const details = [drawError.message, drawError.details, drawError.hint].filter(Boolean).join(" ");
        throw new Error(`Não foi possível gravar as partidas da Rodada ${roundNumber}. ${details}`);
      }
      if (insertedMatches?.length !== matchRows.length) {
        throw new Error(`Foram gravadas ${insertedMatches?.length ?? 0} de ${matchRows.length} partidas da Rodada ${roundNumber}.`);
      }

      const byeEvents = matchRows
        .filter((match) => match.result_type === "double_walkover")
        .map((match) => ({
          id: crypto.randomUUID(),
          season_id: season.id,
          round_id: roundId,
          match_id: match.id,
          athlete_id: match.athlete_one_id,
          event_type: "bye",
          points: 7,
          set_balance_delta: 0,
          game_balance_delta: 0,
          wins_delta: 0,
          losses_delta: 0,
          metadata: { seed, generated_by: "admin_panel" },
          created_at: now,
        }));
      if (byeEvents.length) {
        const { error: eventsError } = await db.from("match_events").insert(byeEvents);
        if (eventsError) {
          throw new Error(
            `As partidas foram criadas, mas os pontos dos BYEs não foram registrados: ${eventsError.message}`,
          );
        }
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

  async function closeRound() {
    clearFeedback();
    if (!season || !current || current.status !== "open") {
      setError("Selecione uma temporada com uma rodada aberta para encerrá-la.");
      return;
    }

    setClosingRound(true);
    try {
      const { data: roundMatches, error: matchesError } = await db
        .from("matches")
        .select("id,status")
        .eq("season_id", season.id)
        .eq("round_id", current.id);
      if (matchesError) throw new Error(`Não foi possível verificar os resultados da rodada: ${matchesError.message}`);
      if (!roundMatches?.length) throw new Error(`A Rodada ${current.number} não tem partidas para encerrar.`);

      const pendingMatches = roundMatches.filter(
        (match: { id: string; status: string }) =>
          !["completed", "confirmed", "result_submitted", "walkover"].includes(match.status),
      );
      if (pendingMatches.length) {
        throw new Error(
          `Ainda há ${pendingMatches.length} partida(s) sem resultado na Rodada ${current.number}. Lance todos os resultados antes de encerrar.`,
        );
      }

      await recordLicensedPoints(current.id, current.number);

      const { data: closedRound, error: closeError } = await db
        .from("rounds")
        .update({ status: "closed" })
        .eq("id", current.id)
        .eq("status", "open")
        .select("id")
        .maybeSingle();
      if (closeError) throw new Error(`Não foi possível encerrar a Rodada ${current.number}: ${closeError.message}`);
      if (!closedRound) throw new Error("A rodada deixou de estar aberta ou você não tem permissão para encerrá-la.");

      const { error: standingsError } = await db.rpc("refresh_season_standings", { p_season_id: season.id });
      if (standingsError) {
        setError(`Rodada ${current.number} encerrada, mas não foi possível atualizar a classificação: ${standingsError.message}`);
      } else {
        const finalized = await finalizeSeasonAutomatically(season);
        const isFinalRound = current.number >= roundLimit;
        setMessage(
          isFinalRound && finalized
            ? `Rodada ${current.number} encerrada. Temporada finalizada e movimentação de classes aplicada automaticamente.`
            : `Rodada ${current.number} encerrada com sucesso.`,
        );
      }
      await onRefresh?.();
    } catch (closeError) {
      const errorMessage = closeError instanceof Error ? closeError.message : "Não foi possível encerrar a rodada.";
      setError(errorMessage);
      try {
        await onRefresh?.();
      } catch (refreshError) {
        const refreshMessage = refreshError instanceof Error ? refreshError.message : "erro desconhecido";
        setError(`${errorMessage} O painel também não pôde ser atualizado: ${refreshMessage}`);
      }
    } finally {
      setClosingRound(false);
    }
  }

  return (
    <section className="mt-8 rounded-2xl border border-emerald-500/30 bg-slate-900/70 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-300">Painel administrativo</p>
          <h2 className="mt-2 text-2xl font-bold text-white">Rodadas e sorteios</h2>
          <p className="mt-2 text-slate-400">Gere rodadas, lance resultados e acompanhe os movimentos automáticos de classe.</p>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/admin/resultados" className="text-sm font-semibold text-amber-200">Corrigir resultados</Link>
          <Link href="/classificacao" className="text-sm font-semibold text-emerald-300">Ver classificação</Link>
        </div>
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
          onClick={() => void closeRound()}
          disabled={closingRound || generating || !current || current.status !== "open"}
          className="rounded-lg border border-amber-400/50 px-4 py-2 font-semibold text-amber-200 disabled:opacity-40"
        >
          {closingRound ? "Fechando rodada..." : "Fechar rodada"}
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
