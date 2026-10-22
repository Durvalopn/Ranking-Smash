"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Navigation from "@/components/Navigation";
import { createClient } from "@/lib/supabase/client";

type Season = { id: string; name: string; year: number; status: string };
type Round = { id: string; round_number: number; name: string; status: string; season_id: string };
type Match = {
  id: string; class_number: number; round_id: string; athlete_one_id: string; athlete_two_id: string | null;
  status: string; result_type: string | null; athlete_one_sets: number | null; athlete_two_sets: number | null;
  athlete_one_games: number | null; athlete_two_games: number | null; athlete_one_points: number | null;
  athlete_two_points: number | null; winner_athlete_id: string | null; draw_order: number | null;
};
type Athlete = { id: string; user_id: string; current_class: number };
type Profile = { id: string; full_name: string | null };
type QueryTable = any;

const classLabels = ["1ª Classe", "2ª Classe", "3ª Classe", "4ª Classe", "5ª Classe", "6ª Classe"];
const pendingStatuses = ["scheduled", "pending", "awaiting_result", "contested"];

function statusLabel(match: Match) {
  if (pendingStatuses.includes(match.status)) return "Aguardando resultado";
  if (match.result_type === "double_walkover") return "WO duplo";
  if (match.result_type === "walkover") return "Finalizada por WO";
  return "Resultado enviado";
}

function resultLabel(match: Match) {
  if (pendingStatuses.includes(match.status)) return "Confronto agendado. O resultado ainda não foi lançado.";
  const type = match.result_type === "walkover" ? "WO" : match.result_type === "double_walkover" ? "WO duplo" : "Resultado normal";
  return `${type} · ${match.athlete_one_sets ?? 0} x ${match.athlete_two_sets ?? 0} sets · ${match.athlete_one_games ?? 0} x ${match.athlete_two_games ?? 0} games · ${match.athlete_one_points ?? 0} x ${match.athlete_two_points ?? 0} pontos`;
}

export default function PartidasPage() {
  const supabase = createClient();
  const [season, setSeason] = useState<Season | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [athletes, setAthletes] = useState<Record<string, Athlete>>({});
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [selectedRound, setSelectedRound] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError("");
      const seasonsTable: QueryTable = supabase.from("seasons");
      const { data: seasonData, error: seasonError } = await seasonsTable
        .select("id, name, year, status")
        .in("status", ["active", "finished", "registration"])
        .order("year", { ascending: false })
        .limit(1)
        .maybeSingle();
      const currentSeason = seasonData as Season | null;
      if (seasonError) { if (mounted) setError("Não foi possível carregar a temporada."); setLoading(false); return; }
      if (!currentSeason) { if (mounted) { setSeason(null); setLoading(false); } return; }

      const roundsTable: QueryTable = supabase.from("rounds");
      const matchesTable: QueryTable = supabase.from("matches");
      const [{ data: roundData, error: roundError }, { data: matchData, error: matchError }] = await Promise.all([
        roundsTable.select("id, round_number, name, status, season_id").eq("season_id", currentSeason.id).order("round_number"),
        matchesTable.select("id, class_number, round_id, athlete_one_id, athlete_two_id, status, result_type, athlete_one_sets, athlete_two_sets, athlete_one_games, athlete_two_games, athlete_one_points, athlete_two_points, winner_athlete_id, draw_order").eq("season_id", currentSeason.id).order("class_number").order("draw_order"),
      ]);
      if (roundError || matchError) { if (mounted) setError("Não foi possível carregar as partidas."); setLoading(false); return; }

      const loadedMatches = (matchData ?? []) as Match[];
      const athleteIds = [...new Set(loadedMatches.flatMap((match) => [match.athlete_one_id, match.athlete_two_id].filter(Boolean)))];
      const athletesTable: QueryTable = supabase.from("athletes");
      const profilesTable: QueryTable = supabase.from("profiles");
      const { data: athleteData } = athleteIds.length ? await athletesTable.select("id, user_id, current_class").in("id", athleteIds) : { data: [] as Athlete[] };
      const userIds = [...new Set(((athleteData ?? []) as Athlete[]).map((athlete) => athlete.user_id))];
      const { data: profileData } = userIds.length ? await profilesTable.select("id, full_name").in("id", userIds) : { data: [] as Profile[] };
      if (!mounted) return;
      setSeason(currentSeason);
      setRounds((roundData ?? []) as Round[]);
      setMatches(loadedMatches);
      setAthletes(Object.fromEntries(((athleteData ?? []) as Athlete[]).map((athlete) => [athlete.id, athlete])));
      setProfiles(Object.fromEntries(((profileData ?? []) as Profile[]).map((profile) => [profile.id, profile])));
      const openRound = ((roundData ?? []) as Round[]).find((round) => round.status === "open");
      if (openRound) setSelectedRound(openRound.round_number);
      setLoading(false);
    }
    void load();
    return () => { mounted = false; };
  }, []);

  const selectedRoundData = useMemo(() => rounds.find((round) => round.round_number === selectedRound) ?? null, [rounds, selectedRound]);
  const selectedMatches = useMemo(() => selectedRoundData ? matches.filter((match) => match.round_id === selectedRoundData.id) : [], [matches, selectedRoundData]);
  const athleteName = (athleteId: string | null) => {
    if (!athleteId) return "Bye";
    const athlete = athletes[athleteId];
    return athlete ? profiles[athlete.user_id]?.full_name ?? "Atleta" : "Atleta";
  };

  return <>
    <Navigation />
    <main className="page-container py-10">
      <div className="mx-auto max-w-6xl">
        <Link href="/dashboard" className="text-sm text-emerald-400">← Voltar ao dashboard</Link>
        <div className="mt-4">
          <h1 className="text-3xl font-bold text-white">Partidas</h1>
          <p className="mt-2 text-slate-400">Selecione uma rodada para consultar seus confrontos e resultados.</p>
        </div>

        {loading ? <section className="mt-8 rounded-2xl bg-slate-900/70 p-8 text-center text-slate-400">Carregando partidas...</section> : error ? <section className="mt-8 rounded-2xl bg-red-500/10 p-8 text-center text-red-300">{error}</section> : !season ? <section className="mt-8 rounded-2xl bg-slate-900/70 p-8 text-center text-slate-400">Nenhuma temporada disponível.</section> : <>
          <div className="mt-6 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-slate-300"><strong className="text-white">{season.name} {season.year}</strong> · {matches.length} partida(s) cadastrada(s)</div>
          <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {[1, 2, 3, 4, 5, 6].map((roundNumber) => {
              const round = rounds.find((item) => item.round_number === roundNumber);
              const count = round ? matches.filter((match) => match.round_id === round.id).length : 0;
              const active = selectedRound === roundNumber;
              return <button key={roundNumber} type="button" onClick={() => setSelectedRound(roundNumber)} className={`rounded-xl border px-3 py-4 text-left transition ${active ? "border-emerald-400 bg-emerald-500/15" : "border-slate-800 bg-slate-900/70 hover:border-slate-600"}`}><span className={`block text-sm font-semibold ${active ? "text-emerald-300" : "text-white"}`}>Rodada {roundNumber}</span><span className="mt-1 block text-xs text-slate-400">{round ? (round.status === "closed" ? "Encerrada" : "Vigente") : "Ainda não gerada"}</span><span className="mt-2 block text-xs text-slate-500">{count} confronto(s)</span></button>;
            })}
          </div>

          <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-semibold text-white">Rodada {selectedRound}</h2><p className="mt-1 text-sm text-slate-400">{selectedRoundData ? selectedRoundData.status === "closed" ? "Rodada encerrada · resultados disponíveis" : "Rodada vigente · confrontos em andamento" : "Esta rodada ainda não foi gerada."}</p></div>{selectedRoundData && <span className={`rounded-full border px-3 py-1 text-xs ${selectedRoundData.status === "closed" ? "border-slate-600 text-slate-300" : "border-amber-500/30 text-amber-200"}`}>{selectedRoundData.status === "closed" ? "Encerrada" : "Vigente"}</span>}</div>
            {!selectedRoundData ? <p className="mt-6 rounded-lg border border-slate-800 bg-slate-950/50 p-5 text-sm text-slate-400">Nenhum confronto foi gerado para esta rodada.</p> : selectedMatches.length === 0 ? <p className="mt-6 rounded-lg border border-slate-800 bg-slate-950/50 p-5 text-sm text-slate-400">Nenhum confronto cadastrado nesta rodada.</p> : <div className="mt-5 space-y-5">{classLabels.map((label, index) => { const group = selectedMatches.filter((match) => match.class_number === index + 1); if (!group.length) return null; return <div key={label}><div className="mb-2 flex items-center justify-between"><h3 className="font-semibold text-emerald-300">{label}</h3><span className="text-xs text-slate-500">{group.length} confronto(s)</span></div><div className="space-y-2">{group.map((match) => <article key={match.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-wide text-slate-500">Confronto {match.draw_order ?? "-"}</p><h4 className="mt-1 text-lg font-semibold text-white">{athleteName(match.athlete_one_id)} <span className="mx-2 text-slate-500">×</span> {athleteName(match.athlete_two_id)}</h4></div><span className={`rounded-full border px-3 py-1 text-xs ${pendingStatuses.includes(match.status) ? "border-amber-500/30 text-amber-200" : "border-emerald-500/30 text-emerald-300"}`}>{statusLabel(match)}</span></div><p className="mt-3 text-sm text-slate-300">{resultLabel(match)}</p></article>)}</div></div>; })}</div>}
          </section>
        </>}
      </div>
    </main>
  </>;
}
