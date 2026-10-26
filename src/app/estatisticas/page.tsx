"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Navigation from "@/components/Navigation";
import { createClient } from "@/lib/supabase/client";

type Season = { id: string; name: string; year: number; status: string; season_type: string | null };
type Round = { id: string; season_id: string; round_number: number; name: string; status: string };
type Athlete = { id: string; user_id: string; current_class: number | null };
type SeasonClass = { season_id: string; athlete_id: string; class_number: number };
type Match = { id: string; season_id: string; round_id: string; class_number: number; status: string; result_type: string | null; athlete_one_id: string; athlete_two_id: string | null; athlete_one_sets: number | null; athlete_two_sets: number | null; athlete_one_games: number | null; athlete_two_games: number | null; athlete_one_points: number | null; athlete_two_points: number | null; winner_athlete_id: string | null };
type Stat = { matches: number; wins: number; losses: number; points: number; setsWon: number; setsLost: number; gamesWon: number; gamesLost: number; walkovers: number; doubleWalkovers: number };
type SeasonStat = Stat & { season: Season; classNumbers: number[]; roundsPlayed: number; roundsTotal: number };

const finishedStatuses = ["result_submitted", "completed", "confirmed", "walkover"];
const classLabels = ["1ª Classe", "2ª Classe", "3ª Classe", "4ª Classe", "5ª Classe", "6ª Classe", "Feminino"];
const emptyStat = (): Stat => ({ matches: 0, wins: 0, losses: 0, points: 0, setsWon: 0, setsLost: 0, gamesWon: 0, gamesLost: 0, walkovers: 0, doubleWalkovers: 0 });

function addMatch(stat: Stat, match: Match, athleteId: string) {
  const first = match.athlete_one_id === athleteId;
  stat.matches += 1;
  stat.points += first ? match.athlete_one_points ?? 0 : match.athlete_two_points ?? 0;
  stat.setsWon += first ? match.athlete_one_sets ?? 0 : match.athlete_two_sets ?? 0;
  stat.setsLost += first ? match.athlete_two_sets ?? 0 : match.athlete_one_sets ?? 0;
  stat.gamesWon += first ? match.athlete_one_games ?? 0 : match.athlete_two_games ?? 0;
  stat.gamesLost += first ? match.athlete_two_games ?? 0 : match.athlete_one_games ?? 0;
  if (match.result_type === "walkover") stat.walkovers += 1;
  if (match.result_type === "double_walkover") stat.doubleWalkovers += 1;
  if (match.result_type !== "double_walkover" && match.winner_athlete_id) {
    if (match.winner_athlete_id === athleteId) stat.wins += 1;
    else stat.losses += 1;
  }
}

function percent(value: number, total: number) { return total ? `${Math.round((value / total) * 100)}%` : "0%"; }
function ratio(won: number, lost: number) { return `${won}-${lost}`; }

function StatTile({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  return <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4"><p className="text-xs uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold text-white">{value}</p>{detail && <p className="mt-1 text-xs text-slate-400">{detail}</p>}</div>;
}

function StatBlock({ title, stat }: { title: string; stat: Stat }) {
  return <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-5"><h3 className="text-xl font-bold text-white">{title}</h3><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><StatTile label="Partidas" value={stat.matches} detail={`${stat.wins} vitórias · ${stat.losses} derrotas`} /><StatTile label="Aproveitamento" value={percent(stat.wins, stat.matches)} detail={ratio(stat.wins, stat.losses)} /><StatTile label="Pontos" value={stat.points} detail={stat.matches ? `${(stat.points / stat.matches).toFixed(1)} por partida` : "Sem partidas"} /><StatTile label="Sets" value={ratio(stat.setsWon, stat.setsLost)} detail={`Games ${ratio(stat.gamesWon, stat.gamesLost)}`} /><StatTile label="WO" value={stat.walkovers} detail={stat.doubleWalkovers ? `${stat.doubleWalkovers} WO duplo` : "Sem WO duplo"} /></div></section>;
}

export default function EstatisticasPage() {
  const supabase = createClient();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [classes, setClasses] = useState<SeasonClass[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedId, setSelectedId] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");

  const load = useCallback(async () => {
    setError("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Não foi possível identificar o usuário."); setLoading(false); return; }
    const [seasonQuery, roundQuery, athleteQuery, classQuery] = await Promise.all([
      supabase.from("seasons").select("id,name,year,status,season_type").order("created_at", { ascending: true }),
      supabase.from("rounds").select("id,season_id,round_number,name,status"),
      supabase.from("athletes").select("id,user_id,current_class").eq("user_id", user.id),
      supabase.from("season_athlete_classes").select("season_id,athlete_id,class_number"),
    ]);
    if (seasonQuery.error || roundQuery.error || athleteQuery.error || classQuery.error) { setError("Não foi possível carregar suas estatísticas."); setLoading(false); return; }
    const loadedSeasons = (seasonQuery.data ?? []) as Season[];
    const loadedAthletes = (athleteQuery.data ?? []) as Athlete[];
    const athleteIds = loadedAthletes.map((athlete) => athlete.id);
    const matchQueries = await Promise.all(loadedSeasons.map((season) => supabase.from("matches").select("id,season_id,round_id,class_number,status,result_type,athlete_one_id,athlete_two_id,athlete_one_sets,athlete_two_sets,athlete_one_games,athlete_two_games,athlete_one_points,athlete_two_points,winner_athlete_id").eq("season_id", season.id)));
    if (matchQueries.some((query) => query.error)) { setError("Não foi possível carregar os resultados das partidas."); setLoading(false); return; }
    const allMatches = matchQueries.flatMap((query) => (query.data ?? []) as Match[]).filter((match) => athleteIds.includes(match.athlete_one_id) || (match.athlete_two_id ? athleteIds.includes(match.athlete_two_id) : false));
    setSeasons(loadedSeasons); setRounds((roundQuery.data ?? []) as Round[]); setAthletes(loadedAthletes); setClasses((classQuery.data ?? []) as SeasonClass[]); setMatches(allMatches); setUpdatedAt(new Date().toLocaleTimeString("pt-BR")); setLoading(false);
  }, [supabase]);

  useEffect(() => { void load(); const timer = window.setInterval(() => void load(), 15000); const onFocus = () => void load(); window.addEventListener("focus", onFocus); return () => { window.clearInterval(timer); window.removeEventListener("focus", onFocus); }; }, [load]);

  const athleteIds = useMemo(() => new Set(athletes.map((athlete) => athlete.id)), [athletes]);
  const seasonStats = useMemo<SeasonStat[]>(() => seasons.map((season) => { const seasonRounds = rounds.filter((round) => round.season_id === season.id); const includedRounds = season.season_type === "finals" ? seasonRounds.filter((round) => round.status === "closed") : seasonRounds.filter((round) => round.status === "closed"); const stat = emptyStat(); const classNumbers = [...new Set(classes.filter((item) => item.season_id === season.id && athleteIds.has(item.athlete_id)).map((item) => item.class_number))]; for (const match of matches) { if (match.season_id !== season.id || !includedRounds.some((round) => round.id === match.round_id) || !finishedStatuses.includes(match.status)) continue; const athleteId = athleteIds.has(match.athlete_one_id) ? match.athlete_one_id : match.athlete_two_id; if (athleteId) addMatch(stat, match, athleteId); } return { ...stat, season, classNumbers, roundsPlayed: includedRounds.length, roundsTotal: seasonRounds.length }; }).filter((item) => item.matches > 0 || item.roundsTotal > 0), [seasons, rounds, matches, classes, athleteIds]);
  const selectedSeason = selectedId === "all" ? null : seasonStats.find((item) => item.season.id === selectedId) ?? null;
  const total = useMemo(() => { const stat = emptyStat(); for (const item of seasonStats) { stat.matches += item.matches; stat.wins += item.wins; stat.losses += item.losses; stat.points += item.points; stat.setsWon += item.setsWon; stat.setsLost += item.setsLost; stat.gamesWon += item.gamesWon; stat.gamesLost += item.gamesLost; stat.walkovers += item.walkovers; stat.doubleWalkovers += item.doubleWalkovers; } return stat; }, [seasonStats]);

  return <><Navigation /><main className="page-container py-10"><div className="mx-auto max-w-6xl"><Link href="/dashboard" className="text-sm text-emerald-400">← Voltar ao dashboard</Link><div className="mt-4 flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-bold text-white">Estatísticas</h1><p className="mt-2 text-slate-400">Seu desempenho por temporada, rodada e etapa do Finals.</p>{updatedAt && <p className="mt-1 text-xs text-slate-500">Atualizado às {updatedAt}. Atualização automática após rodadas e etapas encerradas.</p>}</div><label className="text-sm text-slate-300">Período<select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className="mt-2 block rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"><option value="all">Todas as temporadas</option>{seasonStats.map((item) => <option key={item.season.id} value={item.season.id}>{item.season.name} {item.season.year}{item.season.season_type === "finals" ? " · Finals" : ""}</option>)}</select></label></div>{loading ? <section className="mt-8 rounded-2xl bg-slate-900/70 p-8 text-center text-slate-400">Carregando suas estatísticas...</section> : error ? <section className="mt-8 rounded-2xl bg-red-500/10 p-8 text-center text-red-300">{error}</section> : <>{selectedSeason ? <><StatBlock title={`${selectedSeason.season.name} ${selectedSeason.season.year}${selectedSeason.season.season_type === "finals" ? " · Finals" : ""}`} stat={selectedSeason} /><section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-5"><h3 className="text-xl font-bold text-white">Participação</h3><p className="mt-2 text-sm text-slate-300">Classes: {selectedSeason.classNumbers.length ? selectedSeason.classNumbers.map((number) => classLabels[number - 1] || `${number}ª Classe`).join(", ") : "Não registrada"}. Rodadas/etapas encerradas: {selectedSeason.roundsPlayed}/{selectedSeason.roundsTotal}.</p></section></> : <><StatBlock title="Resumo geral" stat={total} /><div className="mt-6 grid gap-5 md:grid-cols-2">{seasonStats.map((item) => <section key={item.season.id} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"><div className="flex items-start justify-between gap-3"><div><h3 className="text-xl font-bold text-white">{item.season.name} {item.season.year}{item.season.season_type === "finals" ? " · Finals" : ""}</h3><p className="mt-1 text-xs text-slate-400">{item.roundsPlayed}/{item.roundsTotal} etapas encerradas · {item.classNumbers.map((number) => classLabels[number - 1]).join(", ") || "Classe não registrada"}</p></div><span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs text-emerald-300">{item.matches} jogos</span></div><div className="mt-4 grid grid-cols-2 gap-3"><StatTile label="Vitórias" value={item.wins} detail={`${percent(item.wins, item.matches)} aproveitamento`} /><StatTile label="Pontos" value={item.points} detail={`Sets ${ratio(item.setsWon, item.setsLost)}`} /></div></section>)}</div></>}</>}</div></main></>;
}
