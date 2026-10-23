"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Match = { id:string; season_id:string; round_id:string; athlete_one_id:string; athlete_two_id:string|null; status:string; result_type:string|null; athlete_one_sets:number|null; athlete_two_sets:number|null; athlete_one_games:number|null; athlete_two_games:number|null; athlete_one_points:number|null; athlete_two_points:number|null; winner_athlete_id:string|null };
type Athlete = { id:string; user_id:string; current_class:number; status:string };
type Round = { id:string; round_number:number; status:string };
type Season = { id:string; name:string; year:number; status:string };

const editableStatuses = ["scheduled","pending","awaiting_result","contested","result_submitted","walkover"];
const savedStatuses = ["result_submitted","walkover"];

export default function QuickMatchResult() {
  const supabase = createClient() as any;
  const [match,setMatch] = useState<Match|null>(null);
  const [athlete,setAthlete] = useState<Athlete|null>(null);
  const [round,setRound] = useState<Round|null>(null);
  const [opponentName,setOpponentName] = useState("Adversário");
  const [resultType,setResultType] = useState("normal");
  const [winner,setWinner] = useState("me");
  const [myGames,setMyGames] = useState("0");
  const [opponentGames,setOpponentGames] = useState("0");
  const [saving,setSaving] = useState(false);
  const [loading,setLoading] = useState(true);
  const [message,setMessage] = useState("");
  const [error,setError] = useState("");

  async function loadMatch() {
    setLoading(true); setError("");
    const { data:{ user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data: athleteData, error: athleteError } = await supabase.from("athletes").select("id,user_id,current_class,status").eq("user_id",user.id).maybeSingle();
    if (athleteError || !athleteData) { setLoading(false); return; }
    setAthlete(athleteData);
    const { data: seasons, error: seasonError } = await supabase.from("seasons").select("id,name,year,status").in("status",["active","registration","planned","open","closed"]).order("year",{ascending:false}).order("created_at",{ascending:false});
    if (seasonError || !seasons?.length) { setLoading(false); return; }
    const season = (seasons.find((item:Season)=>item.status==="open") ?? seasons[0]) as Season;
    const { data: rounds, error: roundError } = await supabase.from("rounds").select("id,round_number,status").eq("season_id",season.id).in("status",["open","closed"]).order("round_number",{ascending:false}).limit(1);
    if (roundError || !rounds?.length) { setLoading(false); return; }
    const currentRound = rounds[0] as Round; setRound(currentRound);
    const { data: matches, error: matchError } = await supabase.from("matches").select("id,season_id,round_id,athlete_one_id,athlete_two_id,status,result_type,athlete_one_sets,athlete_two_sets,athlete_one_games,athlete_two_games,athlete_one_points,athlete_two_points,winner_athlete_id").eq("season_id",season.id).eq("round_id",currentRound.id).in("status",editableStatuses).or(`athlete_one_id.eq.${athleteData.id},athlete_two_id.eq.${athleteData.id}`).order("created_at",{ascending:true}).limit(1);
    if (matchError || !matches?.length) { setLoading(false); return; }
    const current = matches[0] as Match; setMatch(current);
    const opponentId = current.athlete_one_id===athleteData.id ? current.athlete_two_id : current.athlete_one_id;
    if (opponentId) { const { data: opponent } = await supabase.from("athletes").select("user_id").eq("id",opponentId).maybeSingle(); if (opponent?.user_id) { const { data: profile } = await supabase.from("profiles").select("full_name").eq("id",opponent.user_id).maybeSingle(); setOpponentName(profile?.full_name ?? "Adversário"); } }
    setResultType(current.result_type ?? "normal");
    if (current.winner_athlete_id) setWinner(current.winner_athlete_id===athleteData.id?"me":"opponent");
    const mine = current.athlete_one_id===athleteData.id ? current.athlete_one_games : current.athlete_two_games;
    const theirs = current.athlete_one_id===athleteData.id ? current.athlete_two_games : current.athlete_one_games;
    setMyGames(String(mine ?? 0)); setOpponentGames(String(theirs ?? 0)); setLoading(false);
  }

  useEffect(()=>{ void loadMatch(); },[]);

  async function saveResult() {
    if (!match || !athlete || !round || round.status!=="open") return;
    setSaving(true); setError(""); setMessage("");
    const isFirst = match.athlete_one_id===athlete.id;
    const my = Math.max(0,Number(myGames)||0); const opp = Math.max(0,Number(opponentGames)||0);
    const doubleWalkover = resultType==="double_walkover";
    const walkover = resultType==="walkover";
    const myWin = winner==="me";
    const payload = { status: walkover||doubleWalkover?"walkover":"result_submitted", result_type: resultType, athlete_one_sets: doubleWalkover?0:isFirst?my>opp?1:0:opp>my?1:0, athlete_two_sets: doubleWalkover?0:isFirst?opp>my?1:0:my>opp?1:0, athlete_one_games: walkover||doubleWalkover?0:isFirst?my:opp, athlete_two_games: walkover||doubleWalkover?0:isFirst?opp:my, athlete_one_points: doubleWalkover?0:walkover?(isFirst?(myWin?7:0):(myWin?0:7)):(isFirst?(myWin?7:3):(myWin?3:7)), athlete_two_points: doubleWalkover?0:walkover?(isFirst?(myWin?0:7):(myWin?7:0)):(isFirst?(myWin?3:7):(myWin?7:3)), winner_athlete_id: doubleWalkover?null:(myWin?athlete.id:(match.athlete_one_id===athlete.id?match.athlete_two_id:match.athlete_one_id)), submitted_by:(await supabase.auth.getUser()).data.user?.id ?? null, submitted_at:new Date().toISOString() };
    const { error: saveError } = await supabase.from("matches").update(payload).eq("id",match.id).eq("round_id",round.id);
    if (saveError) setError(`Não foi possível salvar o resultado: ${saveError.message}`); else { setMessage("Resultado salvo. Ele poderá ser alterado enquanto a rodada estiver aberta."); await loadMatch(); }
    setSaving(false);
  }

  if (loading) return <section className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5"><p className="text-sm text-slate-400">Carregando seu confronto...</p></section>;
  if (!match || !round) return <section className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5"><h2 className="text-xl font-semibold text-white">Seu confronto</h2><p className="mt-2 text-sm text-slate-400">Nenhum confronto disponível na rodada atual.</p></section>;
  const canEdit = round.status === "open" && editableStatuses.includes(match.status);
  const scoreEnabled = canEdit && resultType === "normal";
  const hasSavedResult = savedStatuses.includes(match.status) || match.winner_athlete_id !== null || match.result_type === "walkover" || match.result_type === "double_walkover";
  const buttonLabel = saving ? "Salvando..." : hasSavedResult ? "Alterar resultado" : "Salvar resultado";
  return <section className="rounded-2xl border border-emerald-500/30 bg-slate-950/60 p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400">Rodada {round.round_number}</p><h2 className="mt-1 text-xl font-bold text-white">Seu confronto</h2><p className="mt-1 text-sm text-slate-300">Você <span className="text-slate-500">vs.</span> {opponentName}</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${hasSavedResult ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"}`}>{hasSavedResult ? "Resultado salvo" : "Aguardando resultado"}</span></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><div><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Placar</p><div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2"><label className="text-xs text-slate-400">Você<input aria-label="Meus jogos" type="number" min="0" value={myGames} disabled={!scoreEnabled} onChange={e=>setMyGames(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-lg font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50" /></label><span className="pb-2 text-slate-500">x</span><label className="text-xs text-slate-400">{opponentName}<input aria-label="Jogos do adversário" type="number" min="0" value={opponentGames} disabled={!scoreEnabled} onChange={e=>setOpponentGames(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-lg font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50" /></label></div></div><div className="grid gap-4 sm:grid-cols-2"><label className="text-xs text-slate-400">Vencedor<select value={winner} disabled={!canEdit||resultType==="double_walkover"} onChange={e=>setWinner(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"><option value="me">Você</option><option value="opponent">{opponentName}</option></select></label><label className="text-xs text-slate-400">Tipo<select value={resultType} disabled={!canEdit} onChange={e=>{ const next=e.target.value; setResultType(next); if(next!=="normal"){setMyGames("0");setOpponentGames("0");} }} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"><option value="normal">Normal</option><option value="walkover">WO</option><option value="double_walkover">WO duplo</option></select></label></div></div>{canEdit&&<button type="button" disabled={saving} onClick={saveResult} className="mt-5 rounded-lg bg-emerald-500 px-5 py-2.5 font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-50">{buttonLabel}</button>}{!canEdit&&<p className="mt-4 text-sm text-slate-400">A rodada foi encerrada. O resultado não pode mais ser alterado.</p>}{message&&<p className="mt-3 text-sm text-emerald-300">{message}</p>}{error&&<p className="mt-3 text-sm text-red-300">{error}</p>}</section>;
}
