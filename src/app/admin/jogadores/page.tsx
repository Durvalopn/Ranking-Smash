"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
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

type Athlete = Pick<Database["public"]["Tables"]["athletes"]["Row"], "id" | "user_id" | "current_class" | "status"> & {
  name: string;
  email: string | null;
};
type Season = Pick<Database["public"]["Tables"]["seasons"]["Row"], "id" | "name" | "year" | "status">;
type Round = Pick<Database["public"]["Tables"]["rounds"]["Row"], "id" | "season_id" | "round_number" | "status">;
type Match = Pick<Database["public"]["Tables"]["matches"]["Row"], "round_id" | "athlete_one_id" | "athlete_two_id">;

function classLabel(classNumber: number) {
  return classNumber === 7 ? "Feminino" : `${classNumber}ª Classe`;
}

function sanitizeDiagnosticString(value: string) {
  return value
    .replace(/\beyJ[\w-]+\.[\w-]+\.[\w-]+\b/g, "[redigido]")
    .replace(/\bsb_(?:secret|publishable)_[\w-]+\b/gi, "[redigido]")
    .replace(/\bBearer\s+\S+/gi, "Bearer [redigido]")
    .replace(/\b(?:SUPABASE|NEXT_PUBLIC_SUPABASE)_[A-Z0-9_]+\s*=\s*\S+/gi, "[variável de ambiente redigida]")
    .replace(/\b(api[_-]?key|service[_-]?role|secret|password|access[_-]?token|refresh[_-]?token)([ "'=:]+)\S+/gi, "$1$2[redigido]");
}

function sanitizeDiagnosticBody(value: unknown): unknown {
  if (typeof value === "string") return sanitizeDiagnosticString(value);
  if (Array.isArray(value)) return value.map(sanitizeDiagnosticBody);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        /(token|secret|password|credential|api.?key|service.?role|authorization|^env$)/i.test(key)
          ? "[redigido]"
          : sanitizeDiagnosticBody(entry),
      ]),
    );
  }
  return value;
}

export default function AdminPlayersPage() {
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [currentSeason, setCurrentSeason] = useState<Season | null>(null);
  const [currentRound, setCurrentRound] = useState<Round | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [athleteLoadError, setAthleteLoadError] = useState("");
  const [seasonLoadError, setSeasonLoadError] = useState(false);
  const [roundLoadError, setRoundLoadError] = useState(false);
  const [matchesLoadError, setMatchesLoadError] = useState(false);
  const [actionError, setActionError] = useState("");
  const [savingId, setSavingId] = useState("");

  async function load() {
    setLoading(true);
    setAthleteLoadError("");
    setSeasonLoadError(false);
    setRoundLoadError(false);
    setMatchesLoadError(false);
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

    let athleteResponse: Response;
    try {
      athleteResponse = await fetch("/api/admin/athletes/identities", { cache: "no-store" });
    } catch {
      console.error("[admin/jogadores] falha de rede ao carregar atletas", {
        status: "network-error",
        body: null,
        athleteCount: 0,
      });
      setAthleteLoadError("Não foi possível conectar à rota de identidades.");
      setLoading(false);
      return;
    }
    const athleteResult = await athleteResponse.json().catch(() => null) as {
      athletes?: Athlete[];
      error?: unknown;
      message?: unknown;
    } | null;
    const athleteCount = Array.isArray(athleteResult?.athletes) ? athleteResult.athletes.length : 0;
    console.info("[admin/jogadores] resposta da rota de identidades", {
      status: athleteResponse.status,
      body: sanitizeDiagnosticBody(athleteResult),
      athleteCount,
    });
    if (!athleteResponse.ok) {
      const responseMessage = typeof athleteResult?.message === "string"
        ? athleteResult.message
        : typeof athleteResult?.error === "string"
          ? athleteResult.error
          : athleteResponse.statusText || "Erro sem mensagem da rota.";
      setAthleteLoadError(
        `HTTP ${athleteResponse.status}: ${sanitizeDiagnosticString(responseMessage)}`,
      );
      setLoading(false);
      return;
    }
    const loadedAthletes = athleteResult?.athletes ?? [];
    setAthletes(loadedAthletes);

    const seasonQuery = await supabase
      .from("seasons")
      .select("id,name,year,status,season_type,created_at")
      .neq("season_type", "finals")
      .in("status", ["active", "registration"])
      .order("created_at", { ascending: false });

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

  const participants = useMemo(
    () => new Set(matches.flatMap((match) => [match.athlete_one_id, match.athlete_two_id].filter((id): id is string => Boolean(id)))),
    [matches],
  );
  const grouped = useMemo(() => Array.from({ length: 7 }, (_, index) => index + 1).map((classNumber) => ({
    classNumber,
    athletes: athletes
      .filter((athlete) => athlete.current_class === classNumber)
      .sort((left, right) => left.name.localeCompare(right.name)),
  })), [athletes]);

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
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => void load()}
                disabled={!authorized || loading}
                aria-label="Atualizar jogadores"
                title="Atualizar jogadores"
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-700 text-slate-300 transition hover:border-emerald-500 hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
              </button>
              <div className="text-right text-sm text-slate-400">
                <p>{seasonLabel}</p>
                <p>{roundLabel}</p>
              </div>
            </div>
          </div>
          {loading ? (
            <p className="mt-8 text-slate-400">Carregando jogadores...</p>
          ) : !authorized ? (
            <p className="mt-8 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-300">Acesso permitido somente ao administrador.</p>
          ) : athleteLoadError ? (
            <p className="mt-8 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-300">Falha ao carregar jogadores: {athleteLoadError}</p>
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
                            const participates = participants.has(athlete.id);
                            const participationLabel = matchesLoadError
                              ? "Indisponível"
                              : currentRound
                                ? participates ? "Participa" : "Não sorteado"
                                : "Sem rodada vigente";
                            return (
                              <tr key={athlete.id} className="border-t border-slate-800 text-slate-300">
                                <td className="py-3 pr-4 font-medium text-white">{athlete.name}</td>
                                <td className="py-3 pr-4">{athlete.email || "E-mail indisponível"}</td>
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
