"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Navigation from "@/components/Navigation";
import { createClient } from "@/lib/supabase/client";

type Season = { id: string; name: string; year: number; status: string; season_type: string | null; created_at?: string };
type Round = { id: string; season_id: string; round_number: number; name: string; status: string };
type Match = { id: string; season_id: string; round_id: string; class_number: number; athlete_one_id: string; athlete_two_id: string | null; status: string; result_type: string | null; athlete_one_sets: number | null; athlete_two_sets: number | null; athlete_one_games: number | null; athlete_two_games: number | null; athlete_one_points: number | null; athlete_two_points: number | null; winner_athlete_id: string | null; draw_order: number | null };
type Athlete = { id: string; user_id: string };
type Profile = { id: string; full_name: string | null };

const classLabels = ["1ª Classe", "2ª Classe", "3ª Classe", "4ª Classe", "5ª Classe", "6ª Classe"];
const pendingStatuses = ["scheduled", "pending", "awaiting_result", "contested"];

function statusLabel(match: Match) {
  if (pendingStatuses.includes(match.status)) return "Aguardando resultado";
  if (match.result_type === "double_walkover") return "WO duplo";
  if (match.result_type === "walkover") return "Finalizada por WO";
  return "Resultado registrado";
}

function resultLabel(match: Match) {
  if (pendingStatuses.includes(match.status)) return "Confronto agendado. O resultado ainda não foi lançado.";
  const type = match.result_type === "double_walkover" ? "WO duplo" : match.result_type === "walkover" ? "WO" : "Resultado normal";
  return `${type} · ${match.athlete_one_sets ?? 0} x ${match.athlete_two_sets ?? 0} sets · ${match.athlete_one_games ?? 0} x ${match.athlete_two_games ?? 0} games · ${match.athlete_one_points ?? 0} x ${match.athlete_two_points ?? 0} pontos`;
}

export default function PartidasPage() {
  const supabase = createClient();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [seasonFilter, setSeasonFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true); setError("");
      const [seasonQuery, roundQuery, matchQuery] = await Promise.all([
        supabase.from("seasons").select("id,name,year,status,season_type,created_at").order("created_at", { ascending: true }),
        supabase.from("rounds").select("id,season_id,round_number,name,status").order("round_number", { ascending: true }),
        supabase.from("matches").select("id,season_id,round_id,class_number,athlete_one_id,athlete_two_id,status,result_type,athlete_one_sets,athlete_two_sets,athlete_one_games,athlete_two_games,athlete_one_points,athlete_two_points,winner_athlete_id,draw_order").order("draw_order", { ascending: true }),
      ]);
      if (seasonQuery.error || roundQuery.error || matchQuery.error) { if (mounted) { setError("Não foi possível carregar as partidas."); setLoading(false); } return; }
      const loadedMatches = (matchQuery.data ?? []) as Match[];
      const athleteIds = [...new Set(loadedMatches.flatMap((match) => [match.athlete_one_id, match.athlete_two_id].filter((id): id is string => Boolean(id))) )];
      let athleteRows: Athlete[] = []; let profileRows: Profile[] = [];
      if (athleteIds.length) {
        const athleteQuery = await supabase.from("athletes").select("id,user_id").in("id", athleteIds);
        athleteRows = (athleteQuery.data ?? []) as Athlete[];
        const userIds = [...new Set(athleteRows.map((athlete) => athlete.user_id))];
        if (userIds.length) {
          const profileQuery = await supabase.from("profiles").select("id,full_name").in("id", userIds);
          profileRows = (profileQuery.data ?? []) as Profile[];
        }
      }
      const profileMap = Object.fromEntries(profileRows.map((profile) => [profile.id, profile.full_name || "Atleta"]));
      const nameMap: Record<string, string> = {};
      athleteRows.forEach((athlete) => { nameMap[athlete.id] = profileMap[athlete.user_id] || "Atleta"; });
      if (mounted) { setSeasons((seasonQuery.data ?? []) as Season[]); setRounds((roundQuery.data ?? []) as Round[]); setMatches(loadedMatches); setNames(nameMap); setLoading(false); }
    }
    void load();
    return () => { mounted = false; };
  }, [supabase]);

  const visibleSeasons = useMemo(() => seasonFilter === "all" ? seasons : seasons.filter((season) => season.id === seasonFilter), [seasonFilter, seasons]);
  const seasonGroups = useMemo(() => visibleSeasons.map((season) => ({ season, rounds: rounds.filter((round) => round.season_id === season.id).map((round) => ({ round, matches: matches.filter((match) => match.round_id === round.id).sort((a, b) => (a.draw_order ?? 0) - (b.draw_order ?? 0)) })).filter((group) => group.matches.length > 0) })).filter((group) => group.rounds.length > 0), [visibleSeasons, rounds, matches]);
  const totalMatches = seasonGroups.reduce((total, group) => total + group.rounds.reduce((roundTotal, round) => roundTotal + round.matches.length, 0), 0);

  return <><Navigation /><main className="page-container py-10"><div className="mx-auto max-w-7xl"><Link href="/dashboard" className="text-sm text-emerald-400">← Voltar ao dashboard</Link><div className="mt-4 flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-bold text-white">Partidas</h1><p className="mt-2 text-slate-400">Todos os confrontos separados por temporada, rodada e classe.</p></div><label className="text-sm text-slate-300">Temporada<select value={seasonFilter} onChange={(event) => setSeasonFilter(event.target.value)} className="mt-2 block rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"><option value="all">Todas as temporadas</option>{seasons.map((season) => <option key={season.id} value={season.id}>{season.name} {season.year}{season.season_type === "finals" ? " · Finals" : ""}</option>)}</select></label></div>{loading ? <section className="mt-8 rounded-2xl bg-slate-900/70 p-8 text-center text-slate-400">Carregando partidas...</section> : error ? <section className="mt-8 rounded-2xl bg-red-500/10 p-8 text-center text-red-300">{error}</section> : <><div className="mt-6 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-slate-300"><strong className="text-white">{totalMatches}</strong> partida(s) encontrada(s) em <strong className="text-white">{seasonGroups.length}</strong> temporada(s)</div><div className="mt-8 space-y-8">{seasonGroups.map(({ season, rounds: seasonRounds }) => <section key={season.id} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4"><div><p className="text-xs uppercase tracking-wide text-emerald-400">{season.season_type === "finals" ? "Finals" : "Temporada regular"}</p><h2 className="text-2xl font-bold text-white">{season.name} {season.year}</h2></div><span className={`rounded-full px-3 py-1 text-xs ${season.status === "finished" ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-200"}`}>{season.status === "finished" ? "Encerrada" : "Em andamento"}</span></div><div className="mt-5 space-y-6">{seasonRounds.map(({ round, matches: roundMatches }) => { const grouped = classLabels.map((label, index) => ({ label, matches: roundMatches.filter((match) => match.class_number === index + 1) })).filter((group) => group.matches.length); return <section key={round.id} className="rounded-xl border border-slate-800 bg-slate-950/40 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-xl font-semibold text-white">{round.name || `Rodada ${round.round_number}`}</h3><p className="mt-1 text-sm text-slate-400">{roundMatches.length} confronto(s) · {round.status === "closed" ? "Encerrada" : "Em andamento"}</p></div><span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">Rodada {round.round_number}</span></div><div className="mt-4 space-y-4">{grouped.map((group) => <div key={group.label}><div className="mb-2 flex items-center justify-between"><h4 className="font-semibold text-emerald-300">{group.label}</h4><span className="text-xs text-slate-500">{group.matches.length} confronto(s)</span></div><div className="space-y-2">{group.matches.map((match) => <article key={match.id} className="rounded-xl border border-slate-800 bg-slate-900/70 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-wide text-slate-500">Confronto {match.draw_order ?? "-"}</p><h5 className="mt-1 text-lg font-semibold text-white">{names[match.athlete_one_id] ?? "Atleta"} <span className="mx-2 text-slate-500">×</span> {names[match.athlete_two_id ?? ""] ?? "Coringa"}</h5></div><span className={`rounded-full border px-3 py-1 text-xs ${pendingStatuses.includes(match.status) ? "border-amber-500/30 text-amber-200" : "border-emerald-500/30 text-emerald-300"}`}>{statusLabel(match)}</span></div><p className="mt-3 text-sm text-slate-300">{resultLabel(match)}</p></article>)}</div></div>)}</div></section>; })}</div></section>)}{seasonGroups.length === 0 && <section className="mt-8 rounded-2xl bg-slate-900/70 p-8 text-center text-slate-400">Nenhuma partida encontrada para o filtro selecionado.</section>}</div></main></>;
}
