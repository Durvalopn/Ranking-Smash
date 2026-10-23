"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export type AdminSeason = { id: string; name: string; year: number; status: "registration" | "planned" | "open" | "closed" | "finished" | "cancelled"; roundsCount?: number };
export type AdminRound = { id: string; seasonId: string; number: number; status: "planned" | "open" | "closed" | "cancelled"; startsAt?: string | null; endsAt?: string | null; matchesCount?: number };
export type AdminMatch = { id: string; seasonId: string; roundId: string; classNumber: number; athleteOneName: string; athleteTwoName?: string | null; status: string };
export type AdminPanelStats = { activeAthletes: number; licensedAthletes: number; openMatches: number; contestedMatches: number };
type Snapshot = { athlete_id: string; class_number: number };
type Athlete = { id: string; status: string };

const unfinishedStatuses = ["scheduled", "pending", "awaiting_result"];
const formatDate = (value?: string | null) => value ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value)) : "Ainda não definida";
const statusLabel = (status: string) => ({ registration: "Em inscrição", planned: "Planejada", open: "Aberta", closed: "Encerrada", finished: "Finalizada" } as Record<string, string>)[status] ?? status;

export default function AdminPanel({ seasons = [], rounds = [], matches = [], stats }: { seasons?: AdminSeason[]; rounds?: AdminRound[]; matches?: AdminMatch[]; stats: AdminPanelStats }) {
  const [localSeasons, setLocalSeasons] = useState(seasons);
  const [localRounds, setLocalRounds] = useState(rounds);
  const [localMatches, setLocalMatches] = useState(matches);
  const [selectedSeasonId, setSelectedSeasonId] = useState(seasons.find((season) => ["registration", "planned", "open"].includes(season.status))?.id ?? seasons[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setLocalSeasons(seasons);
    setLocalRounds(rounds);
    setLocalMatches(matches);
    setSelectedSeasonId((current) => seasons.some((season) => season.id === current) ? current : seasons.find((season) => ["registration", "planned", "open"].includes(season.status))?.id ?? seasons[0]?.id ?? "");
  }, [seasons, rounds, matches]);

  const selectedSeason = localSeasons.find((season) => season.id === selectedSeasonId) ?? null;
  const seasonRounds = useMemo(() => localRounds.filter((round) => round.seasonId === selectedSeasonId).sort((a, b) => a.number - b.number), [localRounds, selectedSeasonId]);
  const currentRound = seasonRounds.find((round) => round.status === "open") ?? seasonRounds.at(-1) ?? null;
  const currentMatches = currentRound ? localMatches.filter((match) => match.roundId === currentRound.id) : [];
  const clearFeedback = () => { setMessage(""); setError(""); };

  async function ensureBye(roundId: string, seasonId: string) {
    const db = createClient() as any;
    const [{ data: snapshots }, { data: athletes }, { data: existing }] = await Promise.all([
      db.from("season_athlete_classes").select("athlete_id,class_number").eq("season_id", seasonId).order("class_number").order("athlete_id"),
      db.from("athletes").select("id,status").in("status", ["active", "licensed"]),
      db.from("matches").select("athlete_one_id").eq("round_id", roundId),
    ]);
    const activeIds = new Set((athletes ?? []).map((athlete: Athlete) => athlete.id));
    const byClass = new Map<number, string[]>();
    for (const snapshot of (snapshots ?? []) as Snapshot[]) {
      if (!activeIds.has(snapshot.athlete_id)) continue;
      byClass.set(snapshot.class_number, [...(byClass.get(snapshot.class_number) ?? []), snapshot.athlete_id]);
    }
    const used = new Set((existing ?? []).map((match: { athlete_one_id: string }) => match.athlete_one_id));
    const rows: Record<string, unknown>[] = [];
    let order = 1;
    for (const [classNumber, ids] of byClass) {
      const candidate = ids.length % 2 ? ids[ids.length - 1] : null;
      if (candidate && !used.has(candidate)) rows.push({ season_id: seasonId, round_id: roundId, class_number: classNumber, athlete_one_id: candidate, athlete_two_id: null, draw_order: 100000 + order++, status: "completed", result_type: "double_walkover", athlete_one_sets: 0, athlete_two_sets: 0, athlete_one_games: 0, athlete_two_games: 0, athlete_one_points: 0, athlete_two_points: 0, winner_athlete_id: null, justification: "BYE - atleta sem adversário na rodada", audit: { source: "admin_draw", bye: true } });
    }
    if (!rows.length) return [];
    const { data, error: insertError } = await db.from("matches").insert(rows).select("id,season_id,round_id,class_number,athlete_one_id,athlete_two_id,status,result_type");
    if (insertError) throw new Error(insertError.message);
    return data ?? [];
  }

  useEffect(() => {
    if (!currentRound || !selectedSeason || currentRound.status !== "open") return;
    void ensureBye(currentRound.id, selectedSeason.id).then((rows) => { if (rows.length) setMessage(`${rows.length} bye(s) registrado(s) nesta rodada.`); }).catch((reason) => setError(`Não foi possível registrar o bye: ${reason instanceof Error ? reason.message : "erro desconhecido"}`));
  }, [currentRound?.id, selectedSeason?.id]);

  async function generateRound() {
    clearFeedback();
    if (!selectedSeason) { setError("Selecione uma temporada."); return; }
    if (["finished", "cancelled"].includes(selectedSeason.status)) { setError("Esta temporada não pode receber novas rodadas."); return; }
    if (seasonRounds.some((round) => round.status === "open")) { setError("Feche a rodada aberta antes de gerar a próxima."); return; }
    const nextNumber = (seasonRounds.at(-1)?.number ?? 0) + 1;
    if (selectedSeason.roundsCount && nextNumber > selectedSeason.roundsCount) { setError("Todas as rodadas previstas já foram geradas."); return; }
    setBusy(true);
    const db = createClient() as any;
    const { data: round, error: roundError } = await db.from("rounds").insert({ season_id: selectedSeason.id, round_number: nextNumber, name: `Rodada ${nextNumber}`, status: "open", opens_at: new Date().toISOString() }).select("id,season_id,round_number,status,opens_at,closes_at").single();
    if (roundError || !round) { setError(roundError?.message || "Não foi possível gerar a rodada."); setBusy(false); return; }
    const [{ data: snapshots, error: snapshotError }, { data: athletes, error: athleteError }] = await Promise.all([
      db.from("season_athlete_classes").select("athlete_id,class_number").eq("season_id", selectedSeason.id).order("class_number").order("athlete_id"),
      db.from("athletes").select("id,status"),
    ]);
    if (snapshotError || athleteError) { await db.from("rounds").delete().eq("id", round.id); setError("Não foi possível carregar os atletas da temporada."); setBusy(false); return; }
    const activeIds = new Set(((athletes ?? []) as Athlete[]).filter((athlete) => ["active", "licensed"].includes(athlete.status)).map((athlete) => athlete.id));
    const groups = new Map<number, string[]>();
    for (const snapshot of (snapshots ?? []) as Snapshot[]) if (activeIds.has(snapshot.athlete_id)) groups.set(snapshot.class_number, [...(groups.get(snapshot.class_number) ?? []), snapshot.athlete_id]);
    const rows: Record<string, unknown>[] = [];
    let drawOrder = 1;
    for (const [classNumber, ids] of groups) for (let index = 0; index + 1 < ids.length; index += 2) rows.push({ season_id: selectedSeason.id, round_id: round.id, class_number: classNumber, athlete_one_id: ids[index], athlete_two_id: ids[index + 1], draw_order: drawOrder++, status: "scheduled", result_type: "normal", athlete_one_sets: 0, athlete_two_sets: 0, athlete_one_games: 0, athlete_two_games: 0, athlete_one_points: 0, athlete_two_points: 0, winner_athlete_id: null, audit: { source: "admin_draw", round_number: nextNumber } });
    if (rows.length) { const { error: matchError } = await db.from("matches").insert(rows); if (matchError) { await db.from("rounds").delete().eq("id", round.id); setError(`A rodada não foi gerada: ${matchError.message}`); setBusy(false); return; } }
    await ensureBye(round.id, selectedSeason.id);
    await db.from("seasons").update({ status: "open" }).eq("id", selectedSeason.id);
    setLocalRounds((old) => [...old, { id: round.id, seasonId: selectedSeason.id, number: nextNumber, status: "open", startsAt: round.opens_at, endsAt: round.closes_at, matchesCount: rows.length }]);
    setLocalSeasons((old) => old.map((season) => season.id === selectedSeason.id ? { ...season, status: "open" } : season));
    setMessage(`Rodada ${nextNumber} gerada. Os atletas sem adversário receberam bye.`);
    setBusy(false);
  }

  async function closeRound() {
    clearFeedback();
    if (!currentRound) { setError("Não há rodada aberta para fechar."); return; }
    const pending = currentMatches.filter((match) => unfinishedStatuses.includes(match.status));
    if (pending.length) { setError(`Ainda existem ${pending.length} partida(s) sem resultado concluído.`); return; }
    setBusy(true);
    const db = createClient() as any;
    const { data, error: updateError } = await db.from("rounds").update({ status: "closed" }).eq("id", currentRound.id).select("id,status,closes_at").single();
    if (updateError || !data) { setError(updateError?.message || "Não foi possível fechar a rodada."); setBusy(false); return; }
    setLocalRounds((old) => old.map((round) => round.id === currentRound.id ? { ...round, status: "closed", endsAt: data.closes_at } : round));
    setMessage(`Rodada ${currentRound.number} encerrada.`);
    setBusy(false);
  }

  async function finishSeason() {
    clearFeedback();
    if (!selectedSeason || !currentRound || currentRound.status !== "closed") { setError("Feche a rodada atual antes de finalizar a temporada."); return; }
    if (selectedSeason.roundsCount && currentRound.number < selectedSeason.roundsCount) { setError(`Ainda faltam rodadas. Esta temporada prevê ${selectedSeason.roundsCount} rodada(s).`); return; }
    setBusy(true);
    const db = createClient() as any;
    const { error: updateError } = await db.from("seasons").update({ status: "finished" }).eq("id", selectedSeason.id);
    if (updateError) { setError("Não foi possível finalizar a temporada."); setBusy(false); return; }
    setLocalSeasons((old) => old.map((season) => season.id === selectedSeason.id ? { ...season, status: "finished" } : season));
    setMessage("Temporada finalizada.");
    setBusy(false);
  }

  const roundList = seasonRounds.length ? seasonRounds.map((round) => (
    <div key={round.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div><p className="font-semibold text-white">Rodada {round.number}</p><p className="text-sm text-slate-400">{round.matchesCount ?? 0} partida(s) · {statusLabel(round.status)} · Finaliza em {formatDate(round.endsAt)}</p></div>
      <Link href={`/partidas?round=${round.id}`} className="text-sm font-semibold text-emerald-300">Ver partidas</Link>
    </div>
  )) : <div className="rounded-xl border border-dashed border-slate-700 p-6 text-center text-slate-400">Nenhuma rodada gerada ainda.</div>;

  return <section className="rounded-2xl border border-slate-800 bg-slate-950/40 p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">Painel administrativo</p><h2 className="mt-2 text-2xl font-bold text-white">Rodadas e sorteios</h2><p className="mt-2 text-sm text-slate-400">Gere a rodada, lance os resultados e feche-a somente quando todas as partidas estiverem concluídas.</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={generateRound} disabled={busy || !selectedSeason} className="rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-slate-950 disabled:opacity-50">{busy ? "Processando..." : "Gerar rodada"}</button><button type="button" onClick={closeRound} disabled={busy || !currentRound || currentRound.status !== "open"} className="rounded-lg border border-amber-400/50 px-4 py-2 font-semibold text-amber-200 disabled:opacity-50">Fechar rodada</button><button type="button" onClick={finishSeason} disabled={busy || !selectedSeason || selectedSeason.status === "finished"} className="rounded-lg border border-violet-400/50 px-4 py-2 font-semibold text-violet-200 disabled:opacity-50">Finalizar temporada</button></div></div><div className="mt-6 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]"><label className="text-sm text-slate-300">Temporada<select value={selectedSeasonId} onChange={(event) => setSelectedSeasonId(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"><option value="">Selecione</option>{localSeasons.map((season) => <option key={season.id} value={season.id}>{season.name} {season.year} · {statusLabel(season.status)}</option>)}</select></label><div className="rounded-lg border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-300"><p>Ativos: <strong className="text-white">{stats.activeAthletes}</strong> · Licenciados: <strong className="text-white">{stats.licensedAthletes}</strong> · Partidas abertas: <strong className="text-white">{stats.openMatches}</strong></p><p className="mt-1 text-slate-500">{selectedSeason ? `${seasonRounds.length} rodada(s) gerada(s) nesta temporada.` : "Selecione uma temporada para administrar."}</p></div></div>{error && <p className="mt-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}{message && <p className="mt-4 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-300">{message}</p>}<div className="mt-6 grid gap-3">{roundList}</div></section>;
}
