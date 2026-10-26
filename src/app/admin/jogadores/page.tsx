"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Navigation from "@/components/Navigation";
import { createClient } from "@/lib/supabase/client";
import type { AthleteStatus, Database } from "@/types/database";

const ADMIN_EMAIL = "eng.durvalneto@gmail.com";
const statusLabels: Record<AthleteStatus, string> = {
  active: "Ativo",
  licensed: "Licenciado",
  inactive: "Inativo",
  pendente: "Pendente",
};

type Athlete = Pick<Database["public"]["Tables"]["athletes"]["Row"], "id" | "user_id" | "current_class" | "status">;
type Profile = Pick<Database["public"]["Tables"]["profiles"]["Row"], "id" | "full_name">;
type Identity = { name: string; email: string | null };
type Season = Pick<Database["public"]["Tables"]["seasons"]["Row"], "id" | "name" | "year" | "status">;
type Round = Pick<Database["public"]["Tables"]["rounds"]["Row"], "id" | "season_id" | "round_number" | "status">;
type Match = Pick<Database["public"]["Tables"]["matches"]["Row"], "round_id" | "athlete_one_id" | "athlete_two_id">;

function classLabel(classNumber: number) {
  return classNumber === 7 ? "Feminino" : `${classNumber}ª Classe`;
}

export default function AdminPlayersPage() {
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [identities, setIdentities] = useState<Record<string, Identity>>({});
  const [currentSeason, setCurrentSeason] = useState<Season | null>(null);
  const [currentRound, setCurrentRound] = useState<Round | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [athleteLoadError, setAthleteLoadError] = useState(false);
  const [seasonLoadError, setSeasonLoadError] = useState(false);
  const [roundLoadError, setRoundLoadError] = useState(false);
  const [matchesLoadError, setMatchesLoadError] = useState(false);
  const [actionError, setActionError] = useState("");
  const [savingId, setSavingId] = useState("");

  async function load() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const isAdmin = Boolean(user && (
      user.email?.trim().toLowerCase() === ADMIN_EMAIL ||
      user.app_metadata?.role === "admin"
    ));
    setAuthorized(isAdmin);
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    const [athleteQuery, profileQuery, seasonQuery] = await Promise.all([
      supabase.from("athletes").select("id,user_id,current_class,status").order("current_class"),
      supabase.from("profiles").select("id,full_name"),
      supabase
        .from("seasons")
        .select("id,name,year,status,season_type,created_at")
        .neq("season_type", "finals")
        .in("status", ["active", "registration"])
        .order("created_at", { ascending: false }),
    ]);

    if (athleteQuery.error) {
      console.error("[admin/jogadores] falha ao carregar atletas", { code: athleteQuery.error.code });
      setAthleteLoadError(true);
      setLoading(false);
      return;
    }
    setAthletes((athleteQuery.data ?? []) as Athlete[]);

    if (profileQuery.error) {
      console.error("[admin/jogadores] falha ao carregar perfis", { code: profileQuery.error.code });
      setProfiles([]);
    } else {
      setProfiles((profileQuery.data ?? []) as Profile[]);
    }

    try {
      const identityResponse = await fetch("/api/admin/athletes/identities", { cache: "no-store" });
      if (identityResponse.ok) {
        const result = await identityResponse.json() as { identities?: Record<string, Identity> };
        setIdentities(result.identities ?? {});
      } else {
        console.error("[admin/jogadores] falha ao carregar identificações administrativas", { status: identityResponse.status });
      }
    } catch {
      console.error("[admin/jogadores] falha de rede ao carregar identificações administrativas");
    }

    if (seasonQuery.error) {
      console.error("[admin/jogadores] falha ao consultar temporadas", { code: seasonQuery.error.code });
      setSeasonLoadError(true);
      setLoading(false);
      return;
    }

    const seasons = (seasonQuery.data ?? []) as Season[];
    const season = seasons.find((item) => item.status === "active") ?? seasons[0] ?? null;
    setCurrentSeason(season);
    if (!season) {
      setLoading(false);
      return;
    }

    const roundQuery = await supabase
      .from("rounds")
      .select("id,season_id,round_number,status")
      .eq("season_id", season.id)
      .order("round_number", { ascending: true });
    if (roundQuery.error) {
      console.error("[admin/jogadores] falha ao consultar rodadas", { code: roundQuery.error.code });
      setRoundLoadError(true);
      setLoading(false);
      return;
    }

    const rounds = (roundQuery.data ?? []) as Round[];
    const eligibleRounds = rounds.filter((round) => round.status !== "draft" && round.status !== "cancelled");
    const round = eligibleRounds.find((item) => item.status === "open") ?? eligibleRounds[eligibleRounds.length - 1] ?? null;
    setCurrentRound(round);
    if (!round) {
      setLoading(false);
      return;
    }

    const matchQuery = await supabase
      .from("matches")
      .select("round_id,athlete_one_id,athlete_two_id")
      .eq("round_id", round.id);
    if (matchQuery.error) {
      console.error("[admin/jogadores] falha ao carregar participação na rodada", { code: matchQuery.error.code });
      setMatchesLoadError(true);
    } else {
      setMatches((matchQuery.data ?? []) as Match[]);
    }
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  const profileMap = useMemo(() => new Map(profiles.map((profile) => [profile.id, profile])), [profiles]);
  const participants = useMemo(
    () => new Set(matches.flatMap((match) => [match.athlete_one_id, match.athlete_two_id].filter((id): id is string => Boolean(id)))),
    [matches],
  );
  const grouped = useMemo(() => Array.from({ length: 7 }, (_, index) => index + 1).map((classNumber) => ({
    classNumber,
    athletes: athletes
      .filter((athlete) => athlete.current_class === classNumber)
      .sort((left, right) => (identities[left.user_id]?.name ?? profileMap.get(left.user_id)?.full_name ?? "").localeCompare(identities[right.user_id]?.name ?? profileMap.get(right.user_id)?.full_name ?? "")),
  })), [athletes, identities, profileMap]);

  async function changeStatus(athleteId: string, status: Athlete["status"]) {
    setSavingId(athleteId);
    setActionError("");
    try {
      const response = await fetch("/api/athlete/status", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ athleteId, status }),
      });
      const result = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) setActionError(result?.error ?? "Não foi possível atualizar o status.");
      else setAthletes((current) => current.map((athlete) => athlete.id === athleteId ? { ...athlete, status } : athlete));
    } catch {
      setActionError("Não foi possível atualizar o status.");
    } finally {
      setSavingId("");
    }
  }

  const seasonLabel = seasonLoadError
    ? "Temporada indisponível"
    : currentSeason
      ? `${currentSeason.name} ${currentSeason.year}`
      : "Sem temporada vigente";
  const roundLabel = roundLoadError
    ? "Rodada indisponível"
    : currentRound
      ? `Rodada ${currentRound.round_number}`
      : "Sem rodada vigente";

  return (
    <>
      <Navigation />
      <main className="page-container py-10">
        <div className="mx-auto max-w-6xl">
          <Link href="/admin" className="text-sm text-emerald-400">← Voltar à Administração</Link>
          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white">Jogadores</h1>
              <p className="mt-2 text-slate-400">Atletas organizados por classe e participação na rodada vigente.</p>
            </div>
            <div className="text-right text-sm text-slate-400">
              <p>{seasonLabel}</p>
              <p>{roundLabel}</p>
            </div>
          </div>
          {loading ? (
            <p className="mt-8 text-slate-400">Carregando jogadores...</p>
          ) : !authorized ? (
            <p className="mt-8 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-300">Acesso permitido somente ao administrador.</p>
          ) : athleteLoadError ? (
            <p className="mt-8 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-300">Não foi possível carregar os jogadores.</p>
          ) : (
            <div className="mt-6">
              {actionError && <p className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{actionError}</p>}
              {grouped.map(({ classNumber, athletes: classAthletes }) => (
                <section key={classNumber} className="border-t border-slate-800 py-5">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-white">{classLabel(classNumber)}</h2>
                    <span className="text-sm text-slate-500">{classAthletes.length}</span>
                  </div>
                  {classAthletes.length === 0 ? (
                    <p className="mt-3 text-sm text-slate-500">Nenhum jogador nesta classe.</p>
                  ) : (
                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full min-w-[720px] text-left text-sm">
                        <thead className="text-xs uppercase text-slate-500">
                          <tr>
                            <th className="py-2 pr-4">Nome</th>
                            <th className="py-2 pr-4">E-mail</th>
                            <th className="py-2 pr-4">Status</th>
                            <th className="py-2">Rodada vigente</th>
                          </tr>
                        </thead>
                        <tbody>
                          {classAthletes.map((athlete) => {
                            const profile = profileMap.get(athlete.user_id);
                            const identity = identities[athlete.user_id];
                            const participates = participants.has(athlete.id);
                            const participationLabel = matchesLoadError
                              ? "Indisponível"
                              : currentRound
                                ? participates ? "Participa" : "Não sorteado"
                                : "Sem rodada vigente";
                            return (
                              <tr key={athlete.id} className="border-t border-slate-800 text-slate-300">
                                <td className="py-3 pr-4 font-medium text-white">{identity?.name || profile?.full_name || `Atleta ${athlete.user_id.slice(0, 8)}`}</td>
                                <td className="py-3 pr-4">{identity?.email || "E-mail indisponível"}</td>
                                <td className="py-3 pr-4">
                                  <select
                                    value={athlete.status}
                                    disabled={savingId === athlete.id}
                                    onChange={(event) => void changeStatus(athlete.id, event.target.value as Athlete["status"])}
                                    className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-white disabled:opacity-50"
                                  >
                                    {Object.entries(statusLabels).map(([value, label]) => (
                                      <option key={value} value={value}>{label}</option>
                                    ))}
                                  </select>
                                </td>
                                <td className="py-3">
                                  <span className={participates ? "text-emerald-300" : "text-slate-500"}>{participationLabel}</span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
