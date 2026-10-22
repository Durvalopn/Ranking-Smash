"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Match = { id: string; season_id: string; round_id: string; athlete_one_id: string; athlete_two_id: string | null; status: string; result_type: string | null; athlete_one_sets: number | null; athlete_two_sets: number | null; athlete_one_games: number | null; athlete_two_games: number | null; athlete_one_points: number | null; athlete_two_points: number | null; winner_athlete_id: string | null };
type Athlete = { id: string; user_id: string; current_class: number; status: string };
type Round = { id: string; round_number: number; status: string };
type AnyTable = any;

const editableStatuses = ["scheduled", "pending", "awaiting_result", "contested", "result_submitted", "walkover"];

export default function QuickMatchResult() {
  const supabase = createClient();
  const [match, setMatch] = useState<Match | null>(null); const [athlete, setAthlete] = useState<Athlete | null>(null); const [round, setRound] = useState<Round | null>(null); const [opponentName, setOpponentName] = useState("Adversário"); const [resultType, setResultType] = useState("normal"); const [winner, setWinner] = useState("me"); const [myGames, setMyGames] = useState("7"); const [opponentGames, setOpponentGames] = useState("5"); const [saving, setSaving] = useState(false); const [loading, setLoading] = useState(true); const [message, setMessage] = useState(""); const [error, setError] = useState("");

  async function loadMatch() {
    setLoading(true); setError("");
    const { data: { user } } = await supabase.auth.getUser(); if (!user) { setLoading(false); return; }
    const athletesTable: AnyTable = supabase.from("athletes");
    const { data: athleteData, error: athleteError } = await athletesTable.select("id,user_id,current_class,status").eq("user_id", user.id).maybeSingle();
    if (athleteError) { setError("Não foi possível carregar o atleta."); setLoading(false); return; }
    const currentAthlete = athleteData as Athlete | null; if (!currentAthlete) { setLoading(false); return; }
    const { data: season } = await supabase.from("seasons").select("id").eq("status", "active").order("year", { ascending: false }).limit(1).maybeSingle();
    if (!season) { setAthlete(currentAthlete); setLoading(false); return; }
    const roundsTable: AnyTable = supabase.from("rounds");
    const { data: roundData, error: roundError } = await roundsTable.select("id,round_number,status").eq("season_id", season.id).in("status", ["open", "closed"]).order("round_number", { ascending: false }).limit(1).maybeSingle();
    if (roundError || !roundData) { setAthlete(currentAthlete); setLoading(false); return; }
    const currentRound = roundData as Round;
    const matchesTable: AnyTable = supabase.from("matches");
    const { data: matchData, error: matchError } = await matchesTable.select("id,season_id,round_id,athlete_one_id,athlete_two_id,status,result_type,athlete_one_sets,athlete_two_sets,athlete_one_games,athlete_two_games,athlete_one_points,athlete_two_points,winner_athlete_id").eq("season_id", season.id).eq("round_id", currentRound.id).or(`athlete_one_id.eq.${currentAthlete.id},athlete_two_id.eq.${currentAthlete.id}`).in("status", editableStatuses).order("created_at", { ascending: true }).limit(1);
    if (matchError) { setError("Não foi possível carregar seu confronto."); setLoading(false); return; }
    const currentMatch = ((matchData ?? [])[0] ?? null) as Match | null;
    if (currentMatch?.athlete_two_id) {
      const opponentId = currentMatch.athlete_one_id === currentAthlete.id ? currentMatch.athlete_two_id : currentMatch.athlete_one_id;
      const { data: opponent } = await athletesTable.select("user_id").eq("id", opponentId).maybeSingle();
      if (opponent?.user_id) { const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", opponent.user_id).maybeSingle(); setOpponentName((profile as { full_name?: string } | null)?.full_name ?? "Adversário"); }
    }
    if (currentMatch) {
      const isFirst = currentMatch.athlete_one_id === currentAthlete.id;
      const mineGames = isFirst ? currentMatch.athlete_one_games : currentMatch.athlete_two_games;
      const otherGames = isFirst ? currentMatch.athlete_two_games : currentMatch.athlete_one_games;
      if (currentMatch.result_type) setResultType(currentMatch.result_type);
      if (currentMatch.winner_athlete_id) setWinner(currentMatch.winner_athlete_id === currentAthlete.id ? "me" : "opponent");
      if (mineGames !== null && mineGames !== undefined) setMyGames(String(mineGames));
      if (otherGames !== null && otherGames !== undefined) setOpponentGames(String(otherGames));
    }
    setAthlete(currentAthlete); setRound(currentRound); setMatch(currentMatch); setLoading(false);
  }

  useEffect(() => { void loadMatch(); }, []);

  async function saveResult() {
    if (!match || !athlete || !round) return;
    setSaving(true); setError(""); setMessage("");
    const isFirst = match.athlete_one_id === athlete.id; const doubleWalkover = resultType === "double_walkover"; const walkover = resultType === "walkover"; const mineWon = winner === "me";
    const mineGamesValue = doubleWalkover ? 0 : Number(myGames) || 0; const opponentGamesValue = doubleWalkover ? 0 : Number(opponentGames) || 0;
    const minePoints = doubleWalkover ? 0 : walkover ? (mineWon ? 7 : 0) : (mineWon ? 7 : 3); const opponentPoints = doubleWalkover ? 0 : walkover ? (mineWon ? 0 : 7) : (mineWon ? 3 : 7);
    const mineSets = doubleWalkover ? 0 : mineWon ? 1 : 0; const opponentSets = doubleWalkover ? 0 : mineWon ? 0 : 1; const otherId = match.athlete_one_id === athlete.id ? match.athlete_two_id : match.athlete_one_id;
    const payload = { status: walkover || doubleWalkover ? "walkover" : "result_submitted", result_type: resultType, athlete_one_sets: isFirst ? mineSets : opponentSets, athlete_two_sets: isFirst ? opponentSets : mineSets, athlete_one_games: isFirst ? mineGamesValue : opponentGamesValue, athlete_two_games: isFirst ? opponentGamesValue : mineGamesValue, athlete_one_points: isFirst ? minePoints : opponentPoints, athlete_two_points: isFirst ? opponentPoints : minePoints, winner_athlete_id: doubleWalkover ? null : (mineWon ? athlete.id : otherId), submitted_by: (await supabase.auth.getUser()).data.user?.id ?? null, submitted_at: new Date().toISOString() };
    const matchesTable: AnyTable = supabase.from("matches");
    const { error: matchError } = await matchesTable.update(payload).eq("id", match.id).eq("round_id", round.id);
    if (matchError) { setError(`Não foi possível salvar o resultado: ${matchError.message}`); setSaving(false); return; }
    await supabase.from("match_events").delete().eq("match_id", match.id);
    const eventType = doubleWalkover ? "double_walkover" : walkover ? (mineWon ? "walkover_win" : "walkover_loss") : (mineWon ? "match_win" : "match_loss");
    const events = [{ season_id: match.season_id, round_id: round.id, match_id: match.id, athlete_id: athlete.id, event_type: eventType, points: minePoints, metadata: { source: "dashboard_quick_result", edited: match.status !== "scheduled" } }, ...(otherId ? [{ season_id: match.season_id, round_id: round.id, match_id: match.id, athlete_id: otherId, event_type: doubleWalkover ? "double_walkover" : mineWon ? "match_loss" : "walkover_win", points: opponentPoints, metadata: { source: "dashboard_quick_result", edited: match.status !== "scheduled" } }] : [])];
    const { error: eventError } = await supabase.from("match_events").insert(events);
    if (eventError) { setError(`Resultado salvo, mas os eventos não foram atualizados: ${eventError.message}`); setSaving(false); return; }
    setMessage(`Resultado da Rodada ${round.round_number} salvo. Você pode alterá-lo se necessário.`); await loadMatch(); setSaving(false);
  }

  if (loading) return <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6"><p className="text-slate-400">Carregando seu confronto...</p></section>;
  if (!match) return <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6"><h2 className="text-xl font-semibold text-white">Seu confronto</h2><p className="mt-2 text-slate-400">Nenhum confronto disponível na rodada atual.</p></section>;
  const doubleWalkover = resultType === "double_walkover"; const hasResult = match.status === "result_submitted" || match.status === "walkover";
  return <section className="rounded-2xl border border-emerald-500/30 bg-slate-900/70 p-6 shadow-xl"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-wide text-emerald-400">Rodada {round.round_number} · seu confronto</p><h2 className="mt-1 text-2xl font-bold text-white">Você × {opponentName}</h2><p className="mt-1 text-sm text-slate-400">{hasResult ? "Resultado registrado. Qualquer atleta da partida pode corrigi-lo." : "Registre o resultado rapidamente nesta tela."}</p></div><span className={`rounded-full border px-3 py-1 text-xs ${hasResult ? "border-emerald-500/30 text-emerald-300" : "border-amber-500/30 text-amber-200"}`}>{hasResult ? "Resultado enviado" : "Aguardando resultado"}</span></div><div className="mt-6 grid gap-4 sm:grid-cols-3"><label className="text-sm text-slate-300">Tipo<select value={resultType} onChange={(event) => setResultType(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"><option value="normal">Resultado</option><option value="walkover">WO</option><option value="double_walkover">WO duplo</option></select></label><label className="text-sm text-slate-300">Vencedor<select value={winner} onChange={(event) => setWinner(event.target.value)} disabled={doubleWalkover} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"><option value="me">Você</option><option value="opponent">{opponentName}</option></select></label><div className="grid grid-cols-2 gap-2"><label className="text-sm text-slate-300">Seus games<input type="number" min="0" value={doubleWalkover ? 0 : myGames} disabled={doubleWalkover} onChange={(event) => setMyGames(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white" /></label><label className="text-sm text-slate-300">Adversário<input type="number" min="0" value={doubleWalkover ? 0 : opponentGames} disabled={doubleWalkover} onChange={(event) => setOpponentGames(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white" /></label></div></div>{doubleWalkover && <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">WO duplo: 0 pontos, 0 games e 0 sets para os dois atletas.</p>}{error && <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}{message && <p className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">{message}</p>}<button type="button" onClick={() => void saveResult()} disabled={saving} className="mt-5 rounded-lg bg-emerald-500 px-5 py-3 font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50">{saving ? "Salvando..." : hasResult ? "Alterar resultado" : "Enviar resultado"}</button></section>;
}
