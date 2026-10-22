"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Match = {
  id: string;
  season_id: string;
  round_id: string;
  athlete_one_id: string;
  athlete_two_id: string | null;
  status: string;
  result_type: string | null;
  athlete_one_sets?: number;
  athlete_two_sets?: number;
  athlete_one_games?: number;
  athlete_two_games?: number;
  athlete_one_points?: number;
  athlete_two_points?: number;
};

type Athlete = { id: string; user_id: string; current_class: number; status: string };

const resultTypes = [
  { value: "normal", label: "Resultado" },
  { value: "walkover", label: "WO" },
  { value: "double_walkover", label: "WO duplo" },
] as const;

export default function QuickMatchResult() {
  const [match, setMatch] = useState<Match | null>(null);
  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [opponentName, setOpponentName] = useState("Adversário");
  const [resultType, setResultType] = useState<"normal" | "walkover" | "double_walkover">("normal");
  const [winner, setWinner] = useState<"me" | "opponent">("me");
  const [myGames, setMyGames] = useState("7");
  const [opponentGames, setOpponentGames] = useState("5");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const supabase = createClient();

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (active) setLoading(false); return; }
      const { data: athleteData } = await supabase.from("athletes").select("id, user_id, current_class, status").eq("user_id", user.id).maybeSingle();
      const currentAthlete = athleteData as Athlete | null;
      if (!currentAthlete) { if (active) setLoading(false); return; }
      const { data: season } = await supabase.from("seasons").select("id").eq("status", "active").order("year", { ascending: false }).limit(1).maybeSingle();
      if (!season) { if (active) { setAthlete(currentAthlete); setLoading(false); } return; }
      const { data: matches } = await supabase.from("matches").select("id, season_id, round_id, athlete_one_id, athlete_two_id, status, result_type, athlete_one_sets, athlete_two_sets, athlete_one_games, athlete_two_games, athlete_one_points, athlete_two_points").eq("season_id", season.id).or(`athlete_one_id.eq.${currentAthlete.id},athlete_two_id.eq.${currentAthlete.id}`).in("status", ["scheduled", "pending", "awaiting_result", "result_submitted", "contested"]).order("created_at", { ascending: true }).limit(1);
      const currentMatch = ((matches ?? [])[0] ?? null) as Match | null;
      if (currentMatch?.athlete_two_id) {
        const opponentId = currentMatch.athlete_one_id === currentAthlete.id ? currentMatch.athlete_two_id : currentMatch.athlete_one_id;
        const { data: opponent } = await supabase.from("athletes").select("user_id").eq("id", opponentId).maybeSingle();
        if (opponent?.user_id) {
          const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", opponent.user_id).maybeSingle();
          if (active) setOpponentName((profile as { full_name?: string } | null)?.full_name ?? "Adversário");
        }
      }
      if (active) { setAthlete(currentAthlete); setMatch(currentMatch); setLoading(false); }
    };
    void load();
    return () => { active = false; };
  }, []);

  async function saveResult() {
    if (!match || !athlete) return;
    setSaving(true); setError(""); setMessage("");
    const isFirst = match.athlete_one_id === athlete.id;
    const zero = resultType === "double_walkover";
    const mineWon = resultType === "walkover" ? winner === "me" : winner === "me";
    const mineGamesValue = zero ? 0 : Number(myGames) || 0;
    const opponentGamesValue = zero ? 0 : Number(opponentGames) || 0;
    const minePoints = resultType === "double_walkover" ? 0 : mineWon ? 7 : resultType === "walkover" ? 0 : 3;
    const opponentPoints = resultType === "double_walkover" ? 0 : mineWon ? (resultType === "walkover" ? 0 : 3) : 7;
    const mineSets = zero ? 0 : mineWon ? 1 : 0;
    const opponentSets = zero ? 0 : mineWon ? 0 : 1;
    const payload = {
      status: resultType === "double_walkover" || resultType === "walkover" ? "walkover" : "result_submitted",
      result_type: resultType,
      athlete_one_sets: isFirst ? mineSets : opponentSets,
      athlete_two_sets: isFirst ? opponentSets : mineSets,
      athlete_one_games: isFirst ? mineGamesValue : opponentGamesValue,
      athlete_two_games: isFirst ? opponentGamesValue : mineGamesValue,
      athlete_one_points: isFirst ? minePoints : opponentPoints,
      athlete_two_points: isFirst ? opponentPoints : minePoints,
      winner_athlete_id: resultType === "double_walkover" ? null : (mineWon ? athlete.id : match.athlete_two_id === athlete.id ? match.athlete_one_id : match.athlete_two_id),
      submitted_by: (await supabase.auth.getUser()).data.user?.id ?? null,
      submitted_at: new Date().toISOString(),
    };
    const { error: matchError } = await supabase.from("matches").update(payload).eq("id", match.id);
    if (matchError) { setError(`Não foi possível salvar o resultado: ${matchError.message}`); setSaving(false); return; }
    const events = resultType === "double_walkover"
      ? [
          { season_id: match.season_id, round_id: match.round_id, match_id: match.id, athlete_id: match.athlete_one_id, event_type: "double_walkover", points: 0, metadata: { source: "dashboard_quick_result" } },
          ...(match.athlete_two_id ? [{ season_id: match.season_id, round_id: match.round_id, match_id: match.id, athlete_id: match.athlete_two_id, event_type: "double_walkover", points: 0, metadata: { source: "dashboard_quick_result" } }] : []),
        ]
      : [];
    if (events.length > 0) await supabase.from("match_events").insert(events);
    setMessage("Resultado enviado com sucesso."); setMatch({ ...match, ...payload }); setSaving(false);
  }

  if (loading) return <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6"><p className="text-slate-400">Carregando seu confronto...</p></section>;
  if (!match) return <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6"><h2 className="text-xl font-semibold text-white">Seu confronto</h2><p className="mt-2 text-slate-400">Nenhum confronto pendente nesta rodada.</p></section>;

  return <section className="rounded-2xl border border-emerald-500/30 bg-slate-900/70 p-6 shadow-xl"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-wide text-emerald-400">Seu confronto</p><h2 className="mt-1 text-2xl font-bold text-white">Você × {opponentName}</h2><p className="mt-1 text-sm text-slate-400">Registre o resultado rapidamente nesta tela.</p></div><span className="rounded-full border border-emerald-500/30 px-3 py-1 text-xs text-emerald-300">{match.status}</span></div><div className="mt-6 grid gap-4 sm:grid-cols-3"><label className="text-sm text-slate-300">Tipo<select value={resultType} onChange={(event) => setResultType(event.target.value as typeof resultType)} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"><option value="normal">Resultado</option><option value="walkover">WO</option><option value="double_walkover">WO duplo</option></select></label><label className="text-sm text-slate-300">Vencedor<select value={winner} onChange={(event) => setWinner(event.target.value as typeof winner)} disabled={resultType === "double_walkover"} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"><option value="me">Você</option><option value="opponent">{opponentName}</option></select></label><div className="grid grid-cols-2 gap-2"><label className="text-sm text-slate-300">Seus games<input type="number" min="0" value={resultType === "double_walkover" ? 0 : myGames} disabled={resultType === "double_walkover"} onChange={(event) => setMyGames(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white" /></label><label className="text-sm text-slate-300">Adversário<input type="number" min="0" value={resultType === "double_walkover" ? 0 : opponentGames} disabled={resultType === "double_walkover"} onChange={(event) => setOpponentGames(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white" /></label></div></div>{resultType === "double_walkover" && <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">WO duplo: 0 pontos, 0 games e 0 sets para os dois atletas.</p>}{error && <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}{message && <p className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">{message}</p>}<button type="button" onClick={() => void saveResult()} disabled={saving || match.status === "completed" || match.status === "result_submitted"} className="mt-5 rounded-lg bg-emerald-500 px-5 py-3 font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50">{saving ? "Enviando..." : "Enviar resultado"}</button></section>;
}
