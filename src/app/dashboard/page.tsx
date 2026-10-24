import { redirect } from "next/navigation";
import AthleteDashboard from "@/components/AthleteDashboard";
import Navigation from "@/components/Navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Dashboard", description: "Acompanhe seus confrontos, resultados e classificação." };
type Profile={full_name:string|null};
type Athlete={id:string;user_id:string;current_class:number|null;status:string};
type Season={id:string;name:string;year:number;status:string;rounds_count:number;season_type:string|null};
type Round={id:string;season_id:string;round_number:number;status:string;closes_at:string|null};
type Match={id:string;season_id:string;round_id:string;athlete_one_id:string;athlete_two_id:string|null;class_number:number;status:string;result_type:string|null;athlete_one_sets:number|null;athlete_two_sets:number|null;athlete_one_games:number|null;athlete_two_games:number|null;athlete_one_points:number|null;athlete_two_points:number|null;winner_athlete_id:string|null;draw_order:number|null};
type Standing={athlete_id:string;position:number|null;points:number;sets_balance:number;games_balance:number};
type OpponentAthlete={id:string;user_id:string};
type OpponentProfile={id:string;full_name:string|null};

export default async function DashboardPage(){
 const supabase=await createClient();
 const{data:{user}}=await supabase.auth.getUser();
 if(!user)redirect("/login?next=/dashboard");
 const profileQuery=await supabase.from("profiles").select("full_name").eq("id",user.id).maybeSingle();
 const athleteQuery=await supabase.from("athletes").select("id,user_id,current_class,status").eq("user_id",user.id).maybeSingle();
 const profile=profileQuery.data as Profile|null;
 const athlete=athleteQuery.data as Athlete|null;
 const athleteName=profile?.full_name||user.email?.split("@")[0]||"Atleta Smash";
 const athleteClass=athlete?.current_class??6;
 const athleteStatus=athlete?.status==="licensed"?"licensed":"active";
 const{data:seasonData}=await supabase.from("seasons").select("id,name,year,status,rounds_count,season_type").neq("season_type","finals").in("status",["active","registration","planned","open","closed"]).order("year",{ascending:false}).order("created_at",{ascending:false});
 const seasons=(seasonData??[]) as Season[];
 const season=seasons.find(s=>s.status==="open")??seasons[0];
 if(!season||!athlete){return <><Navigation/><AthleteDashboard athleteName={athleteName} athleteClass={athleteClass} athleteStatus={athleteStatus} matches={[]} standings={[]} /></>}
 const roundsQuery=supabase.from("rounds").select("id,season_id,round_number,status,closes_at").eq("season_id",season.id).order("round_number",{ascending:true});
 const matchesQuery=supabase.from("matches").select("id,season_id,round_id,athlete_one_id,athlete_two_id,class_number,status,result_type,athlete_one_sets,athlete_two_sets,athlete_one_games,athlete_two_games,athlete_one_points,athlete_two_points,winner_athlete_id,draw_order").eq("season_id",season.id).or(`athlete_one_id.eq.${athlete.id},athlete_two_id.eq.${athlete.id}`).order("draw_order",{ascending:true});
 const standingsQuery=supabase.from("standings").select("athlete_id,position,points,sets_balance,games_balance").eq("season_id",season.id).eq("class_number",athleteClass).order("position",{ascending:true});
 const[{data:roundData},{data:matchData},{data:standingData}]=await Promise.all([roundsQuery,matchesQuery,standingsQuery]);
 const rounds=(roundData??[]) as Round[];const matches=(matchData??[]) as Match[];const standings=(standingData??[]) as Standing[];
 const currentRound=rounds.find(r=>r.status==="open")??rounds[rounds.length-1];
 const currentMatches=currentRound?matches.filter(m=>m.round_id===currentRound.id):[];
 const athleteIds=[...new Set(currentMatches.flatMap(m=>[m.athlete_one_id,m.athlete_two_id].filter(Boolean)))];
 const{data:opponentData}=athleteIds.length?await supabase.from("athletes").select("id,user_id").in("id",athleteIds):{data:[]};
 const opponents=(opponentData??[]) as OpponentAthlete[];
 const userIds=opponents.map(a=>a.user_id);
 const{data:profileData}=userIds.length?await supabase.from("profiles").select("id,full_name").in("id",userIds):{data:[]};
 const opponentProfiles=(profileData??[]) as OpponentProfile[];
 const names=new Map(opponents.map(a=>[a.id,opponentProfiles.find(p=>p.id===a.user_id)?.full_name??"Atleta"]));
 const dashboardMatches=currentMatches.map(m=>({...m,athlete_one_name:names.get(m.athlete_one_id)??"Você",athlete_two_name:m.athlete_two_id?(names.get(m.athlete_two_id)??"Atleta"):null}));
 return <><Navigation/><AthleteDashboard athleteId={athlete.id} athleteName={athleteName} athleteClass={athleteClass} athleteStatus={athleteStatus} seasonName={`${season.name} ${season.year}`} seasonType="regular" currentRound={currentRound?.round_number??0} totalRounds={season.rounds_count??rounds.length} roundDeadline={currentRound?.closes_at??null} matches={dashboardMatches} standings={standings} /></>;
}
