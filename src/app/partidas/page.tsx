"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Navigation from "@/components/Navigation";
import { createClient } from "@/lib/supabase/client";

const classNames = ["1ª Classe", "2ª Classe", "3ª Classe", "4ª Classe", "5ª Classe", "6ª Classe"];

type Season = { id: string; name: string; year: number; status: string };
type Round = { id: string; round_number: number; name: string; status: string; season_id: string };
type Match = {
  id: string;
  class_number: number;
  round_id: string;
  athlete_one_id: string;
  athlete_two_id: string | null;
  status: string;
  result_type: string | null;
  athlete_one_sets: number | null;
  athlete_two_sets: number | null;
  athlete_one_games: number | null;
  athlete_two_games: number | null;
  athlete_one_points: number | null;
  athlete_two_points: number | null;
  winner_athlete_id: string | null;
  draw_order: number | null;
};
type Athlete = { id: string; user_id: string; current_class: number };
type Profile = { id: string; full_name: string | null };

function isPending(match: Match) {
  return ["scheduled", "pending", "awaiting_result", "contested"].includes(match.status);
}

function resultLabel(match: Match) {
  if (match.result_type === "double_walkover") return "WO duplo";
  if (match.result_type === "walkover") return "WO";
  if (match.result_type === "bye") return "Bye";
  return "Resultado normal";
}

function statusLabel(match: Match) {
  if (isPending(match)) return "Aguardando resultado";
  if (match.status === "result_submitted") return "Resultado enviado";
  if (match.status === "completed" || match.status === "confirmed") return "Concluída";
  if (match.status === "walkover") return "Finalizada por WO";
  return match.status;
}

function score(match: Match) {
  const sets = `${match.athlete_one_sets ?? 0} x ${match.athlete_two_sets ?? 0} sets`;
  const games = `${match.athlete_one_games ?? 0} x ${match.athlete_two_games ?? 0} games`;
  const points = `${match.athlete_one_points ?? 0} x ${match.athlete_two_points ?? 0} pontos`;
  return { sets, games, points };
}

export default function PartidasPage() {
  const supabase = createClient();
  const [season, setSeason] = useState<Season | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [athletes, setAthletes] = useState<Record<string, Athlete>>({});
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedRound, setSelectedRound] = useState("all");

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true); setError("");
      const { data: seasonData, error: seasonError } = await supabase.from("seasons").select("id, name, year, status").in("status", ["active", "registration", "finished"]).order("year", { ascending: false }).limit(1).maybeSingle();
      if (seasonError) { if (mounted) setError("Não foi possível carregar a temporada."); setLoading(false); return; }
      if (!seasonData) { if (mounted) { setSeason(null); setLoading(false); } return; }
      const currentSeason = seasonData as Season;
      const [{ data: roundData, error: roundError }, { data: matchData, error: matchError }] = await Promise.all([
        supabase.from("rounds").select("id, round_number, name, status, season_id").eq("season_id", currentSeason.id).order("round_number", { ascending: false }),
        supabase.from("matches").select("id, class_number, round_id, athlete_one_id, athlete_two_id, status, result_type, athlete_one_sets, athlete_two_sets, athlete_one_games, athlete_two_games, athlete_one_points, athlete_two_points, winner_athlete_id, draw_order").eq("season_id", currentSeason.id).order("class_number").order("draw_order"),
      ]);
      if (roundError || matchError) { if (mounted) setError("Não foi possível carregar as partidas desta temporada."); setLoading(false); return; }
      const loadedMatches = (matchData ?? []) as Match[];
      const athleteIds = [...new Set(loadedMatches.flatMap((match) => [match.athlete_one_id, match.athlete_two_id].filter(Boolean)))];
      const { data: athleteData } = athleteIds.length ? await supabase.from("athletes").select("id, user_id, current_class").in("id", athleteIds) : { data: [] as Athlete[] };
      const loadedAthletes = (athleteData ?? []) as Athlete[];
      const userIds = [...new Set(loadedAthletes.map((athlete) => athlete.user_id).filter(Boolean))];
      const { data: profileData } = userIds.length ? await supabase.from("profiles").select("id, full_name").in("id", userIds) : { data: [] as Profile[] };
      if (mounted) {
        setSeason(currentSeason);
        setRounds((roundData ?? []) as Round[]);
        setMatches(loadedMatches);
        setAthletes(Object.fromEntries(loadedAthletes.map((athlete) => [athlete.id, athlete])));
        setProfiles(Object.fromEntries(((profileData ?? []) as Profile[]).map((profile) => [profile.id, profile])));
        setLoading(false);
      }
    }
    void load();
    return () => { mounted = false; };
  }, []);

  const visibleMatches = useMemo(() => selectedRound === "all" ? matches : matches.filter((match) => match.round_id === selectedRound), [matches, selectedRound]);
  const grouped = useMemo(() => classNames.map((name, index) => ({ name, number: index + 1, matches: visibleMatches.filter((match) => match.class_number === index + 1) })).filter((group) => group.matches.length > 0), [visibleMatches]);
  const roundName = (roundId: string) => rounds.find((round) => round.id === roundId)?.name ?? "Rodada";
  const athleteName = (athleteId: string | null) => {
    if (!athleteId) return "Bye";
    const athlete = athletes[athleteId];
    return athlete ? profiles[athlete.user_id]?.full_name ?? "Atleta" : "Atleta";
  };

  return <><Navigation /><main className="page-container py-10"><div className="mx-auto max-w-6xl"><Link href="/dashboard" className="text-sm text-emerald-400 hover:text-emerald-300">← Voltar ao dashboard</Link><div className="mt-4 flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-bold text-white">Partidas</h1><p className="mt-2 text-slate-400">Acompanhe todos os confrontos e resultados da temporada.</p></div>{rounds.length > 0 && <label className="text-sm text-slate-300">Rodada<select value={selectedRound} onChange={(event) => setSelectedRound(event.target.value)} className="mt-2 block rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"><option value="all">Todas as rodadas</option>{rounds.map((round) => <option key={round.id} value={round.id}>{round.name}</option>)}</select></label>}</div>{loading ? <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/70 p-8 text-center text-slate-400">Carregando partidas...</section> : error ? <section className="mt-8 rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center text-red-300">{error}</section> : !season ? <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/70 p-8 text-center text-slate-400">Nenhuma temporada disponível.</section> : matches.length === 0 ? <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/70 p-8 text-center text-slate-400"><h2 className="text-lg font-semibold text-white">Nenhuma partida cadastrada</h2><p className="mt-2">Quando uma rodada for gerada, os confrontos aparecerão aqui.</p></section> : <><div className="mt-6 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-slate-300"><strong className="text-white">{season.name} {season.year}</strong> · {visibleMatches.length} partida(s) exibida(s)</div><div className="mt-6 space-y-6">{grouped.map((group) => <section key={group.number} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl"><div className="flex items-center justify-between gap-3"><h2 className="text-xl font-semibold text-white">{group.name}</h2><span className="text-sm text-slate-400">{group.matches.length} confronto(s)</span></div><div className="mt-4 space-y-3">{group.matches.map((match) => { const pending = isPending(match); const result = score(match); const oneName = athleteName(match.athlete_one_id); const twoName = athleteName(match.athlete_two_id); return <article key={match.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-wide text-emerald-400">{roundName(match.round_id)} · confronto {match.draw_order ?? "-"}</p><h3 className="mt-1 text-lg font-semibold text-white">{oneName} <span className="mx-2 text-slate-500">×</span> {twoName}</h3></div><span className={`rounded-full border px-3 py-1 text-xs ${pending ? "border-amber-500/30 bg-amber-500/10 text-amber-200" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"}`}>{statusLabel(match)}</span></div>{pending ? <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-sm text-amber-100">Confronto agendado. O resultado ainda não foi lançado.</div> : <div className="mt-4 grid gap-2 text-sm text-slate-300 sm:grid-cols-3"><span><strong className="text-white">{resultLabel(match)}</strong></span><span>{result.sets}</span><span>{result.games} · {result.points}</span></div>}</article>; })}</div></section>)}{grouped.length === 0 && <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-8 text-center text-slate-400">Nenhuma partida nesta rodada.</section>}</div></>}</div></main></>;
}
