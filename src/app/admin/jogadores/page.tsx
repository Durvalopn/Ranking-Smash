"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Navigation from "@/components/Navigation";
import { createClient } from "@/lib/supabase/client";

const ADMIN_EMAIL = "eng.durvalneto@gmail.com";
const statusLabels: Record<string, string> = { active: "Ativo", licensed: "Licenciado", inactive: "Inativo", pendente: "Pendente" };
type Athlete = { id: string; user_id: string; current_class: number; status: keyof typeof statusLabels };
type Profile = { id: string; full_name: string | null; email: string | null };
type Season = { id: string; name: string; year: number; status: string; season_type: string };
type Round = { id: string; season_id: string; round_number: number; status: string };
type Match = { round_id: string; athlete_one_id: string; athlete_two_id: string | null };

function classLabel(classNumber: number) {
  return classNumber === 7 ? "Feminino" : `${classNumber}ª Classe`;
}

export default function AdminPlayersPage() {
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentRound, setCurrentRound] = useState<Round | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState("");

  async function load() {
    const supabase = createClient() as any;
    const { data: { user } } = await supabase.auth.getUser();
    const { data: role } = user ? await supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle() : { data: null };
    const isAdmin = Boolean(user && (user.email?.trim().toLowerCase() === ADMIN_EMAIL || user.app_metadata?.role === "admin" || role?.role === "admin"));
    setAuthorized(isAdmin);
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    const [athleteQuery, profileQuery, seasonQuery, roundQuery, matchQuery] = await Promise.all([
      supabase.from("athletes").select("id,user_id,current_class,status").order("current_class"),
      supabase.from("profiles").select("id,full_name,email"),
      supabase.from("seasons").select("id,name,year,status,season_type").neq("season_type", "finals").in("status", ["active", "registration", "planned", "open", "closed"]).order("created_at", { ascending: false }),
      supabase.from("rounds").select("id,season_id,round_number,status"),
      supabase.from("matches").select("round_id,athlete_one_id,athlete_two_id"),
    ]);
    const failed = [athleteQuery, profileQuery, seasonQuery, roundQuery, matchQuery].find((query) => query.error);
    if (failed) {
      setError("Não foi possível carregar a lista de jogadores.");
      setLoading(false);
      return;
    }

    const seasons = (seasonQuery.data ?? []) as Season[];
    const season = seasons.find((item) => item.status === "open") ?? seasons[0];
    const rounds = (roundQuery.data ?? []) as Round[];
    const seasonRounds = rounds.filter((round) => round.season_id === season?.id && round.status !== "cancelled").sort((left, right) => left.round_number - right.round_number);
    const round = seasonRounds.find((item) => item.status === "open") ?? seasonRounds[seasonRounds.length - 1] ?? null;
    setAthletes((athleteQuery.data ?? []) as Athlete[]);
    setProfiles((profileQuery.data ?? []) as Profile[]);
    setCurrentRound(round);
    setMatches((matchQuery.data ?? []) as Match[]);
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  const profileMap = useMemo(() => new Map(profiles.map((profile) => [profile.id, profile])), [profiles]);
  const participants = useMemo(() => new Set(matches.filter((match) => match.round_id === currentRound?.id).flatMap((match) => [match.athlete_one_id, match.athlete_two_id].filter((id): id is string => Boolean(id)))), [matches, currentRound]);
  const grouped = useMemo(() => Array.from({ length: 7 }, (_, index) => index + 1).map((classNumber) => ({
    classNumber,
    athletes: athletes.filter((athlete) => athlete.current_class === classNumber).sort((left, right) => (profileMap.get(left.user_id)?.full_name ?? "").localeCompare(profileMap.get(right.user_id)?.full_name ?? "")),
  })), [athletes, profileMap]);

  async function changeStatus(athleteId: string, status: Athlete["status"]) {
    setSavingId(athleteId);
    setError("");
    const response = await fetch("/api/athlete/status", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ athleteId, status }) });
    const result = await response.json().catch(() => null) as { error?: string } | null;
    if (!response.ok) setError(result?.error ?? "Não foi possível atualizar o status.");
    else setAthletes((current) => current.map((athlete) => athlete.id === athleteId ? { ...athlete, status } : athlete));
    setSavingId("");
  }

  return <><Navigation /><main className="page-container py-10"><div className="mx-auto max-w-6xl"><Link href="/admin" className="text-sm text-emerald-400">← Voltar à Administração</Link><div className="mt-4 flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-bold text-white">Jogadores</h1><p className="mt-2 text-slate-400">Atletas organizados por classe e participação na rodada vigente.</p></div><p className="text-sm text-slate-400">{currentRound ? `Rodada ${currentRound.round_number}` : "Sem rodada vigente"}</p></div>{loading ? <p className="mt-8 text-slate-400">Carregando jogadores...</p> : !authorized ? <p className="mt-8 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-300">Acesso permitido somente ao administrador.</p> : error && athletes.length === 0 ? <p className="mt-8 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-300">{error}</p> : <><div className="mt-6">{error && <p className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}{grouped.map(({ classNumber, athletes: classAthletes }) => <section key={classNumber} className="border-t border-slate-800 py-5"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold text-white">{classLabel(classNumber)}</h2><span className="text-sm text-slate-500">{classAthletes.length}</span></div>{classAthletes.length === 0 ? <p className="mt-3 text-sm text-slate-500">Nenhum jogador nesta classe.</p> : <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="text-xs uppercase text-slate-500"><tr><th className="py-2 pr-4">Nome</th><th className="py-2 pr-4">E-mail</th><th className="py-2 pr-4">Status</th><th className="py-2">Rodada vigente</th></tr></thead><tbody>{classAthletes.map((athlete) => { const profile = profileMap.get(athlete.user_id); const participates = participants.has(athlete.id); return <tr key={athlete.id} className="border-t border-slate-800 text-slate-300"><td className="py-3 pr-4 font-medium text-white">{profile?.full_name || "Jogador"}</td><td className="py-3 pr-4">{profile?.email || "E-mail indisponível"}</td><td className="py-3 pr-4"><select value={athlete.status} disabled={savingId === athlete.id} onChange={(event) => void changeStatus(athlete.id, event.target.value as Athlete["status"])} className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-white disabled:opacity-50">{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></td><td className="py-3"><span className={participates ? "text-emerald-300" : "text-slate-500"}>{currentRound ? participates ? "Participa" : "Não sorteado" : "Sem rodada"}</span></td></tr>; })}</tbody></table></div>}</section>)}</div></>}</div></main></>;
}