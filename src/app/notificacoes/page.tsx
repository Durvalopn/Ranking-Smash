"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Navigation from "@/components/Navigation";
import { createClient } from "@/lib/supabase/client";

type Season = { id: string; name: string; year: number; status: string; created_at?: string };
type Round = { id: string; season_id: string; round_number: number; status: string };
type Athlete = { id: string; user_id: string };
type Profile = { id: string; full_name: string | null };
type Movement = { id: string; season_id: string; athlete_id: string; from_class: number; to_class: number; movement_status: string; final_position: number | null; points: number | null; movement_reason: string | null; description: string | null };

const labels = ["1ª Classe", "2ª Classe", "3ª Classe", "4ª Classe", "5ª Classe", "6ª Classe"];
const isPromotion = (movement: Movement) => movement.movement_status === "promoted" || movement.to_class < movement.from_class;
const isRelegation = (movement: Movement) => movement.movement_status === "relegated" || movement.to_class > movement.from_class;

export default function NotificacoesPage() {
  const supabase = createClient() as any;
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    async function load() {
      const [{ data: seasonData, error: seasonError }, { data: roundData, error: roundError }, { data: athleteData, error: athleteError }, { data: profileData, error: profileError }, { data: movementData, error: movementError }] = await Promise.all([
        supabase.from("seasons").select("id,name,year,status,created_at").order("year", { ascending: false }).order("created_at", { ascending: false }),
        supabase.from("rounds").select("id,season_id,round_number,status").order("round_number", { ascending: false }),
        supabase.from("athletes").select("id,user_id"),
        supabase.from("profiles").select("id,full_name"),
        supabase.from("season_class_movements").select("id,season_id,athlete_id,from_class,to_class,movement_status,final_position,points,movement_reason,description").order("from_class").order("final_position", { ascending: true, nullsFirst: false }),
      ]);
      if (!mounted) return;
      const failure = seasonError || roundError || athleteError || profileError || movementError;
      if (failure) { setError("Não foi possível carregar as notificações."); setLoading(false); return; }
      setSeasons((seasonData ?? []) as Season[]);
      setRounds((roundData ?? []) as Round[]);
      setAthletes((athleteData ?? []) as Athlete[]);
      setProfiles(Object.fromEntries(((profileData ?? []) as Profile[]).map((profile) => [profile.id, profile])));
      setMovements((movementData ?? []) as Movement[]);
      setLoading(false);
    }
    void load();
    return () => { mounted = false; };
  }, []);

  const athleteNames = useMemo(() => Object.fromEntries(athletes.map((athlete) => [athlete.id, profiles[athlete.user_id]?.full_name ?? "Atleta"])), [athletes, profiles]);
  const finishedSeasons = seasons.filter((season) => season.status === "finished");
  const currentSeason = seasons.find((season) => season.status === "open") ?? seasons[0];
  const closedRounds = currentSeason ? rounds.filter((round) => round.season_id === currentSeason.id && round.status === "closed").slice(0, 6) : [];

  return <><Navigation /><main className="page-container py-10"><div className="mx-auto max-w-6xl"><Link href="/dashboard" className="text-sm text-emerald-400">← Voltar ao dashboard</Link><div className="mt-4"><h1 className="text-3xl font-bold text-white">Notificações</h1><p className="mt-2 text-slate-400">Orientações após cada rodada, resumos de temporada e movimentações de classe.</p></div>{loading ? <section className="mt-8 rounded-2xl bg-slate-900/70 p-8 text-center text-slate-400">Carregando notificações...</section> : error ? <section className="mt-8 rounded-2xl bg-red-500/10 p-8 text-red-300">{error}</section> : <><div className="mt-8 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-slate-300"><strong className="text-white">{currentSeason?.name ?? "Temporada atual"} {currentSeason?.year ?? ""}</strong> · {finishedSeasons.length} temporada(s) encerrada(s)</div><section className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Mensagem para você</p><p className="mt-2 leading-7 text-slate-200">Cada rodada é uma oportunidade de evoluir. Confie no seu trabalho, aprenda com cada partida e siga em frente.</p></section><section className="mt-8 space-y-6">{finishedSeasons.length ? finishedSeasons.map((season) => { const seasonMovements = movements.filter((movement) => movement.season_id === season.id); return <article key={season.id} className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5"><div className="border-b border-slate-800 pb-4"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400">Temporada encerrada</p><h2 className="mt-1 text-2xl font-bold text-white">{season.name} {season.year}</h2><p className="mt-1 text-sm text-slate-400">Resultado oficial de acesso e rebaixamento por classe.</p></div><div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{labels.map((label, index) => { const classNumber = index + 1; const promoted = seasonMovements.filter((movement) => movement.from_class === classNumber && isPromotion(movement)); const relegated = seasonMovements.filter((movement) => movement.from_class === classNumber && isRelegation(movement)); return <div key={label} className="rounded-xl border border-slate-800 bg-slate-950/50 p-4"><h3 className="font-semibold text-white">{label}</h3><div className="mt-3"><p className="text-xs font-semibold uppercase tracking-wide text-emerald-400">Acesso</p>{promoted.length ? <ul className="mt-2 space-y-1 text-sm text-emerald-200">{promoted.map((movement) => <li key={movement.id}>▲ {athleteNames[movement.athlete_id] ?? "Atleta"} <span className="text-emerald-400">→ {labels[movement.to_class - 1] ?? `${movement.to_class}ª Classe`}</span></li>)}</ul> : <p className="mt-2 text-sm text-slate-500">Nenhum atleta</p>}</div><div className="mt-4 border-t border-slate-800 pt-3"><p className="text-xs font-semibold uppercase tracking-wide text-red-400">Rebaixamento</p>{relegated.length ? <ul className="mt-2 space-y-1 text-sm text-red-200">{relegated.map((movement) => <li key={movement.id}>▼ {athleteNames[movement.athlete_id] ?? "Atleta"} <span className="text-red-400">→ {labels[movement.to_class - 1] ?? `${movement.to_class}ª Classe`}</span></li>)}</ul> : <p className="mt-2 text-sm text-slate-500">Nenhum atleta</p>}</div></div>; })}</div></article>; }) : <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 text-slate-400">Nenhuma temporada encerrada ainda.</section>}</section><section className="mt-8 space-y-4">{closedRounds.map((round) => <article key={round.id} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"><p className="text-xs uppercase tracking-wide text-slate-500">Rodada {round.round_number}</p><h2 className="mt-1 text-xl font-semibold text-white">Rodada {round.round_number} encerrada</h2><p className="mt-2 text-slate-300">A classificação da rodada foi atualizada. Consulte seus pontos, sets e jogos.</p></article>)}</section></>}</div></main></>;
}
