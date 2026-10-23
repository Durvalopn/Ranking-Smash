"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Athlete = { id: string; user_id: string; current_class: number; status: string };
type Profile = { id: string; full_name: string | null };
type Season = { id: string; name: string; year: number; status: string; class_movement_applied_at: string | null };
type Round = { id: string; season_id: string; round_number: number; status: string };
type Match = { season_id: string; round_id: string; athlete_one_id: string; athlete_two_id: string | null; status: string; result_type: string | null; athlete_one_points: number | null; athlete_two_points: number | null; athlete_one_sets: number | null; athlete_two_sets: number | null; athlete_one_games: number | null; athlete_two_games: number | null };
type Decision = { athleteId: string; name: string; fromClass: number; toClass: number; movementStatus: "promoted" | "relegated"; position: number; points: number };
type MovementRecord = { season_id: string; athlete_id: string; from_class: number; to_class: number; movement_status: "promoted" | "relegated"; final_position: number; points: number; applied_by: string | null };
type QueryTable = any;

const completedStatuses = ["result_submitted", "completed", "confirmed", "walkover"];
const className = (value: number) => `${value}ª Classe`;

export default function ClassMovementPanel() {
  const supabase = createClient();
  const [tab, setTab] = useState<"rounds" | "movement">("rounds");
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState("");
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const tables: QueryTable = supabase;
    const [athleteResult, seasonResult, roundResult, matchResult, profileResult] = await Promise.all([
      tables.from("athletes").select("id,user_id,current_class,status"),
      tables.from("seasons").select("id,name,year,status,class_movement_applied_at").order("year", { ascending: false }),
      tables.from("rounds").select("id,season_id,round_number,status"),
      tables.from("matches").select("season_id,round_id,athlete_one_id,athlete_two_id,status,result_type,athlete_one_points,athlete_two_points,athlete_one_sets,athlete_two_sets,athlete_one_games,athlete_two_games"),
      tables.from("profiles").select("id,full_name"),
    ]);
    if (athleteResult.error || seasonResult.error || roundResult.error || matchResult.error || profileResult.error) {
      setError("Não foi possível atualizar os dados administrativos.");
      setLoading(false);
      return;
    }
    const loadedSeasons = (seasonResult.data ?? []) as Season[];
    setAthletes((athleteResult.data ?? []) as Athlete[]);
    setSeasons(loadedSeasons);
    setRounds((roundResult.data ?? []) as Round[]);
    setMatches((matchResult.data ?? []) as Match[]);
    setProfiles((profileResult.data ?? []) as Profile[]);
    const pending = loadedSeasons.find((item) => item.status === "finished" && !item.class_movement_applied_at);
    setSelectedSeasonId((current) => current || pending?.id || loadedSeasons[0]?.id || "");
    setLoading(false);
  }, [supabase]);

  useEffect(() => { void load(); }, [load]);

  const selectedSeason = seasons.find((item) => item.id === selectedSeasonId) ?? null;
  const pendingMovement = Boolean(selectedSeason && selectedSeason.status === "finished" && !selectedSeason.class_movement_applied_at);
  const profileMap = useMemo(() => Object.fromEntries(profiles.map((profile) => [profile.id, profile.full_name || "Atleta"])), [profiles]);

  const decisions = useMemo<Decision[]>(() => {
    if (!selectedSeason) return [];
    const closedRoundIds = new Set(rounds.filter((round) => round.season_id === selectedSeason.id && round.status === "closed").map((round) => round.id));
    const rows = new Map<string, { id: string; name: string; classNumber: number; points: number; sets: number; games: number }>();
    for (const athlete of athletes) {
      if (athlete.status !== "active" && athlete.status !== "licensed") continue;
      rows.set(athlete.id, { id: athlete.id, name: profileMap[athlete.user_id] || "Atleta", classNumber: athlete.current_class, points: 0, sets: 0, games: 0 });
    }
    for (const match of matches) {
      if (match.season_id !== selectedSeason.id || !closedRoundIds.has(match.round_id) || !completedStatuses.includes(match.status)) continue;
      const one = rows.get(match.athlete_one_id);
      const two = match.athlete_two_id ? rows.get(match.athlete_two_id) : null;
      if (!one) continue;
      one.points += match.athlete_one_points ?? 0;
      one.sets += (match.athlete_one_sets ?? 0) - (match.athlete_two_sets ?? 0);
      one.games += (match.athlete_one_games ?? 0) - (match.athlete_two_games ?? 0);
      if (two) {
        two.points += match.athlete_two_points ?? 0;
        two.sets += (match.athlete_two_sets ?? 0) - (match.athlete_one_sets ?? 0);
        two.games += (match.athlete_two_games ?? 0) - (match.athlete_one_games ?? 0);
      }
    }
    const result: Decision[] = [];
    for (let classNumber = 1; classNumber <= 6; classNumber += 1) {
      const ranking = [...rows.values()].filter((row) => row.classNumber === classNumber).sort((a, b) => b.points - a.points || b.sets - a.sets || b.games - a.games || a.name.localeCompare(b.name));
      const slots = Math.ceil(ranking.length * 0.2);
      ranking.forEach((row, index) => {
        if (index < slots && classNumber > 1) result.push({ athleteId: row.id, name: row.name, fromClass: classNumber, toClass: classNumber - 1, movementStatus: "promoted", position: index + 1, points: row.points });
        if (index >= ranking.length - slots && classNumber < 6) result.push({ athleteId: row.id, name: row.name, fromClass: classNumber, toClass: classNumber + 1, movementStatus: "relegated", position: index + 1, points: row.points });
      });
    }
    return result;
  }, [selectedSeason, rounds, athletes, matches, profileMap]);

  const metrics = useMemo(() => ({
    active: athletes.filter((athlete) => athlete.status === "active").length,
    licensed: athletes.filter((athlete) => athlete.status === "licensed").length,
    pending: matches.filter((match) => !completedStatuses.includes(match.status)).length,
    closed: rounds.filter((round) => round.status === "closed").length,
  }), [athletes, matches, rounds]);

  async function applyMovement() {
    if (!selectedSeason || !pendingMovement) return;
    setApplying(true); setMessage(""); setError("");
    const { data: auth } = await supabase.auth.getUser();
    const appliedBy = auth.user?.id ?? null;
    const records: MovementRecord[] = decisions.map((decision) => ({ season_id: selectedSeason.id, athlete_id: decision.athleteId, from_class: decision.fromClass, to_class: decision.toClass, movement_status: decision.movementStatus, final_position: decision.position, points: decision.points, applied_by: appliedBy }));
    const movementTable: QueryTable = supabase.from("season_class_movements");
    const movementResult = records.length ? await movementTable.upsert(records, { onConflict: "season_id,athlete_id" }) : { error: null };
    if (movementResult.error) { setError("Não foi possível registrar as trocas de classes."); setApplying(false); return; }
    const athleteTable: QueryTable = supabase.from("athletes");
    const updates = await Promise.all(decisions.map((decision) => athleteTable.update({ current_class: decision.toClass }).eq("id", decision.athleteId)));
    const updateError = updates.find((result: any) => result.error)?.error;
    if (updateError) { setError("Os registros foram calculados, mas não foi possível concluir todas as alterações de classe."); setApplying(false); return; }
    const seasonTable: QueryTable = supabase.from("seasons");
    const seasonResult = await seasonTable.update({ class_movement_applied_at: new Date().toISOString(), class_movement_applied_by: appliedBy }).eq("id", selectedSeason.id);
    if (seasonResult.error) { setError("As classes foram atualizadas, mas não foi possível marcar a etapa como concluída."); setApplying(false); return; }
    setMessage("Trocas de classes aplicadas. A criação da próxima temporada está liberada.");
    setApplying(false);
    await load();
  }

  return <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
    <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-4">
      <button onClick={() => setTab("rounds")} className={`rounded-lg px-4 py-2 text-sm ${tab === "rounds" ? "bg-emerald-500 text-slate-950" : "bg-slate-800 text-slate-300"}`}>Atualização por rodada</button>
      <button onClick={() => setTab("movement")} className={`rounded-lg px-4 py-2 text-sm ${tab === "movement" ? "bg-emerald-500 text-slate-950" : "bg-slate-800 text-slate-300"}`}>Troca de classes</button>
    </div>
    {loading ? <p className="py-8 text-center text-slate-400">Atualizando Administração...</p> : error ? <p className="py-6 text-red-300">{error}</p> : tab === "rounds" ? <div className="pt-5">
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-xl bg-slate-950/60 p-4"><p className="text-xs text-slate-400">Atletas ativos</p><strong className="text-2xl text-white">{metrics.active}</strong></div>
        <div className="rounded-xl bg-slate-950/60 p-4"><p className="text-xs text-slate-400">Licenciados</p><strong className="text-2xl text-white">{metrics.licensed}</strong></div>
        <div className="rounded-xl bg-slate-950/60 p-4"><p className="text-xs text-slate-400">Partidas abertas</p><strong className="text-2xl text-white">{metrics.pending}</strong></div>
        <div className="rounded-xl bg-slate-950/60 p-4"><p className="text-xs text-slate-400">Rodadas encerradas</p><strong className="text-2xl text-white">{metrics.closed}</strong></div>
      </div>
      <div className="mt-5 space-y-2">{seasons.map((season) => <div key={season.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 p-4"><div><strong className="text-white">{season.name} {season.year}</strong><p className="text-sm text-slate-400">{rounds.filter((round) => round.season_id === season.id && round.status === "closed").length} rodada(s) encerrada(s) · {season.status}</p></div><span className={`rounded-full px-3 py-1 text-xs ${season.status === "finished" ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-200"}`}>{season.class_movement_applied_at ? "Classes atualizadas" : season.status === "finished" ? "Troca obrigatória pendente" : "Em andamento"}</span></div>)}</div>
    </div> : <div className="pt-5">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><h3 className="text-xl font-semibold text-white">Troca de classes obrigatória</h3><p className="mt-1 text-sm text-slate-400">Conclua esta etapa antes de gerar uma nova temporada.</p></div><select value={selectedSeasonId} onChange={(event) => setSelectedSeasonId(event.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white">{seasons.filter((item) => item.status === "finished").map((item) => <option key={item.id} value={item.id}>{item.name} {item.year}</option>)}</select></div>
      {selectedSeason && !pendingMovement && <p className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-200">A troca de classes desta temporada já foi concluída.</p>}
      {pendingMovement && <><div className="mt-5 grid gap-3 md:grid-cols-2">{(["promoted", "relegated"] as const).map((kind) => <div key={kind} className="rounded-xl border border-slate-800 bg-slate-950/50 p-4"><h4 className={`font-semibold ${kind === "promoted" ? "text-emerald-300" : "text-red-300"}`}>{kind === "promoted" ? "Acesso" : "Rebaixamento"}</h4>{decisions.filter((decision) => decision.movementStatus === kind).length ? <ul className="mt-2 space-y-1 text-sm text-slate-300">{decisions.filter((decision) => decision.movementStatus === kind).map((decision) => <li key={decision.athleteId}>{decision.name}: {className(decision.fromClass)} → {className(decision.toClass)}</li>)}</ul> : <p className="mt-2 text-sm text-slate-500">Nenhum atleta</p>}</div>)}</div><button disabled={applying} onClick={applyMovement} className="mt-5 rounded-lg bg-emerald-500 px-5 py-3 font-semibold text-slate-950 disabled:opacity-50">{applying ? "Aplicando..." : "Aplicar trocas e liberar próxima temporada"}</button></>}
      {message && <p className="mt-4 text-emerald-300">{message}</p>}
    </div>}
  </section>;
}
