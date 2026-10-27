import { redirect } from "next/navigation";
import AthleteDashboard from "@/components/AthleteDashboard";
import Navigation from "@/components/Navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Dashboard", description: "Acompanhe seus confrontos, resultados e classificação." };
type Profile={full_name:string|null};
type Athlete={id:string;user_id:string;current_class:number|null;status:string};
type Season={id:string;name:string;year:number;status:string;rounds_count:number};
type Round={id:string;season_id:string;round_number:number;status:string;closes_at:string|null};
type Match={id:string;round_id:string;athlete_one_id:string;athlete_two_id:string|null;draw_order:number|null};
type OpponentAthlete={id:string;user_id:string};
type OpponentProfile={id:string;full_name:string|null};

function getClassNumber(value: unknown) {
 if (typeof value === "number") {
  return Number.isInteger(value) && value >= 1 && value <= 7 ? value : null;
 }
 if (typeof value !== "string") return null;
 const normalized = value.trim().toLocaleLowerCase("pt-BR");
 if (normalized === "feminino") return 7;
 const match = normalized.match(/^([1-7])(?:ª|a)?(?:\s+classe)?$/);
 return match ? Number(match[1]) : null;
}

export default async function DashboardPage(){
 const supabase=await createClient();const{data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login?next=/dashboard");
 const profileQuery=await supabase.from("profiles").select("full_name").eq("id",user.id).maybeSingle();const athleteQuery=await supabase.from("athletes").select("id,user_id,current_class,status").eq("user_id",user.id).maybeSingle();const profile=profileQuery.data as Profile|null;const athlete=athleteQuery.data as Athlete|null;const athleteName=profile?.full_name||user.email?.split("@")[0]||"Atleta Smash";const athleteClass=getClassNumber(athlete?.current_class)??getClassNumber(user.user_metadata?.class_number)??6;const athleteStatus=athlete?.status??"active";
 const{data:seasonData}=await supabase.from("seasons").select("id,name,year,status,rounds_count").in("status",["active","registration","planned","open","closed"]).order("year",{ascending:false}).order("created_at",{ascending:false});const seasons=(seasonData??[]) as Season[];const season=seasons.find(s=>s.status==="open")??seasons[0];
 if(!season||!athlete)return <><Navigation/><AthleteDashboard athleteName={athleteName} athleteClass={athleteClass} athleteStatus={athleteStatus} matches={[]} /></>;
 const roundsQuery=supabase.from("rounds").select("id,season_id,round_number,status,closes_at").eq("season_id",season.id).order("round_number",{ascending:true});const matchesQuery=supabase.from("matches").select("id,round_id,athlete_one_id,athlete_two_id,draw_order").eq("season_id",season.id).or(`athlete_one_id.eq.${athlete.id},athlete_two_id.eq.${athlete.id}`).order("draw_order",{ascending:true});const[{data:roundData},{data:matchData}]=await Promise.all([roundsQuery,matchesQuery]);
 const rounds=(roundData??[]) as Round[];const matches=(matchData??[]) as Match[];const currentRound=rounds.find(r=>r.status==="open")??rounds[rounds.length-1];const currentMatches=currentRound?matches.filter(m=>m.round_id===currentRound.id):[];const athleteIds=[...new Set(currentMatches.flatMap(m=>[m.athlete_one_id,m.athlete_two_id].filter(Boolean)))];const{data:opponentData}=athleteIds.length?await supabase.from("athletes").select("id,user_id").in("id",athleteIds):{data:[]};const opponents=(opponentData??[]) as OpponentAthlete[];const userIds=opponents.map(a=>a.user_id);const{data:profileData}=userIds.length?await supabase.from("profiles").select("id,full_name").in("id",userIds):{data:[]};const opponentProfiles=(profileData??[]) as OpponentProfile[];const names=new Map(opponents.map(a=>[a.id,opponentProfiles.find(p=>p.id===a.user_id)?.full_name??"Atleta"]));const dashboardMatches=currentMatches.map(m=>({...m,athlete_one_name:names.get(m.athlete_one_id)??"Você",athlete_two_name:m.athlete_two_id?(names.get(m.athlete_two_id)??"Atleta"):null}));
 return <><Navigation/><AthleteDashboard athleteId={athlete.id} athleteName={athleteName} athleteClass={athleteClass} athleteStatus={athleteStatus} seasonName={`${season.name} ${season.year}`} currentRound={currentRound?.round_number??0} totalRounds={season.rounds_count??rounds.length} roundDeadline={currentRound?.closes_at??null} matches={dashboardMatches} /></>;
}
