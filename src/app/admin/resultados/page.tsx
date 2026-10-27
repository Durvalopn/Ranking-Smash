"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Navigation from "@/components/Navigation";
import { createClient } from "@/lib/supabase/client";

type Season = { id: string; name: string; year: number; status: string };
type Round = { id: string; season_id: string; round_number: number; name: string; status: string };
type Match = {
  id: string;
  round_id: string;
  class_number: number;
  draw_order: number | null;
  athlete_one_id: string;
  athlete_two_id: string | null;
  status: string;
  result_type: string | null;
  athlete_one_points: number | null;
  athlete_two_points: number | null;
  winner_athlete_id: string | null;
};
type Athlete = { id: string; user_id: string };
type Profile = { id: string; full_name: string | null };

const ADMIN_EMAIL = "eng.durvalneto@gmail.com";
const editableSeasonStatuses = ["registration", "active", "planned", "open"];
const className = (number: number) => number === 7 ? "Feminino" : `${number}ª Classe`;

export default function AdminResultsPage() {
  const db = createClient() as any;
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [seasonId, setSeasonId] = useState("");
  const [roundId, setRoundId] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      const { data: { user } } = await db.auth.getUser();
      if (!user || (user.email?.trim().toLowerCase() !== ADMIN_EMAIL && user.app_metadata?.role !== "admin")) {
        if (active) {
          setError("Acesso permitido somente ao administrador.");
          setLoading(false);
        }
        return;
      }

      const { data, error: seasonsError } = await db
        .from("seasons")
        .select("id,name,year,status")
        .in("status", editableSeasonStatuses)
        .eq("season_type", "regular")
        .order("created_at", { ascending: false });
      if (seasonsError) {
        if (active) {
          setError(`Não foi possível carregar as temporadas: ${seasonsError.message}`);
          setLoading(false);
        }
        return;
      }

      if (active) {
        const available = (data ?? []) as Season[];
        setAuthorized(true);
        setSeasons(available);
        setSeasonId((current) => current && available.some((season) => season.id === current)
          ? current
          : available.find((season) => season.status === "active")?.id ?? available[0]?.id ?? "");
      }
    }

    void load().catch((loadError) => {
      if (active) {
        setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar as temporadas.");
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [db]);

  useEffect(() => {
    if (!authorized || !seasonId) {
      setRounds([]);
      setMatches([]);
      setRoundId("");
      setLoading(false);
      return;
    }

    let active = true;
    async function loadSeasonMatches() {
      setLoading(true);
      setError("");
      const [roundResult, matchResult] = await Promise.all([
        db.from("rounds").select("id,season_id,round_number,name,status").eq("season_id", seasonId).order("round_number", { ascending: false }),
        db.from("matches")
          .select("id,round_id,class_number,draw_order,athlete_one_id,athlete_two_id,status,result_type,athlete_one_points,athlete_two_points,winner_athlete_id")
          .eq("season_id", seasonId)
          .order("draw_order", { ascending: true }),
      ]);
      if (roundResult.error || matchResult.error) {
        throw new Error(`Não foi possível carregar as partidas: ${roundResult.error?.message ?? matchResult.error?.message}`);
      }

      const loadedRounds = (roundResult.data ?? []) as Round[];
      const loadedMatches = (matchResult.data ?? []) as Match[];
      const athleteIds = [...new Set(loadedMatches.flatMap((match) => [match.athlete_one_id, match.athlete_two_id].filter(Boolean)))];
      const { data: athleteRows, error: athletesError } = athleteIds.length
        ? await db.from("athletes").select("id,user_id").in("id", athleteIds)
        : { data: [], error: null };
      if (athletesError) throw new Error(`Não foi possível carregar os atletas: ${athletesError.message}`);
      const userIds = ((athleteRows ?? []) as Athlete[]).map((athlete) => athlete.user_id);
      const { data: profileRows, error: profilesError } = userIds.length
        ? await db.from("profiles").select("id,full_name").in("id", userIds)
        : { data: [], error: null };
      if (profilesError) throw new Error(`Não foi possível carregar os nomes dos atletas: ${profilesError.message}`);
      const profileById = Object.fromEntries(((profileRows ?? []) as Profile[]).map((profile) => [profile.id, profile.full_name || "Atleta"]));
      const athleteNames = Object.fromEntries(((athleteRows ?? []) as Athlete[]).map((athlete) => [athlete.id, profileById[athlete.user_id] || "Atleta"]));

      if (active) {
        setRounds(loadedRounds);
        setMatches(loadedMatches);
        setNames(athleteNames);
        setRoundId((current) => current && loadedRounds.some((round) => round.id === current)
          ? current
          : loadedRounds.find((round) => round.status === "open")?.id ?? loadedRounds[0]?.id ?? "");
        setLoading(false);
      }
    }

    void loadSeasonMatches().catch((loadError) => {
      if (active) {
        setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar as partidas.");
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [authorized, db, seasonId]);

  const selectedRound = rounds.find((round) => round.id === roundId);
  const selectedSeason = seasons.find((season) => season.id === seasonId);
  const roundMatches = useMemo(
    () => matches.filter((match) => match.round_id === roundId),
    [matches, roundId],
  );

  return (
    <>
      <Navigation />
      <main className="page-container py-10">
        <div className="mx-auto max-w-5xl">
          <Link href="/admin" className="text-sm text-emerald-400">← Voltar à administração</Link>
          <h1 className="mt-4 text-3xl font-bold text-white">Corrigir resultados</h1>
          <p className="mt-2 text-slate-400">
            Selecione uma partida para ajustar o resultado. Rodadas encerradas podem ser corrigidas enquanto a temporada não estiver encerrada.
          </p>

          {!authorized && loading ? (
            <p className="mt-8 text-slate-400">Verificando acesso...</p>
          ) : error ? (
            <p className="mt-8 rounded-lg bg-red-500/10 p-4 text-red-300">{error}</p>
          ) : !seasons.length ? (
            <p className="mt-8 rounded-lg bg-slate-900 p-4 text-slate-400">Não há temporadas abertas para correção.</p>
          ) : (
            <>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <label className="text-sm text-slate-300">
                  Temporada
                  <select value={seasonId} onChange={(event) => setSeasonId(event.target.value)} className="mt-2 block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white">
                    {seasons.map((season) => <option key={season.id} value={season.id}>{season.name} {season.year}</option>)}
                  </select>
                </label>
                <label className="text-sm text-slate-300">
                  Rodada
                  <select value={roundId} onChange={(event) => setRoundId(event.target.value)} className="mt-2 block w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white">
                    {rounds.map((round) => <option key={round.id} value={round.id}>Rodada {round.round_number} · {round.status === "closed" ? "Encerrada" : "Aberta"}</option>)}
                  </select>
                </label>
              </div>

              {loading ? (
                <p className="mt-8 text-slate-400">Carregando partidas...</p>
              ) : !selectedRound || !selectedSeason ? (
                <p className="mt-8 text-slate-400">Não há rodadas disponíveis nesta temporada.</p>
              ) : (
                <section className="mt-6 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
                  <div className="border-b border-slate-800 p-4">
                    <h2 className="font-semibold text-white">{selectedSeason.name} {selectedSeason.year} · Rodada {selectedRound.round_number}</h2>
                    <p className="mt-1 text-sm text-slate-400">{roundMatches.length} partida(s)</p>
                  </div>
                  <div className="divide-y divide-slate-800">
                    {roundMatches.map((match) => {
                      const bye = match.result_type === "double_walkover" && !match.athlete_two_id;
                      return (
                        <div key={match.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                          <div>
                            <p className="font-medium text-white">
                              {names[match.athlete_one_id] ?? "Atleta"} × {match.athlete_two_id ? names[match.athlete_two_id] ?? "Atleta" : "BYE"}
                            </p>
                            <p className="mt-1 text-sm text-slate-400">
                              {className(match.class_number)} · {bye ? "BYE · 7 pontos" : match.winner_athlete_id ? `${match.athlete_one_points ?? 0} × ${match.athlete_two_points ?? 0} pontos` : "Aguardando resultado"}
                            </p>
                          </div>
                          {bye ? (
                            <span className="text-xs text-slate-500">BYE não editável como resultado de partida</span>
                          ) : (
                            <Link href={`/admin/resultados/${match.id}`} className="rounded-lg border border-emerald-500/40 px-4 py-2 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/10">
                              Corrigir resultado
                            </Link>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </main>
    </>
  );
}
