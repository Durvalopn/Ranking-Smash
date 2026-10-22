"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Navigation from "@/components/Navigation";
import { createClient } from "@/lib/supabase/client";

type Season = { id: string; name: string; year: number; status: string; created_at?: string };
type Athlete = { id: string; user_id: string; current_class: number; status: string };
type Profile = { id: string; full_name: string | null };
type Match = { season_id: string; athlete_one_id: string; athlete_two_id: string | null; status: string; result_type: string | null; athlete_one_sets: number | null; athlete_two_sets: number | null; athlete_one_games: number | null; athlete_two_games: number | null; athlete_one_points: number | null; athlete_two_points: number | null; winner_athlete_id: string | null };
type Event = { season_id: string; athlete_id: string; event_type: string; points: number | null; set_balance_delta: number | null; game_balance_delta: number | null; wins_delta: number | null; losses_delta: number | null };
type Row = { athleteId: string; name: string; classNumber: number; points: number; wins: number; losses: number; setBalance: number; gameBalance: number; matches: number };
type Finalist = Row & { qualification: "champion" | "annual_points" };

const classLabels = ["1ª Classe", "2ª Classe", "3ª Classe", "4ª Classe", "5ª Classe", "6ª Classe"];
const completedStatuses = ["result_submitted", "completed", "confirmed", "walkover"];

function emptyRow(athlete: Athlete, name: string): Row { return { athleteId: athlete.id, name, classNumber: athlete.current_class, points: 0, wins: 0, losses: 0, setBalance: 0, gameBalance: 0, matches: 0 }; }
function sortRows(rows: Row[]) { return [...rows].sort((a, b) => b.points - a.points || b.setBalance - a.setBalance || b.gameBalance - a.gameBalance || b.wins - a.wins || a.name.localeCompare(b.name, "pt-BR")); }

function calculateRows(athletes: Athlete[], profiles: Record<string, Profile>, matches: Match[], events: Event[], seasonIds: string[]) {
  const allowed = new Set(seasonIds);
  const rows = new Map(athletes.map((athlete) => [athlete.id, emptyRow(athlete, profiles[athlete.user_id]?.full_name ?? "Atleta")])) as Map<string, Row>;
  for (const match of matches) {
    if (!allowed.has(match.season_id) || !completedStatuses.includes(match.status)) continue;
    const one = rows.get(match.athlete_one_id); const two = match.athlete_two_id ? rows.get(match.athlete_two_id) : null;
    if (!one) continue;
    one.matches += 1; one.points += match.athlete_one_points ?? 0; one.setBalance += (match.athlete_one_sets ?? 0) - (match.athlete_two_sets ?? 0); one.gameBalance += (match.athlete_one_games ?? 0) - (match.athlete_two_games ?? 0);
    if (two) { two.matches += 1; two.points += match.athlete_two_points ?? 0; two.setBalance += (match.athlete_two_sets ?? 0) - (match.athlete_one_sets ?? 0); two.gameBalance += (match.athlete_two_games ?? 0) - (match.athlete_one_games ?? 0); }
    if (match.result_type === "double_walkover") continue;
    if (match.winner_athlete_id === one.athleteId) { one.wins += 1; if (two) two.losses += 1; }
    else if (two && match.winner_athlete_id === two.athleteId) { two.wins += 1; one.losses += 1; }
  }
  for (const event of events) {
    if (!allowed.has(event.season_id) || !["bye", "licensed"].includes(event.event_type)) continue;
    const row = rows.get(event.athlete_id); if (!row) continue;
    row.points += event.points ?? 0; row.setBalance += event.set_balance_delta ?? 0; row.gameBalance += event.game_balance_delta ?? 0; row.wins += event.wins_delta ?? 0; row.losses += event.losses_delta ?? 0;
  }
  return Array.from(rows.values()).filter((row) => row.matches > 0 || row.points > 0);
}

function qualifyFinals(seasonRows: Row[], annualRows: Row[], seasons: Season[], classNumber: number): Finalist[] {
  const champions: Finalist[] = [];
  const used = new Set<string>();
  const firstFour = [...seasons].sort((a, b) => (a.created_at ?? a.id).localeCompare(b.created_at ?? b.id)).slice(0, 4);
  for (const season of firstFour) {
    const winner = sortRows(seasonRows.filter((row) => row.classNumber === classNumber && row.matches > 0 && row.points > 0)).find((row) => row.athleteId && !used.has(row.athleteId));
    if (winner) { champions.push({ ...winner, qualification: "champion" }); used.add(winner.athleteId); }
  }
  const annual = sortRows(annualRows.filter((row) => row.classNumber === classNumber));
  for (const row of annual) {
    if (champions.length >= 8) break;
    if (used.has(row.athleteId)) continue;
    champions.push({ ...row, qualification: "annual_points" }); used.add(row.athleteId);
  }
  return champions.slice(0, 8);
}

export default function ClassificacaoPage() {
  const supabase = createClient();
  const [season, setSeason] = useState<Season | null>(null); const [seasons, setSeasons] = useState<Season[]>([]); const [athletes, setAthletes] = useState<Athlete[]>([]); const [profiles, setProfiles] = useState<Record<string, Profile>>({}); const [matches, setMatches] = useState<Match[]>([]); const [events, setEvents] = useState<Event[]>([]); const [mode, setMode] = useState<"season" | "annual" | "finals">("season"); const [loading, setLoading] = useState(true); const [error, setError] = useState("");

  useEffect(() => { let mounted = true; async function load() { setLoading(true); setError(""); const [{ data: current, error: currentError }, { data: athleteData, error: athleteError }, { data: seasonData, error: seasonsError }] = await Promise.all([supabase.from("seasons").select("id, name, year, status, created_at").in("status", ["active", "finished", "registration"]).order("year", { ascending: false }).limit(1).maybeSingle(), supabase.from("athletes").select("id, user_id, current_class, status").eq("status", "active"), supabase.from("seasons").select("id, name, year, status, created_at").order("created_at", { ascending: true })]); if (currentError || athleteError || seasonsError) { if (mounted) { setError("Não foi possível carregar os dados da classificação."); setLoading(false); } return; } const loadedAthletes = (athleteData ?? []) as Athlete[]; const userIds = [...new Set(loadedAthletes.map((a) => a.user_id))]; const [{ data: profileData }, { data: matchData }, { data: eventData }] = await Promise.all([userIds.length ? supabase.from("profiles").select("id, full_name").in("id", userIds) : Promise.resolve({ data: [] as Profile[] }), supabase.from("matches").select("season_id, athlete_one_id, athlete_two_id, status, result_type, athlete_one_sets, athlete_two_sets, athlete_one_games, athlete_two_games, athlete_one_points, athlete_two_points, winner_athlete_id"), supabase.from("match_events").select("season_id, athlete_id, event_type, points, set_balance_delta, game_balance_delta, wins_delta, losses_delta")]); if (mounted) { setSeason((current ?? null) as Season | null); setSeasons((seasonData ?? []) as Season[]); setAthletes(loadedAthletes); setProfiles(Object.fromEntries(((profileData ?? []) as Profile[]).map((p) => [p.id, p]))); setMatches((matchData ?? []) as Match[]); setEvents((eventData ?? []) as Event[]); setLoading(false); } } void load(); return () => { mounted = false; }; }, []);

  const seasonRows = useMemo(() => calculateRows(athletes, profiles, matches, events, season ? [season.id] : []), [athletes, profiles, matches, events, season]);
  const annualSeasonIds = useMemo(() => seasons.filter((item) => item.year === season?.year).map((item) => item.id), [seasons, season]);
  const annualRows = useMemo(() => calculateRows(athletes, profiles, matches, events, annualSeasonIds), [athletes, profiles, matches, events, annualSeasonIds]);
  const grouped = useMemo(() => classLabels.map((label, index) => ({ label, number: index + 1, rows: sortRows((mode === "season" ? seasonRows : annualRows).filter((row) => row.classNumber === index + 1)), finalists: qualifyFinals(seasonRows, annualRows, seasons, index + 1) })).filter((group) => mode === "finals" ? group.finalists.length > 0 : group.rows.length > 0), [mode, seasonRows, annualRows, seasons]);

  return <><Navigation /><main className="page-container py-10"><div className="mx-auto max-w-6xl"><Link href="/dashboard" className="text-sm text-emerald-400 hover:text-emerald-300">← Voltar ao dashboard</Link><div className="mt-4 flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-bold text-white">Classificação</h1><p className="mt-2 text-slate-400">Temporada, ranking anual e classificados para o Finals.</p></div><div className="flex flex-wrap rounded-lg border border-slate-700 bg-slate-900 p-1"><button onClick={() => setMode("season")} className={`rounded-md px-4 py-2 text-sm font-semibold ${mode === "season" ? "bg-emerald-500 text-slate-950" : "text-slate-300"}`}>Temporada</button><button onClick={() => setMode("annual")} className={`rounded-md px-4 py-2 text-sm font-semibold ${mode === "annual" ? "bg-emerald-500 text-slate-950" : "text-slate-300"}`}>Ranking anual</button><button onClick={() => setMode("finals")} className={`rounded-md px-4 py-2 text-sm font-semibold ${mode === "finals" ? "bg-emerald-500 text-slate-950" : "text-slate-300"}`}>Classificados Finals</button></div></div>{loading ? <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/70 p-8 text-center text-slate-400">Carregando classificação...</section> : error ? <section className="mt-8 rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center text-red-300">{error}</section> : !season ? <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/70 p-8 text-center text-slate-400">Nenhuma temporada disponível.</section> : <><div className="mt-6 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-slate-300"><strong className="text-white">{mode === "season" ? `${season.name} ${season.year}` : mode === "annual" ? `Ranking anual ${season.year}` : `Classificados do Finals ${season.year}`}</strong> · {mode === "finals" ? "campeões das quatro primeiras temporadas + maiores pontuadores anuais, sem duplicação" : mode === "annual" ? "pontuação acumulada no ano" : "resultados registrados na temporada"}</div><div className="mt-6 space-y-6">{grouped.map((group) => <section key={group.number} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl"><div className="flex items-center justify-between"><h2 className="text-xl font-semibold text-white">{group.label}</h2><span className="text-sm text-slate-400">{mode === "finals" ? `${group.finalists.length}/8 classificados` : `${group.rows.length} atleta(s)`}</span></div><div className="mt-4 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="border-b border-slate-800 text-slate-400"><tr><th className="px-3 py-3">Pos.</th><th className="px-3 py-3">Atleta</th><th className="px-3 py-3">Pontos</th><th className="px-3 py-3">V-D</th><th className="px-3 py-3">Saldo sets</th><th className="px-3 py-3">Saldo games</th><th className="px-3 py-3">Qualificação</th></tr></thead><tbody>{(mode === "finals" ? group.finalists : group.rows).map((row, index) => <tr key={row.athleteId} className="border-b border-slate-800/70 last:border-0"><td className="px-3 py-3 font-semibold text-emerald-400">{index + 1}</td><td className="px-3 py-3 font-medium text-white">{row.name}</td><td className="px-3 py-3 font-bold text-white">{row.points}</td><td className="px-3 py-3 text-slate-300">{row.wins}-{row.losses}</td><td className="px-3 py-3 text-slate-300">{row.setBalance > 0 ? "+" : ""}{row.setBalance}</td><td className="px-3 py-3 text-slate-300">{row.gameBalance > 0 ? "+" : ""}{row.gameBalance}</td><td className="px-3 py-3 text-slate-400">{mode === "finals" ? (row.qualification === "champion" ? "Campeão de temporada" : "Pontos anuais") : "—"}</td></tr>)}</tbody></table></div></section>)}{grouped.length === 0 && <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-8 text-center text-slate-400">Ainda não há dados suficientes para montar esta classificação.</section>}</div></>}</div></main></>;
}
