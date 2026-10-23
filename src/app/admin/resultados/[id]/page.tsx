"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Navigation from "@/components/Navigation";
import { createClient } from "@/lib/supabase/client";

type Match = { id: string; season_id: string; round_id: string; class_number: number; status: string; result_type: string | null; athlete_one_id: string; athlete_two_id: string | null; athlete_one_sets: number | null; athlete_two_sets: number | null; athlete_one_games: number | null; athlete_two_games: number | null; athlete_one_points: number | null; athlete_two_points: number | null; winner_athlete_id: string | null };
type Round = { id: string; season_id: string; round_number: number; name: string; status: string };
type Season = { id: string; name: string; year: number; season_type: string | null; status: string };
type Athlete = { id: string; user_id: string };
type Profile = { id: string; full_name: string | null };

const ADMIN_EMAIL = "eng.durvalneto@gmail.com";
const finishedStatuses = ["result_submitted", "completed", "confirmed", "walkover"];

export default function AdminResultPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();
  const matchId = params.id;
  const [match, setMatch] = useState<Match | null>(null);
  const [round, setRound] = useState<Round | null>(null);
  const [season, setSeason] = useState<Season | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [resultType, setResultType] = useState("normal");
  const [winner, setWinner] = useState("");
  const [oneSets, setOneSets] = useState("0");
  const [twoSets, setTwoSets] = useState("0");
  const [oneGames, setOneGames] = useState("0");
  const [twoGames, setTwoGames] = useState("0");
  const [onePoints, setOnePoints] = useState("0");
  const [twoPoints, setTwoPoints] = useState("0");

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const email = user?.email?.toLowerCase() ?? "";
      if (!user || email !== ADMIN_EMAIL) { if (active) { setError("Acesso permitido somente ao administrador."); setLoading(false); } return; }
      const matchQuery = await supabase.from("matches").select("id,season_id,round_id,class_number,status,result_type,athlete_one_id,athlete_two_id,athlete_one_sets,athlete_two_sets,athlete_one_games,athlete_two_games,athlete_one_points,athlete_two_points,winner_athlete_id").eq("id", matchId).maybeSingle();
      if (matchQuery.error || !matchQuery.data) { if (active) { setError("Partida não encontrada."); setLoading(false); } return; }
      const loadedMatch = matchQuery.data as Match;
      const [roundQuery, seasonQuery, athletesQuery] = await Promise.all([
        supabase.from("rounds").select("id,season_id,round_number,name,status").eq("id", loadedMatch.round_id).maybeSingle(),
        supabase.from("seasons").select("id,name,year,season_type,status").eq("id", loadedMatch.season_id).maybeSingle(),
        supabase.from("athletes").select("id,user_id").in("id", [loadedMatch.athlete_one_id, loadedMatch.athlete_two_id].filter(Boolean)),
      ]);
      const athletes = (athletesQuery.data ?? []) as Athlete[];
      const userIds = athletes.map((athlete) => athlete.user_id);
      const profilesQuery = userIds.length ? await supabase.from("profiles").select("id,full_name").in("id", userIds) : { data: [], error: null };
      const profiles = (profilesQuery.data ?? []) as Profile[];
      const profileMap = Object.fromEntries(profiles.map((profile) => [profile.id, profile.full_name || "Atleta"]));
      const nameMap: Record<string, string> = {};
      for (const athlete of athletes) nameMap[athlete.id] = profileMap[athlete.user_id] || "Atleta";
      if (active) {
        setAuthorized(true); setMatch(loadedMatch); setRound((roundQuery.data ?? null) as Round | null); setSeason((seasonQuery.data ?? null) as Season | null); setNames(nameMap); setResultType(loadedMatch.result_type === "walkover" || loadedMatch.result_type === "double_walkover" ? loadedMatch.result_type : "normal"); setWinner(loadedMatch.winner_athlete_id ?? ""); setOneSets(String(loadedMatch.athlete_one_sets ?? 0)); setTwoSets(String(loadedMatch.athlete_two_sets ?? 0)); setOneGames(String(loadedMatch.athlete_one_games ?? 0)); setTwoGames(String(loadedMatch.athlete_two_games ?? 0)); setOnePoints(String(loadedMatch.athlete_one_points ?? 0)); setTwoPoints(String(loadedMatch.athlete_two_points ?? 0)); setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [matchId, supabase]);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!match || !round || !season) return;
    setError(""); setMessage("");
    if (round.status !== "closed") { setError("A alteração só pode ser feita depois do fechamento da rodada."); return; }
    if (season.season_type === "finals" && !["closed"].includes(round.status)) { setError("A etapa do Finals ainda não está encerrada."); return; }
    if (resultType !== "double_walkover" && !winner) { setError("Selecione o vencedor."); return; }
    if (resultType === "double_walkover" && winner) { setError("WO duplo não pode ter vencedor."); return; }
    const values = { athlete_one_sets: Number(oneSets) || 0, athlete_two_sets: Number(twoSets) || 0, athlete_one_games: Number(oneGames) || 0, athlete_two_games: Number(twoGames) || 0, athlete_one_points: Number(onePoints) || 0, athlete_two_points: Number(twoPoints) || 0 };
    if (Object.values(values).some((value) => value < 0)) { setError("Os valores não podem ser negativos."); return; }
    setSaving(true);
    const update = await supabase.from("matches").update({ ...values, result_type: resultType, winner_athlete_id: resultType === "double_walkover" ? null : winner, status: resultType === "walkover" || resultType === "double_walkover" ? "walkover" : "completed", updated_at: new Date().toISOString(), confirmed_at: new Date().toISOString() }).eq("id", match.id).select("id,season_id,round_id,class_number,status,result_type,athlete_one_id,athlete_two_id,athlete_one_sets,athlete_two_sets,athlete_one_games,athlete_two_games,athlete_one_points,athlete_two_points,winner_athlete_id").single();
    if (update.error) { setError("Não foi possível salvar a correção. Verifique as permissões do administrador."); setSaving(false); return; }
    setMatch(update.data as Match); setMessage("Resultado corrigido. A classificação, as partidas e as estatísticas passam a usar os novos valores automaticamente."); setSaving(false);
  };

  if (loading) return <><Navigation /><main className="page-container py-10"><p className="text-slate-400">Carregando partida...</p></main></>;
  if (!authorized || !match) return <><Navigation /><main className="page-container py-10"><section className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-200">{error || "Não foi possível carregar a partida."}</section></main></>;
  const oneName = names[match.athlete_one_id] || "Atleta"; const twoName = match.athlete_two_id ? names[match.athlete_two_id] || "Atleta" : "Coringa";
  return <><Navigation /><main className="page-container py-10"><div className="mx-auto max-w-3xl"><Link href="/admin" className="text-sm text-emerald-400">← Voltar à administração</Link><section className="mt-4 rounded-2xl border border-yellow-400/30 bg-yellow-400/10 p-5"><p className="text-xs uppercase tracking-wide text-yellow-200">Correção administrativa pós-fechamento</p><h1 className="mt-2 text-2xl font-bold text-white">{season?.name} {season?.year} · Rodada {round?.round_number}</h1><p className="mt-2 text-sm text-slate-300">{oneName} × {twoName} · Classe {match.class_number}</p><p className="mt-2 text-xs text-yellow-100/80">A rodada está encerrada. A correção altera a leitura da classificação, da aba Partidas e das estatísticas.</p></section><form onSubmit={save} className="mt-6 space-y-5 rounded-2xl border border-slate-800 bg-slate-900/70 p-6"><label className="block text-sm text-slate-300">Tipo de resultado<select value={resultType} onChange={(event) => setResultType(event.target.value)} className="mt-2 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"><option value="normal">Resultado normal</option><option value="walkover">WO</option><option value="double_walkover">WO duplo</option></select></label><label className="block text-sm text-slate-300">Vencedor<select value={winner} onChange={(event) => setWinner(event.target.value)} disabled={resultType === "double_walkover"} className="mt-2 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"><option value="">Selecione</option><option value={match.athlete_one_id}>{oneName}</option>{match.athlete_two_id && <option value={match.athlete_two_id}>{twoName}</option>}</select></label><div className="grid gap-4 sm:grid-cols-2">{[["Sets",oneSets,setOneSets,twoSets,setTwoSets],["Games",oneGames,setOneGames,twoGames,setTwoGames],["Pontos",onePoints,setOnePoints,twoPoints,setTwoPoints]].map(([label,one,setOne,two,setTwo])=><div key={String(label)} className="rounded-xl border border-slate-800 p-4"><p className="font-semibold text-white">{label}</p><div className="mt-3 grid grid-cols-2 gap-3"><label className="text-xs text-slate-400">{oneName}<input type="number" min="0" value={String(one)} onChange={(event) => (setOne as (value: string) => void)(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-white" /></label><label className="text-xs text-slate-400">{twoName}<input type="number" min="0" value={String(two)} onChange={(event) => (setTwo as (value: string) => void)(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-white" /></label></div></div>)}</div>{error && <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}{message && <p className="rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-300">{message}</p>}<button type="submit" disabled={saving} className="rounded-lg bg-emerald-500 px-5 py-3 font-semibold text-slate-950 disabled:opacity-50">{saving ? "Salvando..." : "Salvar correção"}</button></form></div></main></>;
}
