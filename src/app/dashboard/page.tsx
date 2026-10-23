import { redirect } from "next/navigation";
import AthleteDashboard from "@/components/AthleteDashboard";
import Navigation from "@/components/Navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Dashboard",
  description: "Acompanhe seus confrontos, resultados e classificação.",
};

type Profile = { full_name: string | null };
type AthleteRecord = { id: string; user_id: string; current_class: number | null; status: string };
type Season = { id: string; name: string; year: number; status: string; rounds_count: number };
type Round = { id: string; season_id: string; round_number: number; status: string };
type Match = {
  id: string; season_id: string; round_id: string; athlete_one_id: string; athlete_two_id: string | null; class_number: number; status: string; result_type: string | null;
  athlete_one_sets: number | null; athlete_two_sets: number | null; athlete_one_games: number | null; athlete_two_games: number | null;
  athlete_one_points: number | null; athlete_two_points: number | null; winner_athlete_id: string | null; draw_order: number | null;
};
type Standing = { athlete_id: string; position: number | null; points: number; sets_balance: number; games_balance: number };
type OpponentProfile = { id: string; full_name: string | null };
type OpponentAthlete = { id: string; user_id: string };

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard");

  const [{ data: profile }, { data: athlete }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
    supabase.from("athletes").select("id,user_id,current_class,status").eq("user_id", user.id).maybeSingle(),
  ]) as [{ data: Profile | null }, { data: AthleteRecord | null }];

  const athleteName = profile?.full_name || user.email?.split("@")[0] || "Atleta Smash";
  const athleteClass = athlete?.current_class ?? 6;
  const athleteStatus = athlete?.status === "licensed" ? "licensed" : "active";

  const { data: seasons } = await supabase.from("seasons").select("id,name,year,status,rounds_count").in("status", ["active", "registration", "planned", "open", "closed"]).order("year", { ascending: false }).order("created_at", { ascending: false });
  const season = (seasons?.find((item: Season) => item.status === "open") ?? seasons?.[0]) as Season | undefined;
  if (!season || !athlete) return <><Navigation /><AthleteDashboard athleteName={athleteName} athleteClass={athleteClass} athleteStatus={athleteStatus} seasonName="Nenhuma temporada ativa" currentRound={0} totalRounds={0} matches={[]} standings={[]} /></>;

  const [{ data: rounds }, { data: matches }, { data: standings }] = await Promise.all([
    supabase.from("rounds").select("id,season_id,round_number,status").eq("season_id", season.id).order("round_number", { ascending: true }),
    supabase.from("matches").select("id,season_id,round_id,athlete_one_id,athlete_two_id,class_number,status,result_type,athlete_one_sets,athlete_two_sets,athlete_one_games,athlete_two_games,athlete_one_points,athlete_two_points,winner_athlete_id,draw_order").eq("season_id", season.id).or(`athlete_one_id.eq.${athlete.id},athlete_two_id.eq.${athlete.id}`).order("draw_order", { ascending: true }),
    supabase.from("standings").select("athlete_id,position,points,sets_balance,games_balance").eq("season_id", season.id).eq("class_number", athleteClass).order("position", { ascending: true, nullsFirst: false }),
  ]);

  const currentRound = ((rounds ?? []) as Round[]).find((round) => round.status === "open") ?? (rounds ?? []).at(-1) as Round | undefined;
  const currentMatches = ((matches ?? []) as Match[]).filter((match) => !currentRound || match.round_id === currentRound.id);
  const athleteIds = [...new Set((matches ?? []).flatMap((match: Match) => [match.athlete_one_id, match.athlete_two_id].filter(Boolean)))];
  const { data: athletes } = athleteIds.length ? await supabase.from("athletes").select("id,user_id").in("id", athleteIds) as { data: OpponentAthlete[] | null } : { data: [] as OpponentAthlete[] };
  const userIds = (athletes ?? []).map((item) => item.user_id);
  const { data: profiles } = userIds.length ? await supabase.from("profiles").select("id,full_name").in("id", userIds) as { data: OpponentProfile[] | null } : { data: [] as OpponentProfile[] };
  const names = new Map((athletes ?? []).map((item) => [item.id, (profiles ?? []).find((profileRow) => profileRow.id === item.user_id)?.full_name ?? "Atleta"]));
  const dashboardMatches = currentMatches.map((match: Match) => ({ ...match, athlete_one_name: names.get(match.athlete_one_id) ?? "Atleta", athlete_two_name: match.athlete_two_id ? names.get(match.athlete_two_id) ?? "Atleta" : null }));

  return <><Navigation /><AthleteDashboard athleteName={athleteName} athleteClass={athleteClass} athleteStatus={athleteStatus} seasonName={`${season.name} ${season.year}`} currentRound={currentRound?.round_number ?? 0} totalRounds={season.rounds_count ?? rounds?.length ?? 0} matches={dashboardMatches} standings={standings ?? []} /></>;
}
