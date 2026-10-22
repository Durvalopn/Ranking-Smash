import { redirect } from "next/navigation";

import AthleteDashboard from "@/components/AthleteDashboard";
import Navigation from "@/components/Navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Dashboard",
  description: "Acompanhe seus confrontos, resultados e classificação.",
};

type DashboardMatchStatus =
  | "scheduled"
  | "awaiting_result"
  | "result_submitted"
  | "confirmed"
  | "contested"
  | "completed"
  | "walkover";

type AthleteNameRow = {
  id: string;
  profiles: { full_name: string } | { full_name: string }[] | null;
};

type ResultRow = {
  match_id: string;
  winner_id: string | null;
  winner_games: number | null;
  loser_games: number | null;
  winner_points: number;
  loser_points: number;
  status: string;
};

function getProfileName(profile: AthleteNameRow["profiles"]): string {
  if (Array.isArray(profile)) {
    return profile[0]?.full_name ?? "Atleta";
  }

  return profile?.full_name ?? "Atleta";
}

function getMatchStatus(
  status: string,
  resultType: string | null,
): DashboardMatchStatus {
  if (resultType === "walkover") {
    return "walkover";
  }

  switch (status) {
    case "awaiting_result":
    case "result_submitted":
    case "confirmed":
    case "contested":
    case "completed":
    case "walkover":
      return status;
    default:
      return "scheduled";
  }
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/dashboard");
  }

  const [{ data: profile }, { data: athlete }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("athletes")
      .select("id, current_class, status")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const athleteName =
    profile?.full_name ?? user.email?.split("@")[0] ?? "Atleta Smash";
  const athleteClass = athlete?.current_class ?? 6;
  const athleteStatus = athlete?.status === "licensed" ? "licensed" : "active";

  if (!athlete) {
    return (
      <>
        <Navigation />
        <AthleteDashboard
          athleteName={athleteName}
          athleteClass={athleteClass}
          athleteStatus={athleteStatus}
          matches={[]}
          standings={[]}
        />
      </>
    );
  }

  const { data: season } = await supabase
    .from("seasons")
    .select("id, name, rounds_count")
    .in("status", ["active", "registration"])
    .order("year", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!season) {
    return (
      <>
        <Navigation />
        <AthleteDashboard
          athleteName={athleteName}
          athleteClass={athleteClass}
          athleteStatus={athleteStatus}
          seasonName="Nenhuma temporada ativa"
          currentRound={0}
          totalRounds={0}
          matches={[]}
          standings={[]}
        />
      </>
    );
  }

  const [
    { data: rounds },
    { data: matchRows },
    { data: standingsRows },
  ] = await Promise.all([
    supabase
      .from("rounds")
      .select("id, round_number, status")
      .eq("season_id", season.id)
      .order("round_number", { ascending: true }),
    supabase
      .from("matches")
      .select(
        "id, round_id, class_number, athlete_one_id, athlete_two_id, status, result_type, scheduled_at",
      )
      .eq("season_id", season.id)
      .or(`athlete_one_id.eq.${athlete.id},athlete_two_id.eq.${athlete.id}`)
      .order("scheduled_at", { ascending: true, nullsFirst: false }),
    supabase
      .from("standings")
      .select(
        "athlete_id, class_number, position, points, sets_balance, games_balance",
      )
      .eq("season_id", season.id)
      .eq("class_number", athleteClass)
      .order("position", { ascending: true, nullsFirst: false }),
  ]);

  const safeMatchRows = matchRows ?? [];
  const matchIds = safeMatchRows.map((match) => match.id);
  const standingAthleteIds = (standingsRows ?? []).map(
    (standing) => standing.athlete_id,
  );
  const athleteIds = Array.from(
    new Set(
      safeMatchRows
        .flatMap((match) => [match.athlete_one_id, match.athlete_two_id])
        .concat(standingAthleteIds)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  const [{ data: nameRows }, { data: resultRows }] = await Promise.all([
    athleteIds.length > 0
      ? supabase
          .from("athletes")
          .select("id, profiles(full_name)")
          .in("id", athleteIds)
      : Promise.resolve({ data: [] as AthleteNameRow[] }),
    matchIds.length > 0
      ? supabase
          .from("results")
          .select(
            "match_id, winner_id, winner_games, loser_games, winner_points, loser_points, status",
          )
          .in("match_id", matchIds)
      : Promise.resolve({ data: [] as ResultRow[] }),
  ]);

  const names = new Map(
    ((nameRows ?? []) as AthleteNameRow[]).map((row) => [
      row.id,
      getProfileName(row.profiles),
    ]),
  );

  const results = new Map(
    ((resultRows ?? []) as ResultRow[]).map((result) => [
      result.match_id,
      result,
    ]),
  );

  const roundNumbers = new Map(
    (rounds ?? []).map((round) => [round.id, round.round_number]),
  );

  const dashboardMatches = safeMatchRows.map((match) => {
    const opponentId =
      match.athlete_one_id === athlete.id
        ? match.athlete_two_id
        : match.athlete_one_id;
    const result = results.get(match.id);
    const athleteWon = result?.winner_id === athlete.id;
    const winnerGames = result?.winner_games;
    const loserGames = result?.loser_games;
    const hasScore =
      typeof winnerGames === "number" && typeof loserGames === "number";

    let score: string | undefined;
    let points: number | undefined;

    if (result && hasScore) {
      score = athleteWon
        ? `${winnerGames} × ${loserGames}`
        : `${loserGames} × ${winnerGames}`;
      points = athleteWon ? result.winner_points : result.loser_points;
    }

    return {
      id: match.id,
      round: roundNumbers.get(match.round_id) ?? 0,
      opponent: opponentId ? names.get(opponentId) ?? "Atleta" : "Sem adversário",
      scheduledAt: match.scheduled_at ?? undefined,
      result: score,
      points,
      status: getMatchStatus(match.status, match.result_type),
    };
  });

  const dashboardStandings = (standingsRows ?? []).map((standing) => ({
    position: standing.position ?? 0,
    athlete: names.get(standing.athlete_id) ?? "Atleta",
    points: standing.points,
    setBalance: standing.sets_balance,
    gameBalance: standing.games_balance,
    currentUser: standing.athlete_id === athlete.id,
  }));

  const currentRound =
    (rounds ?? []).find((round) => round.status === "open")?.round_number ??
    (rounds ?? []).find((round) => round.status === "drawn")?.round_number ??
    0;

  return (
    <>
      <Navigation />
      <AthleteDashboard
        athleteName={athleteName}
        athleteClass={athleteClass}
        athleteStatus={athleteStatus}
        seasonName={season.name}
        currentRound={currentRound}
        totalRounds={season.rounds_count}
        matches={dashboardMatches}
        standings={dashboardStandings}
      />
    </>
  );
}
