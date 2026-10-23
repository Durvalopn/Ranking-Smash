"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Navigation from "@/components/Navigation";
import { createClient } from "@/lib/supabase/client";

type Season = { id: string; name: string; year: number; status: string; season_type: string | null };
type Round = { id: string; season_id: string; round_number: number; status: string };
type Athlete = { id: string; user_id: string };
type Profile = { id: string; full_name: string | null };
type Assignment = { season_id: string; athlete_id: string; class_number: number };
type Match = { id: string; season_id: string; round_id: string; class_number: number; status: string; result_type: string | null; athlete_one_id: string; athlete_two_id: string | null; athlete_one_points: number | null; athlete_two_points: number | null; winner_athlete_id: string | null };
type Row = { key: string; athleteId: string; classNumber: number; name: string; points: number; wins: number; losses: number; matches: number };

const finishedStatuses = ["result_submitted", "completed", "confirmed", "walkover"];
const labels = ["1ª Classe", "2ª Classe", "3ª Classe", "4ª Classe", "5ª Classe", "6ª Classe"];

function sortRows(rows: Row[]) {
  return [...rows].sort((a, b) => b.points - a.points || b.wins - a.wins || a.losses - b.losses || a.name.localeCompare(b.name));
}

function addMatch(row: Row, match: Match, athleteId: string) {
  const first = match.athlete_one_id === athleteId;
  row.matches += 1;
  row.points += first ? match.athlete_one_points ?? 0 : match.athlete_two_points ?? 0;
  if (match.result_type === "double_walkover") return;
  if (match.winner_athlete_id) {
    if (match.winner_athlete_id === athleteId) row.wins += 1;
    else row.losses += 1;
  }
}

export default function ClassificacaoPage() {
  const supabase = createClient() as any;
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setError("");
    const [seasonResult, roundResult, athleteResult, profileResult, assignmentResult, matchResult] = await Promise.all([
      supabase.from("seasons").select("id,name,year,status,season_type").order("year", { ascending: false }).order("created_at", { ascending: false }),
      supabase.from("rounds").select("id,season_id,round_number,status").order("round_number", { ascending: true }),
      supabase.from("athletes").select("id,user_id"),
      supabase.from("profiles").select("id,full_name"),
      supabase.from("season_athlete_classes").select("season_id,athlete_id,class_number"),
      supabase.from("matches").select("id,season_id,round_id,class_number,status,result_type,athlete_one_id,athlete_two_id,athlete_one_points,athlete_two_points,winner_athlete_id"),
    ]);
    const failure = [seasonResult, roundResult, athleteResult, profileResult, assignmentResult, matchResult].find((item) => item.error);
    if (failure?.error) { setError("Não foi possível carregar a classificação."); setLoading(false); return; }
    const loadedSeasons = (seasonResult.data ?? []) as Season[];
    setSeasons(loadedSeasons); setRounds((roundResult.data ?? []) as Round[]); setAthletes((athleteResult.data ?? []) as Athlete[]);
    setProfiles(Object.fromEntries(((profileResult.data ?? []) as Profile[]).map((profile) => [profile.id, profile])));
    setAssignments((assignmentResult.data ?? []) as Assignment[]); setMatches((matchResult.data ?? []) as Match[]);
    setSelectedId((current) => current && loadedSeasons.some((season) => season.id === current) ? current : loadedSeasons.find((season) => season.status === "open")?.id ?? loadedSeasons[0]?.id ?? "");
    setUpdatedAt(new Date().toLocaleTimeString("pt-BR")); setLoading(false);
  }

  useEffect(() => { void load(); const timer = setInterval(() => void load(), 15000); return () => clearInterval(timer); }, []);

  const selectedSeason = seasons.find((season) => season.id === selectedId);
  const athleteNames = useMemo(() => Object.fromEntries(athletes.map((athlete) => [athlete.id, profiles[athlete.user_id]?.full_name ?? "Atleta"])), [athletes, profiles]);
  const closedRoundIds = useMemo(() => new Set(rounds.filter((round) => round.season_id === selectedId && ["closed", "finished"].includes(round.status)).map((round) => round.id)), [rounds, selectedId]);
  const seasonRows = useMemo(() => {
    const map = new Map<string, Row>();
    for (const assignment of assignments.filter((item) => item.season_id === selectedId)) {
      const key = `${assignment.athlete_id}:${assignment.class_number}`;
      map.set(key, { key, athleteId: assignment.athlete_id, classNumber: assignment.class_number, name: athleteNames[assignment.athlete_id] ?? "Atleta", points: 0, wins: 0, losses: 0, matches: 0 });
    }
    for (const match of matches.filter((item) => item.season_id === selectedId && closedRoundIds.has(item.round_id) && finishedStatuses.includes(item.status))) {
      const one = map.get(`${match.athlete_one_id}:${match.class_number}`); if (one) addMatch(one, match, match.athlete_one_id);
      if (match.athlete_two_id) { const two = map.get(`${match.athlete_two_id}:${match.class_number}`); if (two) addMatch(two, match, match.athlete_two_id); }
    }
    return [...map.values()];
  }, [assignments, matches, selectedId, closedRoundIds, athleteNames]);

  const renderClass = (classNumber: number) => {
    const rows = sortRows(seasonRows.filter((row) => row.classNumber === classNumber));
    if (!rows.length) return null;
    const movementCount = Math.max(1, Math.ceil(rows.length * 0.2));
    const hasAccess = classNumber > 1;
    const hasRelegation = classNumber < labels.length;
    return <section key={classNumber} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"><div className="flex items-center justify-between"><h2 className="text-xl font-bold text-white">{labels[classNumber - 1]}</h2><span className="text-sm text-slate-400">{rows.length} atleta(s)</span></div><div className="mt-4 overflow-hidden rounded-lg"><table className="w-full text-left text-sm"><thead className="text-slate-400"><tr><th className="px-3 py-2">Pos.</th><th className="px-3 py-2">Atleta</th><th className="px-3 py-2">Pontos</th><th className="px-3 py-2">V-D</th></tr></thead><tbody>{rows.map((row, index) => { const promotion = hasAccess && index < movementCount; const relegation = hasRelegation && index >= rows.length - movementCount; const zoneClass = promotion ? "bg-emerald-500/15 text-emerald-100" : relegation ? "bg-red-500/15 text-red-100" : ""; return <tr key={row.key} className={`border-t border-slate-800 ${zoneClass}`}><td className="px-3 py-2 font-semibold">{index + 1}</td><td className="px-3 py-2 font-medium">{promotion && <span className="mr-2 text-emerald-400" title="Acesso">▲</span>}{relegation && <span className="mr-2 text-red-400" title="Rebaixamento">▼</span>}{row.name}</td><td className="px-3 py-2">{row.points}</td><td className="px-3 py-2">{row.wins}-{row.losses}</td></tr>; })}</tbody></table><div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-400"><span>{hasAccess ? `▲ Acesso: ${movementCount} atleta(s)` : ""}</span><span>{hasRelegation ? `▼ Rebaixamento: ${movementCount} atleta(s)` : ""}</span></div></div></section>;
  };

  return <><Navigation /><main className="page-container py-10"><div className="mx-auto max-w-6xl"><div className="flex flex-wrap items-end justify-between gap-4"><div><Link href="/dashboard" className="text-sm text-emerald-400">← Voltar ao dashboard</Link><h1 className="mt-4 text-3xl font-bold text-white">Classificação</h1><p className="mt-2 text-slate-400">Temporadas regulares, Finals, ranking anual e classificados.</p>{updatedAt && <p className="mt-1 text-xs text-slate-500">Atualizado às {updatedAt}. Atualização automática a cada 15 segundos.</p>}</div><div className="flex gap-2 rounded-lg border border-slate-700 bg-slate-900 p-1"><button onClick={() => undefined} className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950">Temporada</button><button disabled className="px-4 py-2 text-sm text-slate-500">Ranking anual</button><button disabled className="px-4 py-2 text-sm text-slate-500">Classificados Finals</button></div></div><select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className="mt-6 rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-white">{seasons.filter((season) => season.season_type !== "finals").map((season) => <option key={season.id} value={season.id}>{season.name} {season.year}</option>)}</select><div className="mt-4 flex flex-wrap gap-4 text-sm"><span className="rounded-md bg-emerald-500/15 px-3 py-2 text-emerald-300">▲ Acesso, top 20% da classe</span><span className="rounded-md bg-red-500/15 px-3 py-2 text-red-300">▼ Rebaixamento, bottom 20% da classe</span></div>{loading ? <p className="mt-8 text-slate-400">Carregando classificação...</p> : error ? <p className="mt-8 rounded-lg bg-red-500/10 p-4 text-red-300">{error}</p> : !selectedSeason ? <p className="mt-8 text-slate-400">Nenhuma temporada disponível.</p> : <div className="mt-6 grid gap-6 md:grid-cols-2">{labels.map((_, index) => renderClass(index + 1))}</div>}</div></main></>;
}
