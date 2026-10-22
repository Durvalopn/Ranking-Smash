import { redirect } from "next/navigation";

import AthleteDashboard from "@/components/AthleteDashboard";
import Navigation from "@/components/Navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Dashboard",
  description: "Acompanhe seus confrontos, resultados e classificação.",
};

type DashboardStatus =
  | "scheduled"
  | "awaiting_result"
  | "result_submitted"
  | "confirmed"
  | "contested"
  | "completed"
  | "walkover";

type ProfileRow = { full_name: string | null };
type AthleteRow = {
  id: string;
  current_class: number;
  status: "active" | "licensed" | "inactive";
};
type NameRow = {
  id: string;
  profiles: { full_name: string | null } | { full_name: string | null }[] | null;
};
type ResultRow = {
  match_id: string;
  winner_id: string | null;
  winner_games: number | null;
  loser_games: number | null;
  winner_points: number;
  loser_points: number;
};

function profileName(value: NameRow["profiles"]): string {
  return Array.isArray(value)
    ? value[0]?.full_name ?? "Atleta"
    : value?.full_name ?? "Atleta";
}

function dashboardStatus(status: string, resultType: string | null): DashboardStatus {
  if (resultType === "walkover" || status === "walkover") return "walkover";
  if (["awaiting_result", "result_submitted", "confirmed", "contested", "completed"].includes(status)) {
    return status as DashboardStatus;
  }
  return "scheduled";
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/dashboard");

  const [profileResult, athleteResult] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
    supabase.from("athletes").select("id, current_class, status").eq("user_id", user.id).maybeSingle(),
  ]);

  const profile = profileResult.data as ProfileRow | null;
  const athlete = athleteResult.data as AthleteRow | null;
  const athleteName = profile?.full_name ?? user.email?.split("@")[0] ?? "Atleta Smash";
  const athleteClass = athlete?.current_class ?? 6;
  const athleteStatus = athlete?.status === "licensed" ? "licensed" : "active";

  if (!athlete) {
    return <><Navigation /><AthleteDashboard athleteName={athleteName} athleteClass={athleteClass} athleteStatus={athleteStatus} matches={[]} standings={[]} /></>;
  }

  const { data: seasonData } = await supabase
    .from("seasons")
    .select("id, name, rounds_count")
    .in("status", ["active", "registration"])
    .order("year", { ascending: false })
    .limit(1)
    .maybeSingle();

  const season = seasonData as { id: string; name: string; rounds_count: number } | null;

  if (!season) {
    return <><Navigation /><AthleteDashboard athleteName={athleteName} athleteClass={athleteClass} athleteStatus={athleteStatus} seasonName="Nenhuma temporada ativa" currentRound={0} totalRounds={0} matches={[]} standings={[]} /></>;
  }

  const [{ data: roundData }, { data: matchData }, { data: standingData }] = await Promise.all([
    supabase.from("rounds").select("id, round_number, status").eq("season_id", season.id).order("round_number", { ascending: true }),
    supabase.from("matches").select("id, round_id, athlete_one_id, athlete_two_id, status, result_type, scheduled_at").eq("season_id", season.id).or(`athlete_one_id.eq.${athlete.id},athlete_two_id.eq.${athlete.id}`).order("scheduled_at", { ascending: true, nullsFirst: false }),
    supabase.from("standings").select("athlete_id, position, points, sets_balance, games_balance").eq("season_id", season.id).eq("class_number", athleteClass).order("position", { ascending: true, nullsFirst: false }),
  ]);

  const rounds = (roundData ?? []) as { id: string; round_number: number; status: string }[];
  const matches = (matchData ?? []) as { id: string; round_id: string; athlete_one_id: string; athlete_two_id: string | null; status: string; result_type: string | null; scheduled_at: string | null }[];
  const standings = (standingData ?? []) as { athlete_id: string; position: number | null; points: number; sets_balance: number; games_balance: number }[];
  const matchIds = matches.map((match) => match.id);
  const athleteIds = Array.from(new Set(matches.flatMap((match) => [match.athlete_one_id, match.athlete_two_id]).concat(standings.map((standing) => standing.athlete_id)).filter((id): id is string => Boolean(id))));

  const [{ data: nameData }, { data: resultData }] = await Promise.all([
    athleteIds.length > 0 ? supabase.from("athletes").select("id, profiles(full_name)").in("id", athleteIds) : Promise.resolve({ data: [] }),
    matchIds.length > 0 ? supabase.from("results").select("match_id, winner_id, winner_games, loser_games, winner_points, loser_points").in("match_id", matchIds) : Promise.resolve({ data: [] }),
  ]);

  const names = new Map(((nameData ?? []) as NameRow[]).map((row) => [row.id, profileName(row.profiles)]));
  const results = new Map(((resultData ?? []) as ResultRow[]).map((row) => [row.match_id, row]));
  const roundNumbers = new Map(rounds.map((round) => [round.id, round.round_number]));

  const dashboardMatches = matches.map((match) => {
    const opponentId = match.athlete_one_id === athlete.id ? match.athlete_two_id : match.athlete_one_id;
    const result = results.get(match.id);
    const athleteWon = result?.winner_id === athlete.id;
    const hasScore = typeof result?.winner_games === "number" && typeof result?.loser_games === "number";
    const score = result && hasScore ? athleteWon ? `${result.winner_games} × ${result.loser_games}` : `${result.loser_games} × ${result.winner_games}` : undefined;
    const points = result ? athleteWon ? result.winner_points : result.loser_points : undefined;

    return {
      id: match.id,
      round: roundNumbers.get(match.round_id) ?? 0,
      opponent: opponentId ? names.get(opponentId) ?? "Atleta" : "Sem adversário",
      scheduledAt: match.scheduled_at ?? undefined,
      result: score,
      points,
      status: dashboardStatus(match.status, match.result_type),
    };
  });

  const dashboardStandings = standings.map((standing) => ({
    position: standing.position ?? 0,
    athlete: names.get(standing.athlete_id) ?? "Atleta",
    points: standing.points,
    setBalance: standing.sets_balance,
    gameBalance: standing.games_balance,
    currentUser: standing.athlete_id === athlete.id,
  }));

  const currentRound = rounds.find((round) => round.status === "open")?.round_number ?? rounds.find((round) => round.status === "drawn")?.round_number ?? 0;

  return <><Navigation /><AthleteDashboard athleteName={athleteName} athleteClass={athleteClass} athleteStatus={athleteStatus} seasonName={season.name} currentRound={currentRound} totalRounds={season.rounds_count} matches={dashboardMatches} standings={dashboardStandings} /></>;
}
