"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navigation from "@/components/Navigation";
import { createClient } from "@/lib/supabase/client";
import { buildRoundDraw, type DrawAthlete, type ExistingMatch } from "@/lib/round-draw";

const ADMIN_EMAIL = "eng.durvalneto@gmail.com";
const MAX_ROUNDS = 6;
const TOURNAMENTS = ["Australian Open", "Roland Garros", "Wimbledon", "US Open", "Finals"];

type Season = { id: string; name: string; year: number; rounds_count: number; status: string };
type Round = { id: string; season_id: string; round_number: number; name: string; status: string; opens_at: string | null; closes_at: string | null };
type InsertValues = Record<string, unknown>;
type UntypedTable = { select: (columns: string) => any; insert: (values: InsertValues | InsertValues[]) => any; update: (values: InsertValues) => any };

function plusDays(date: Date, days: number) { const result = new Date(date); result.setDate(result.getDate() + days); return result.toISOString(); }
function formatDate(value: string | null) { return value ? new Date(value).toLocaleDateString("pt-BR") : "-"; }
function isFinished(rounds: Round[]) { return rounds.length >= MAX_ROUNDS && rounds.slice(0, MAX_ROUNDS).every((round) => round.status === "closed"); }

export default function TemporadasPage() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const supabase = createClient();

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const isAdmin = user?.email?.trim().toLowerCase() === ADMIN_EMAIL;
    setAuthorized(isAdmin);
    if (!isAdmin) { setLoading(false); return; }
    const seasonsTable = supabase.from("seasons") as unknown as UntypedTable;
    const roundsTable = supabase.from("rounds") as unknown as UntypedTable;
    const [{ data: seasonData, error: seasonError }, { data: roundData, error: roundError }] = await Promise.all([
      seasonsTable.select("id, name, year, rounds_count, status").order("year", { ascending: false }).order("name"),
      roundsTable.select("id, season_id, round_number, name, status, opens_at, closes_at").order("round_number", { ascending: false }),
    ]);
    if (seasonError || roundError) setError("Não foi possível carregar as temporadas. Verifique as permissões do banco.");
    const loadedSeasons = (seasonData ?? []) as Season[];
    const loadedRounds = (roundData ?? []) as Round[];
    const finishedIds = loadedSeasons.filter((season) => isFinished(loadedRounds.filter((round) => round.season_id === season.id))).map((season) => season.id);
    if (finishedIds.length > 0) await Promise.all(finishedIds.map((id) => seasonsTable.update({ status: "finished", rounds_count: MAX_ROUNDS }).eq("id", id)));
    setSeasons(loadedSeasons.map((season) => finishedIds.includes(season.id) ? { ...season, status: "finished", rounds_count: MAX_ROUNDS } : season));
    setRounds(loadedRounds); setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  async function createSeason(name: string) {
    if (!authorized) return;
    setBusy(`season:${name}`); setError(""); setMessage("");
    const year = new Date().getFullYear();
    if (seasons.some((item) => item.name === name && item.year === year)) { setMessage(`${name} ${year} já está cadastrada.`); setBusy(null); return; }
    const { error: insertError } = await (supabase.from("seasons") as unknown as UntypedTable).insert({ name, year, rounds_count: 0, status: "registration" });
    if (insertError) setError(`Não foi possível criar ${name}: ${insertError.message}`); else { setMessage(`${name} ${year} criada.`); await load(); }
    setBusy(null);
  }

  async function drawAndPersist(roundId: string, seasonId: string, seed: string) {
    const athletesQuery = await supabase.from("athletes").select("id, current_class, status").in("status", ["active", "licensed"]);
    const previousQuery = await supabase.from("matches").select("athlete_one_id, athlete_two_id").eq("season_id", seasonId);
    if (athletesQuery.error) throw new Error(`Não foi possível carregar atletas: ${athletesQuery.error.message}`);
    if (previousQuery.error) throw new Error(`Não foi possível carregar confrontos anteriores: ${previousQuery.error.message}`);
    const athletes = (athletesQuery.data ?? []) as DrawAthlete[];
    const existing = (previousQuery.data ?? []) as ExistingMatch[];
    const pairs = buildRoundDraw(athletes, existing, seed);
    const matchesTable = supabase.from("matches") as unknown as UntypedTable;
    const eventsTable = supabase.from("match_events") as unknown as UntypedTable;
    const matches = pairs.filter((pair) => !pair.isBye).map((pair) => ({
      season_id: seasonId, round_id: roundId, class_number: pair.classNumber, athlete_one_id: pair.athleteOneId, athlete_two_id: pair.athleteTwoId, draw_order: pair.drawOrder, status: "scheduled", result_type: "normal", seed, draw_cost: 0, justification: pair.justification, audit: { seed, algorithm: "class-grouped-deterministic-v1" },
    }));
    if (matches.length > 0) {
      const { error: matchesError } = await matchesTable.insert(matches);
      if (matchesError) throw new Error(`Não foi possível salvar confrontos: ${matchesError.message}`);
    }
    const events = pairs.filter((pair) => pair.isBye).map((pair) => ({ season_id: seasonId, round_id: roundId, match_id: null, athlete_id: pair.athleteOneId, event_type: "bye", points: 7, metadata: { seed, justification: pair.justification } }));
    const licensed = athletes.filter((athlete) => athlete.status === "licensed").map((athlete) => ({ season_id: seasonId, round_id: roundId, match_id: null, athlete_id: athlete.id, event_type: "licensed", points: 3, metadata: { seed, justification: "Atleta licenciado recebe 3 pontos e não participa do sorteio." } }));
    if (events.length + licensed.length > 0) {
      const { error: eventsError } = await eventsTable.insert([...events, ...licensed]);
      if (eventsError) throw new Error(`Não foi possível salvar eventos: ${eventsError.message}`);
    }
    return { matches: matches.length, byes: events.length, licensed: licensed.length };
  }

  async function generateRound(season: Season) {
    if (!authorized) return;
    const seasonRounds = rounds.filter((round) => round.season_id === season.id);
    if (seasonRounds.length >= MAX_ROUNDS) { setMessage(`${season.name} ${season.year} já terminou após ${MAX_ROUNDS} rodadas.`); return; }
    setBusy(`round:${season.id}`); setError(""); setMessage("");
    const openRound = seasonRounds.find((round) => round.status !== "closed");
    if (openRound) { setError(`A ${openRound.name} ainda está aberta. O administrador precisa fechá-la antes de gerar a próxima.`); setBusy(null); return; }
    const number = seasonRounds.length + 1; const opened = new Date(); const closes = plusDays(opened, 10);
    const roundInsert = await (supabase.from("rounds") as unknown as UntypedTable).insert({ season_id: season.id, round_number: number, name: `Rodada ${number}`, status: "open", opens_at: opened.toISOString(), closes_at: closes }).select("id").single();
    if (roundInsert.error) { setError(`Não foi possível gerar a rodada: ${roundInsert.error.message}`); setBusy(null); return; }
    try {
      const result = await drawAndPersist(roundInsert.data.id, season.id, `${season.id}:${roundInsert.data.id}`);
      await (supabase.from("seasons") as unknown as UntypedTable).update({ rounds_count: number, status: "active" }).eq("id", season.id);
      setMessage(`Rodada ${number} gerada com ${result.matches} confrontos, ${result.byes} bye(s) e ${result.licensed} atleta(s) licenciado(s). Prazo: ${formatDate(closes)}.`);
      await load();
    } catch (drawError) {
      await (supabase.from("rounds") as unknown as UntypedTable).update({ status: "cancelled" }).eq("id", roundInsert.data.id);
      setError(drawError instanceof Error ? drawError.message : "Não foi possível salvar o sorteio.");
    }
    setBusy(null);
  }

  async function closeRound(round: Round) {
    if (!authorized || round.status === "closed") return;
    setBusy(`close:${round.id}`); setError(""); setMessage("");
    const { error: closeError } = await (supabase.from("rounds") as unknown as UntypedTable).update({ status: "closed", closes_at: new Date().toISOString() }).eq("id", round.id);
    if (closeError) setError(`Não foi possível fechar a rodada: ${closeError.message}`); else { setMessage(`${round.name} fechada pelo administrador.`); await load(); }
    setBusy(null);
  }

  return <><Navigation /><main className="page-container py-10"><div className="mx-auto max-w-5xl"><Link href="/dashboard" className="text-sm text-emerald-400 hover:text-emerald-300">← Voltar ao dashboard</Link><h1 className="mt-4 text-3xl font-bold text-white">Temporadas</h1>{loading ? <p className="mt-2 text-slate-400">Verificando acesso...</p> : !authorized ? <section className="mt-8 rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center"><h2 className="text-xl font-semibold text-red-200">Acesso negado</h2><p className="mt-2 text-sm text-red-300">Somente o administrador pode gerenciar temporadas e rodadas.</p></section> : <><p className="mt-2 text-slate-400">Crie os torneios, gere as rodadas e feche cada rodada quando o período terminar.</p>{message && <div className="mt-5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">{message}</div>}{error && <div className="mt-5 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}<section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl"><h2 className="text-lg font-semibold text-white">Calendário pré-cadastrado</h2><p className="mt-1 text-sm text-slate-400">Crie a temporada do ano atual sem exigir atletas cadastrados.</p><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{TOURNAMENTS.map((name) => <button key={name} onClick={() => void createSeason(name)} disabled={busy !== null} className="rounded-lg border border-slate-700 px-4 py-3 text-left text-slate-200 hover:border-emerald-400 hover:text-emerald-300 disabled:opacity-50">{busy === `season:${name}` ? "Criando..." : `Criar ${name}`}</button>)}</div></section><section className="mt-6 space-y-4">{seasons.length === 0 ? <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-8 text-center text-slate-400">Nenhuma temporada criada ainda.</div> : seasons.map((season) => { const seasonRounds = rounds.filter((round) => round.season_id === season.id); const finished = isFinished(seasonRounds); return <article key={season.id} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl"><div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-xl font-semibold text-white">{season.name} {season.year}</h2><p className="mt-1 text-sm text-slate-400">{seasonRounds.length} rodada(s) · status: {finished ? "finished" : season.status}</p></div>{finished ? <span className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 font-semibold text-emerald-300">Temporada encerrada</span> : <button onClick={() => void generateRound(season)} disabled={busy !== null || seasonRounds.some((round) => round.status !== "closed")} className="rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50">{busy === `round:${season.id}` ? "Gerando..." : "Gerar próxima rodada"}</button>}</div>{seasonRounds.length > 0 && <div className="mt-5 space-y-2">{seasonRounds.map((round) => <div key={round.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 px-4 py-3 text-sm"><span className="text-slate-200">{round.name} · {round.status}</span><span className="text-slate-400">até {formatDate(round.closes_at)}</span>{round.status !== "closed" && <button onClick={() => void closeRound(round)} disabled={busy !== null} className="rounded-md bg-amber-500 px-3 py-1 font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-50">{busy === `close:${round.id}` ? "Fechando..." : "Fechar rodada"}</button>}</div>)}</div>}</article>; })}</section></>}</div></main></>;
}
