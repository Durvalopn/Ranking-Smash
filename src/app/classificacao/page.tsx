"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Navigation from "@/components/Navigation";
import { createClient } from "@/lib/supabase/client";

type Season = { id: string; name: string; year: number; status: string; season_type: string | null };
type Round = { id: string; season_id: string; round_number: number; status: string; name: string };
type Athlete = { id: string; user_id: string };
type Profile = { id: string; full_name: string | null };
type Entry = { season_id: string; class_number: number; athlete_id: string; qualification_reason: string; annual_points: number; seed: number; group_name: string };
type Match = { id: string; season_id: string; round_id: string; athlete_one_id: string; athlete_two_id: string | null; status: string; result_type: string | null; athlete_one_points: number | null; athlete_two_points: number | null; winner_athlete_id: string | null };
type Row = { key: string; athleteId: string; classNumber: number; name: string; group?: string; points: number; wins: number; losses: number; matches: number };

const classLabels = ["1ª Classe", "2ª Classe", "3ª Classe", "4ª Classe", "5ª Classe", "6ª Classe"];
const finished = ["result_submitted", "completed", "confirmed", "walkover"];

function sortRows(rows: Row[]) {
  return [...rows].sort((a, b) => b.points - a.points || b.wins - a.wins || a.losses - b.losses || a.name.localeCompare(b.name));
}

function byClass(rows: Row[]) {
  return classLabels.map((label, index) => ({ label, rows: sortRows(rows.filter((row) => row.classNumber === index + 1)) })).filter((group) => group.rows.length > 0);
}

function addMatch(row: Row, match: Match, athleteId: string) {
  const first = match.athlete_one_id === athleteId;
  row.matches += 1;
  row.points += first ? match.athlete_one_points ?? 0 : match.athlete_two_points ?? 0;
  if (match.result_type !== "double_walkover" && match.winner_athlete_id) {
    if (match.winner_athlete_id === athleteId) row.wins += 1;
    else row.losses += 1;
  }
}

export default function ClassificacaoPage() {
  const supabase = createClient();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [entries, setEntries] = useState<Entry[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [mode, setMode] = useState<"season" | "annual" | "finals">("season");
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");

  const load = useCallback(async () => {
    const [seasonQuery, roundQuery, athleteQuery, entryQuery, matchQuery] = await Promise.all([
      supabase.from("seasons").select("id,name,year,status,season_type").order("created_at", { ascending: true }),
      supabase.from("rounds").select("id,season_id,round_number,status,name"),
      supabase.from("athletes").select("id,user_id"),
      supabase.from("finals_entries").select("season_id,class_number,athlete_id,qualification_reason,annual_points,seed,group_name"),
      supabase.from("matches").select("id,season_id,round_id,athlete_one_id,athlete_two_id,status,result_type,athlete_one_points,athlete_two_points,winner_athlete_id"),
    ]);
    if (seasonQuery.error || roundQuery.error || athleteQuery.error || entryQuery.error || matchQuery.error) {
      setError("Não foi possível atualizar a classificação.");
      setLoading(false);
      return;
    }
    const loadedAthletes = (athleteQuery.data ?? []) as Athlete[];
    const userIds = [...new Set(loadedAthletes.map((athlete) => athlete.user_id))];
    const profileQuery = userIds.length ? await supabase.from("profiles").select("id,full_name").in("id", userIds) : { data: [], error: null };
    if (profileQuery.error) {
      setError("Não foi possível carregar os nomes dos atletas.");
      setLoading(false);
      return;
    }
    const loadedSeasons = (seasonQuery.data ?? []) as Season[];
    setSeasons(loadedSeasons);
    setRounds((roundQuery.data ?? []) as Round[]);
    setAthletes(loadedAthletes);
    setProfiles(Object.fromEntries(((profileQuery.data ?? []) as Profile[]).map((profile) => [profile.id, profile])));
    setEntries((entryQuery.data ?? []) as Entry[]);
    setMatches((matchQuery.data ?? []) as Match[]);
    setSelectedId((current) => current || loadedSeasons.find((season) => season.season_type === "finals")?.id || loadedSeasons[0]?.id || "");
    setUpdatedAt(new Date().toLocaleTimeString("pt-BR"));
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 15000);
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", onFocus); };
  }, [load]);

  const names = useMemo(() => Object.fromEntries(athletes.map((athlete) => [athlete.id, profiles[athlete.user_id]?.full_name || "Atleta"])), [athletes, profiles]);
  const regularSeasons = useMemo(() => seasons.filter((season) => season.season_type !== "finals"), [seasons]);
  const finals = useMemo(() => seasons.find((season) => season.season_type === "finals") ?? null, [seasons]);
  const selected = seasons.find((season) => season.id === selectedId) ?? null;
  const official = useMemo(() => entries.filter((entry) => finals && entry.season_id === finals.id), [entries, finals]);

  const finalsRows = useMemo(() => {
    if (!finals) return [];
    const rows = new Map<string, Row>();
    for (const entry of official) rows.set(entry.athlete_id, { key: entry.athlete_id, athleteId: entry.athlete_id, classNumber: entry.class_number, group: entry.group_name, name: names[entry.athlete_id] || "Atleta", points: 0, wins: 0, losses: 0, matches: 0 });
    const groupRound = rounds.find((round) => round.season_id === finals.id && round.round_number === 1);
    for (const match of matches) {
      if (match.season_id !== finals.id || match.round_id !== groupRound?.id || !finished.includes(match.status)) continue;
      const one = rows.get(match.athlete_one_id);
      const two = match.athlete_two_id ? rows.get(match.athlete_two_id) : null;
      if (one) addMatch(one, match, one.athleteId);
      if (two) addMatch(two, match, two.athleteId);
    }
    return [...rows.values()];
  }, [finals, official, rounds, matches, names]);

  const regularRows = useMemo(() => {
    if (!selected || selected.season_type === "finals") return [];
    const classMap = new Map(entries.filter((entry) => entry.season_id === selected.id).map((entry) => [entry.athlete_id, entry.class_number]));
    const rows = new Map<string, Row>();
    for (const athlete of athletes) {
      const classNumber = classMap.get(athlete.id);
      if (classNumber) rows.set(athlete.id, { key: athlete.id, athleteId: athlete.id, classNumber, name: names[athlete.id] || "Atleta", points: 0, wins: 0, losses: 0, matches: 0 });
    }
    const closed = new Set(rounds.filter((round) => round.season_id === selected.id && round.status === "closed").map((round) => round.id));
    for (const match of matches) {
      if (match.season_id !== selected.id || !closed.has(match.round_id) || !finished.includes(match.status)) continue;
      const one = rows.get(match.athlete_one_id);
      const two = match.athlete_two_id ? rows.get(match.athlete_two_id) : null;
      if (one) addMatch(one, match, one.athleteId);
      if (two) addMatch(two, match, two.athleteId);
    }
    return [...rows.values()].filter((row) => row.matches > 0 || row.points > 0);
  }, [selected, entries, athletes, names, rounds, matches]);

  const annualRows = useMemo(() => {
    const result = new Map<string, Row>();
    for (const season of regularSeasons) {
      const classMap = new Map(entries.filter((entry) => entry.season_id === season.id).map((entry) => [entry.athlete_id, entry.class_number]));
      const closed = new Set(rounds.filter((round) => round.season_id === season.id && round.status === "closed").map((round) => round.id));
      for (const match of matches) {
        if (match.season_id !== season.id || !closed.has(match.round_id) || !finished.includes(match.status)) continue;
        for (const athleteId of [match.athlete_one_id, match.athlete_two_id].filter(Boolean) as string[]) {
          const classNumber = classMap.get(athleteId);
          if (!classNumber) continue;
          const key = `${athleteId}:${classNumber}`;
          const row = result.get(key) ?? { key, athleteId, classNumber, name: names[athleteId] || "Atleta", points: 0, wins: 0, losses: 0, matches: 0 };
          addMatch(row, match, athleteId);
          result.set(key, row);
        }
      }
    }
    return [...result.values()];
  }, [regularSeasons, entries, rounds, matches, names]);

  const renderTable = (rows: Row[], highlight = false) => <div className="mt-6 grid gap-6 md:grid-cols-2">{byClass(rows).map((group) => <section key={group.label} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"><div className="flex items-center justify-between"><h2 className="text-xl font-bold text-white">{group.label}</h2><span className="text-sm text-slate-400">{group.rows.length} atleta(s)</span></div><div className="mt-4 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="border-b border-slate-800 text-slate-400"><tr><th className="px-3 py-2">Pos.</th><th className="px-3 py-2">Atleta</th><th className="px-3 py-2">Pontos</th><th className="px-3 py-2">V-D</th></tr></thead><tbody>{group.rows.map((row, index) => <tr key={row.key} className="border-b border-slate-800/70"><td className="px-3 py-2 text-white">{index + 1}</td><td className="px-3 py-2 text-slate-200">{highlight && official.some((entry) => entry.athlete_id === row.athleteId) ? "⭐ " : ""}{row.name}</td><td className="px-3 py-2 font-semibold text-white">{row.points}</td><td className="px-3 py-2 text-slate-300">{row.wins}-{row.losses}</td></tr>)}</tbody></table></div></section>)}</div>;

  return <><Navigation /><main className="page-container py-10"><div className="mx-auto max-w-6xl"><Link href="/dashboard" className="text-sm text-emerald-400">← Voltar ao dashboard</Link><div className="mt-4 flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-bold text-white">Classificação</h1><p className="mt-2 text-slate-400">Temporadas regulares, Finals, ranking anual e classificados.</p>{updatedAt && <p className="mt-1 text-xs text-slate-500">Atualizado às {updatedAt}. Atualização automática a cada 15 segundos.</p>}</div><div className="flex flex-wrap gap-2 rounded-lg border border-slate-700 bg-slate-900 p-1"><button onClick={() => setMode("season")} className={`rounded-md px-4 py-2 text-sm ${mode === "season" ? "bg-emerald-500 text-slate-950" : "text-slate-300"}`}>Temporada</button><button onClick={() => setMode("annual")} className={`rounded-md px-4 py-2 text-sm ${mode === "annual" ? "bg-emerald-500 text-slate-950" : "text-slate-300"}`}>Ranking anual</button><button onClick={() => setMode("finals")} className={`rounded-md px-4 py-2 text-sm ${mode === "finals" ? "bg-emerald-500 text-slate-950" : "text-slate-300"}`}>Classificados Finals</button></div></div>{loading ? <section className="mt-8 rounded-2xl bg-slate-900/70 p-8 text-center text-slate-400">Carregando classificação...</section> : error ? <section className="mt-8 rounded-2xl bg-red-500/10 p-8 text-center text-red-300">{error}</section> : <><div className="mt-6 flex flex-wrap items-center gap-3">{mode !== "finals" && <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white">{seasons.map((season) => <option key={season.id} value={season.id}>{season.name} {season.year}{season.season_type === "finals" ? " · Finals" : ""}</option>)}</select>}{mode === "annual" && <div className="rounded-xl border border-yellow-400/30 bg-yellow-400/10 px-4 py-3 text-sm text-yellow-100">Os participantes oficiais do Finals estão destacados.</div>}</div>{mode === "finals" && <section className="mt-6"><div className="rounded-xl border border-yellow-400/30 bg-yellow-400/10 p-5"><h2 className="text-2xl font-bold text-yellow-100">Classificados para o Finals</h2><p className="mt-2 text-sm text-slate-300">Participantes oficiais por classe, seed e grupo.</p></div><div className="mt-6 grid gap-5 md:grid-cols-2">{classLabels.map((label, index) => <section key={label} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"><h3 className="text-xl font-bold text-white">{label}</h3><div className="mt-3 space-y-2">{official.filter((entry) => entry.class_number === index + 1).sort((a, b) => a.seed - b.seed).map((entry, position) => <div key={`${entry.class_number}:${entry.athlete_id}`} className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-sm text-slate-200">{position + 1}. {names[entry.athlete_id]} · Grupo {entry.group_name} · Seed {entry.seed}</div>)}</div></section>)}</div></section>}{mode === "season" && selected?.season_type === "finals" && <section className="mt-6"><div className="rounded-xl border border-yellow-400/30 bg-yellow-400/10 p-5"><h2 className="text-2xl font-bold text-yellow-100">Classificação do Finals {selected.year}</h2><p className="mt-2 text-sm text-slate-300">Atualizada após cada etapa encerrada.</p></div><div className="mt-6 grid gap-6 md:grid-cols-2">{byClass(finalsRows).map((group) => <section key={group.label} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"><h3 className="text-xl font-bold text-white">{group.label}</h3>{["A", "B"].map((groupName) => { const rows = group.rows.filter((row) => row.group === groupName); return rows.length ? <div key={groupName} className="mt-4 rounded-xl border border-slate-800 bg-slate-950/50 p-4"><h4 className="font-semibold text-yellow-200">Grupo {groupName}</h4><table className="mt-3 min-w-full text-left text-sm"><thead className="text-slate-400"><tr><th className="px-2 py-2">Pos.</th><th className="px-2 py-2">Atleta</th><th className="px-2 py-2">Pts</th><th className="px-2 py-2">V-D</th></tr></thead><tbody>{rows.map((row, index) => <tr key={`${row.key}:${groupName}`} className="border-t border-slate-800"><td className="px-2 py-2 text-white">{index + 1}</td><td className="px-2 py-2 text-slate-200">{row.name}</td><td className="px-2 py-2 text-white">{row.points}</td><td className="px-2 py-2 text-slate-300">{row.wins}-{row.losses}</td></tr>)}</tbody></table></div> : null; })}</section>)}</div></section>}{mode !== "finals" && selected?.season_type !== "finals" && (mode === "annual" ? renderTable(annualRows, true) : renderTable(regularRows, false))}</>}</div></main></>;
}
