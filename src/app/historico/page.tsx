"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Navigation from "@/components/Navigation";
import { createClient } from "@/lib/supabase/client";

type Season = { id: string; name: string; year: number };
type Round = { id: string; season_id: string; round_number: number; status: string };
type Athlete = { id: string; user_id: string; current_class: number };
type Profile = { id: string; full_name: string | null };
type Match = { id: string; season_id: string; round_id: string; class_number: number; athlete_one_id: string; athlete_two_id: string | null; status: string; result_type: string | null; athlete_one_sets: number | null; athlete_two_sets: number | null; athlete_one_games: number | null; athlete_two_games: number | null; athlete_one_points: number | null; athlete_two_points: number | null; winner_athlete_id: string | null; draw_order: number | null };
type Bye = { id: string; season_id: string; round_id: string; athlete_id: string; points: number | null };
type HistoryItem = { id: string; season: Season; round: Round; classNumber: number; opponent: string; type: string; status: string; sets: string; games: string; points: number; won: boolean; bye: boolean };
type QueryTable = any;

const completed = ["result_submitted", "completed", "confirmed", "walkover"];

function resultType(match: Match) { return match.result_type === "double_walkover" ? "WO duplo" : match.result_type === "walkover" ? "WO" : "Partida normal"; }

export default function HistoricoPage() {
  const supabase = createClient();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [athleteName, setAthleteName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [seasonFilter, setSeasonFilter] = useState("all");

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true); setError("");
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;
      if (!user) { if (mounted) { setError("É necessário estar autenticado para consultar o histórico."); setLoading(false); } return; }
      const athletesTable: QueryTable = supabase.from("athletes");
      const { data: athleteData, error: athleteError } = await athletesTable.select("id,user_id,current_class").eq("user_id", user.id).maybeSingle();
      const athlete = athleteData as Athlete | null;
      if (athleteError || !athlete) { if (mounted) { setError("Nenhum atleta foi encontrado para esta conta."); setLoading(false); } return; }
      const profilesTable: QueryTable = supabase.from("profiles");
      const { data: ownProfile } = await profilesTable.select("full_name").eq("id", user.id).maybeSingle();
      const [{ data: matchData, error: matchError }, { data: byeData, error: byeError }, { data: seasonData, error: seasonError }, { data: roundData, error: roundError }] = await Promise.all([
        supabase.from("matches").select("id,season_id,round_id,class_number,athlete_one_id,athlete_two_id,status,result_type,athlete_one_sets,athlete_two_sets,athlete_one_games,athlete_two_games,athlete_one_points,athlete_two_points,winner_athlete_id,draw_order").or(`athlete_one_id.eq.${athlete.id},athlete_two_id.eq.${athlete.id}`).in("status", completed),
        supabase.from("match_events").select("id,season_id,round_id,athlete_id,points").eq("athlete_id", athlete.id).eq("event_type", "bye"),
        supabase.from("seasons").select("id,name,year").order("year", { ascending: false }),
        supabase.from("rounds").select("id,season_id,round_number,status").order("round_number"),
      ]);
      if (matchError || byeError || seasonError || roundError) { if (mounted) { setError("Não foi possível carregar o histórico de partidas."); setLoading(false); } return; }
      const matches = (matchData ?? []) as Match[]; const byes = (byeData ?? []) as Bye[]; const seasons = (seasonData ?? []) as Season[]; const rounds = (roundData ?? []) as Round[];
      const seasonMap = Object.fromEntries(seasons.map((season) => [season.id, season])); const roundMap = Object.fromEntries(rounds.map((round) => [round.id, round]));
      const opponentIds = [...new Set(matches.flatMap((match) => [match.athlete_one_id, match.athlete_two_id].filter((id): id is string => Boolean(id) && id !== athlete.id)))];
      const { data: opponentAthletes } = opponentIds.length ? await athletesTable.select("id,user_id,current_class").in("id", opponentIds) : { data: [] as Athlete[] };
      const opponentUserIds = [...new Set(((opponentAthletes ?? []) as Athlete[]).map((item) => item.user_id))];
      const { data: opponentProfiles } = opponentUserIds.length ? await profilesTable.select("id,full_name").in("id", opponentUserIds) : { data: [] as Profile[] };
      const names = Object.fromEntries(((opponentAthletes ?? []) as Athlete[]).map((item) => [item.id, (opponentProfiles ?? []).find((profile: Profile) => profile.id === item.user_id)?.full_name ?? "Atleta"]));
      const matchItems: HistoryItem[] = matches.filter((match) => seasonMap[match.season_id] && roundMap[match.round_id]).map((match) => {
        const first = match.athlete_one_id === athlete.id; const opponentId = first ? match.athlete_two_id : match.athlete_one_id; const ownPoints = first ? match.athlete_one_points ?? 0 : match.athlete_two_points ?? 0; const ownSets = first ? match.athlete_one_sets ?? 0 : match.athlete_two_sets ?? 0; const opponentSets = first ? match.athlete_two_sets ?? 0 : match.athlete_one_sets ?? 0; const ownGames = first ? match.athlete_one_games ?? 0 : match.athlete_two_games ?? 0; const opponentGames = first ? match.athlete_two_games ?? 0 : match.athlete_one_games ?? 0;
        return { id: match.id, season: seasonMap[match.season_id], round: roundMap[match.round_id], classNumber: match.class_number, opponent: opponentId ? names[opponentId] ?? "Atleta" : "Coringa", type: resultType(match), status: match.status === "walkover" ? "Finalizada por WO" : "Resultado registrado", sets: `${ownSets} x ${opponentSets}`, games: `${ownGames} x ${opponentGames}`, points: ownPoints, won: match.result_type !== "double_walkover" && match.winner_athlete_id === athlete.id, bye: false };
      });
      const byeItems: HistoryItem[] = byes.filter((bye) => seasonMap[bye.season_id] && roundMap[bye.round_id]).map((bye) => ({ id: `bye-${bye.id}`, season: seasonMap[bye.season_id], round: roundMap[bye.round_id], classNumber: athlete.current_class, opponent: "Coringa", type: "Bye", status: "Vitória por bye", sets: "0 x 0", games: "0 x 0", points: bye.points ?? 7, won: true, bye: true }));
      if (mounted) { setAthleteName((ownProfile as { full_name?: string } | null)?.full_name ?? user.email ?? "Atleta"); setItems([...matchItems, ...byeItems].sort((a, b) => b.season.year - a.season.year || b.round.round_number - a.round.round_number)); setLoading(false); }
    }
    void load(); return () => { mounted = false; };
  }, []);

  const seasons = useMemo(() => [...new Map(items.map((item) => [item.season.id, item.season])).values()], [items]);
  const visible = seasonFilter === "all" ? items : items.filter((item) => item.season.id === seasonFilter);

  return <><Navigation /><main className="page-container py-10"><div className="mx-auto max-w-6xl"><Link href="/dashboard" className="text-sm text-emerald-400">← Voltar ao dashboard</Link><div className="mt-4"><h1 className="text-3xl font-bold text-white">Histórico</h1><p className="mt-2 text-slate-400">Todas as partidas e resultados de {athleteName || "seu atleta"}, em todas as temporadas.</p></div>{!loading && items.length > 0 && <div className="mt-6 flex flex-wrap items-end justify-between gap-4"><div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-slate-300"><strong className="text-white">{visible.length}</strong> registro(s) encontrado(s)</div><label className="text-sm text-slate-300">Temporada<select value={seasonFilter} onChange={(event) => setSeasonFilter(event.target.value)} className="mt-2 block rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"><option value="all">Todas as temporadas</option>{seasons.map((season) => <option key={season.id} value={season.id}>{season.name} {season.year}</option>)}</select></label></div>}{loading ? <section className="mt-8 rounded-2xl bg-slate-900/70 p-8 text-center text-slate-400">Carregando histórico...</section> : error ? <section className="mt-8 rounded-2xl bg-red-500/10 p-8 text-center text-red-300">{error}</section> : visible.length === 0 ? <section className="mt-8 rounded-2xl bg-slate-900/70 p-8 text-center text-slate-400"><h2 className="text-lg font-semibold text-white">Ainda não há histórico disponível.</h2><p className="mt-2">Quando você participar de partidas, os confrontos e resultados aparecerão aqui.</p></section> : <div className="mt-8 space-y-4">{visible.map((item) => <article key={item.id} className={`rounded-2xl border p-5 shadow-xl ${item.bye ? "border-emerald-500/30 bg-emerald-500/10" : "border-slate-800 bg-slate-900/70"}`}><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-wide text-emerald-400">{item.season.name} {item.season.year} · Rodada {item.round.round_number} · {item.classNumber}ª Classe</p><h2 className="mt-1 text-xl font-semibold text-white">Você × {item.opponent}</h2></div><span className={`rounded-full border px-3 py-1 text-xs ${item.won ? "border-emerald-500/30 text-emerald-300" : item.type === "WO duplo" ? "border-amber-500/30 text-amber-200" : "border-slate-600 text-slate-300"}`}>{item.status}</span></div><div className="mt-4 grid gap-3 text-sm text-slate-300 sm:grid-cols-4"><span><strong className="text-white">Tipo:</strong> {item.type}</span><span><strong className="text-white">Sets:</strong> {item.sets}</span><span><strong className="text-white">Games:</strong> {item.games}</span><span><strong className="text-white">Pontos:</strong> {item.points}</span></div></article>)}</div>}</div></main></>;
}
