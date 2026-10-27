"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Navigation from "@/components/Navigation";
import { createClient } from "@/lib/supabase/client";

type Season={id:string;name:string;year:number;status:string;season_type:string|null};
type Athlete={id:string;user_id:string;status:string};
type Profile={id:string;full_name:string|null};
type Assignment={season_id:string;athlete_id:string;class_number:number};
type Match={id:string;season_id:string;round_id:string;class_number:number;status:string;result_type:string|null;athlete_one_id:string;athlete_two_id:string|null;athlete_one_points:number|null;athlete_two_points:number|null;winner_athlete_id:string|null};
type MatchEvent={season_id:string;round_id:string;athlete_id:string;event_type:string;points:number};
type Row={key:string;athleteId:string;classNumber:number;name:string;points:number;wins:number;losses:number;matches:number;championSeasons:string[]};

const finished=["result_submitted","completed","confirmed","walkover"];
const labels=["1ª Classe","2ª Classe","3ª Classe","4ª Classe","5ª Classe","6ª Classe","Feminino"];
const sortRows=(rows:Row[])=>[...rows].sort((a,b)=>b.points-a.points||b.wins-a.wins||a.losses-b.losses||a.name.localeCompare(b.name));
function addMatch(row:Row,m:Match,id:string){const first=m.athlete_one_id===id;row.matches++;row.points+=first?(m.athlete_one_points??0):(m.athlete_two_points??0);if(m.result_type!=="double_walkover"&&m.winner_athlete_id){if(m.winner_athlete_id===id)row.wins++;else row.losses++}}
async function loadAllMatches(db:any){
 const rows:Match[]=[];
 const pageSize=1000;
 for(let from=0;;from+=pageSize){
  const{data,error}=await db.from("matches").select("id,season_id,round_id,class_number,status,result_type,athlete_one_id,athlete_two_id,athlete_one_points,athlete_two_points,winner_athlete_id").order("id",{ascending:true}).range(from,from+pageSize-1);
  if(error)return{data:null,error};
  const page=(data??[])as Match[];
  rows.push(...page);
  if(page.length<pageSize)break;
 }
 return{data:rows,error:null};
}
function buildRows(seasonId:string,assignments:Assignment[],matches:Match[],events:MatchEvent[],names:Record<string,string>,statuses:Record<string,string>){
 const map=new Map<string,Row>();
 for(const a of assignments.filter(x=>x.season_id===seasonId&&statuses[x.athlete_id]!=="pendente")){
  const key=`${a.athlete_id}:${a.class_number}`;
  map.set(key,{key,athleteId:a.athlete_id,classNumber:a.class_number,name:names[a.athlete_id]??"Atleta",points:0,wins:0,losses:0,matches:0,championSeasons:[]});
 }
 for(const m of matches.filter(x=>x.season_id===seasonId&&finished.includes(x.status))){
  const a=map.get(`${m.athlete_one_id}:${m.class_number}`);
  if(a)addMatch(a,m,m.athlete_one_id);
  if(m.athlete_two_id){const b=map.get(`${m.athlete_two_id}:${m.class_number}`);if(b)addMatch(b,m,m.athlete_two_id)}
 }
 for(const event of events.filter(x=>x.season_id===seasonId)){
  const assignment=assignments.find(x=>x.season_id===seasonId&&x.athlete_id===event.athlete_id);
  const row=assignment?map.get(`${event.athlete_id}:${assignment.class_number}`):undefined;
  if(row)row.points+=event.points;
 }
 return[...map.values()];
}

export default function ClassificacaoPage(){
 const db=createClient() as any;
 const[tab,setTab]=useState<"season"|"annual"|"finals">("season");
 const[seasons,setSeasons]=useState<Season[]>([]),[athletes,setAthletes]=useState<Athlete[]>([]),[profiles,setProfiles]=useState<Record<string,Profile>>({}),[assignments,setAssignments]=useState<Assignment[]>([]),[matches,setMatches]=useState<Match[]>([]),[matchEvents,setMatchEvents]=useState<MatchEvent[]>([]),[selectedId,setSelectedId]=useState(""),[updatedAt,setUpdatedAt]=useState(""),[loading,setLoading]=useState(true),[error,setError]=useState("");
 async function load(){setError("");const[q1,q2,q3,q4,q5,q6]=await Promise.all([db.from("seasons").select("id,name,year,status,season_type").order("year",{ascending:false}).order("created_at",{ascending:false}),db.from("athletes").select("id,user_id,status"),db.from("profiles").select("id,full_name"),db.from("season_athlete_classes").select("season_id,athlete_id,class_number"),loadAllMatches(db),db.from("match_events").select("season_id,round_id,athlete_id,event_type,points").in("event_type",["bye","licensed"])]);const failure=[q1,q2,q3,q4,q5,q6].find(x=>x.error);if(failure?.error){setError("Não foi possível carregar a classificação.");setLoading(false);return}const loaded=(q1.data??[])as Season[];setSeasons(loaded);setAthletes((q2.data??[])as Athlete[]);setProfiles(Object.fromEntries(((q3.data??[])as Profile[]).map(p=>[p.id,p])));setAssignments((q4.data??[])as Assignment[]);setMatches((q5.data??[])as Match[]);setMatchEvents((q6.data??[])as MatchEvent[]);setSelectedId(c=>c&&loaded.some(s=>s.id===c)?c:loaded.find(s=>s.season_type!=="finals")?.id??"");setUpdatedAt(new Date().toLocaleTimeString("pt-BR"));setLoading(false)}
 useEffect(()=>{void load();const timer=setInterval(()=>void load(),15000);return()=>clearInterval(timer)},[]);
 const regularSeasons=useMemo(()=>seasons.filter(s=>s.season_type!=="finals"),[seasons]);
 const selected=regularSeasons.find(s=>s.id===selectedId);
 const names=useMemo(()=>Object.fromEntries(athletes.map(a=>[a.id,profiles[a.user_id]?.full_name??"Atleta"])),[athletes,profiles]);
 const statuses=useMemo(()=>Object.fromEntries(athletes.map(a=>[a.id,a.status])),[athletes]);
 const seasonRows=useMemo(()=>buildRows(selectedId,assignments,matches,matchEvents,names,statuses),[selectedId,assignments,matches,matchEvents,names,statuses]);
 const championKeys=useMemo(()=>{const out=new Set<string>();for(const s of regularSeasons.filter(x=>x.status==="finished")){const rows=buildRows(s.id,assignments,matches,matchEvents,names,statuses);for(let c=1;c<=6;c++){const winner=sortRows(rows.filter(r=>r.classNumber===c))[0];if(winner)out.add(winner.key)}}return out},[regularSeasons,assignments,matches,matchEvents,names,statuses]);
 const annualRows=useMemo(()=>{const map=new Map<string,Row>();for(const a of assignments.filter(x=>regularSeasons.some(s=>s.id===x.season_id)&&statuses[x.athlete_id]!=="pendente")){const key=`${a.athlete_id}:${a.class_number}`;if(!map.has(key))map.set(key,{key,athleteId:a.athlete_id,classNumber:a.class_number,name:names[a.athlete_id]??"Atleta",points:0,wins:0,losses:0,matches:0,championSeasons:[]})}for(const m of matches.filter(x=>regularSeasons.some(s=>s.id===x.season_id)&&finished.includes(x.status))){const a=map.get(`${m.athlete_one_id}:${m.class_number}`);if(a)addMatch(a,m,m.athlete_one_id);if(m.athlete_two_id){const b=map.get(`${m.athlete_two_id}:${m.class_number}`);if(b)addMatch(b,m,m.athlete_two_id)}}for(const event of matchEvents.filter(x=>regularSeasons.some(s=>s.id===x.season_id))){const assignment=assignments.find(x=>x.season_id===event.season_id&&x.athlete_id===event.athlete_id);const row=assignment?map.get(`${event.athlete_id}:${assignment.class_number}`):undefined;if(row)row.points+=event.points}for(const row of map.values())if(championKeys.has(row.key))row.championSeasons.push("Campeão de temporada");return[...map.values()]},[assignments,matches,matchEvents,regularSeasons,names,statuses,championKeys]);
 const finalsRows=useMemo(()=>{const result:Row[]=[];const used=new Set<string>();for(let c=1;c<=6;c++){const ranked=sortRows(annualRows.filter(r=>r.classNumber===c));const ordered=[...ranked.filter(r=>championKeys.has(r.key)),...ranked.filter(r=>!championKeys.has(r.key))];for(const row of ordered){if(result.filter(x=>x.classNumber===c).length>=8)break;if(used.has(row.athleteId))continue;used.add(row.athleteId);result.push(row)}}return result},[annualRows,championKeys]);
 const renderRows=(rows:Row[],movement=false,finals=false)=>sortRows(rows).map((r,i)=>{const qualified=finals;const champion=championKeys.has(r.key);const reason=champion?"champion":"annual";const zone=qualified?(champion?"bg-amber-500/15 text-amber-100":"bg-blue-500/10 text-blue-100"):champion&&tab==="annual"?"bg-amber-500/15 text-amber-100":movement&&r.classNumber>1&&r.classNumber<7&&i<Math.max(1,Math.ceil(rows.length*.2))?"bg-emerald-500/15 text-emerald-100":movement&&r.classNumber<6&&i>=rows.length-Math.max(1,Math.ceil(rows.length*.2))?"bg-red-500/15 text-red-100":"";return <tr key={r.key} className={`border-t border-slate-800 ${zone}`}><td className="px-3 py-2 font-semibold">{i+1}</td><td className="px-3 py-2 font-medium">{qualified&&(champion?<span className="mr-2 text-amber-300" title="Entrou como campeão de temporada">🏆</span>:<span className="mr-2 text-blue-300" title="Entrou pela pontuação anual">📊</span>)}{!qualified&&champion&&tab==="annual"&&<span className="mr-2 text-amber-300">🏆</span>}{r.name}{qualified&&<span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-semibold ${reason==="champion"?"bg-amber-500/20 text-amber-200":"bg-blue-500/20 text-blue-200"}`}>{reason==="champion"?"Campeão de temporada":"Pontuação anual"}</span>}{!qualified&&champion&&tab==="annual"&&<span className="ml-2 text-xs font-semibold text-amber-300">Campeão</span>}</td><td className="px-3 py-2">{r.points}</td><td className="px-3 py-2">{r.wins}-{r.losses}</td><td className="px-3 py-2">{r.matches}</td></tr>});
 const renderClass=(c:number,rows:Row[],movement=false,finals=false)=>{const list=sortRows(rows.filter(r=>r.classNumber===c));if(!list.length)return null;return <section key={c} className={`rounded-2xl border p-5 ${finals?"border-violet-500/30 bg-violet-950/20":"border-slate-800 bg-slate-900/70"}`}><div className="flex items-center justify-between"><h2 className="text-xl font-bold text-white">{labels[c-1]}</h2><span className="text-sm text-slate-400">{list.length} {finals?"elegível(eis)":"atleta(s)"}</span></div><div className="mt-4 overflow-hidden rounded-lg"><table className="w-full text-left text-sm"><thead className="text-slate-400"><tr><th className="px-3 py-2">Pos.</th><th className="px-3 py-2">Atleta</th><th className="px-3 py-2">Pontos anuais</th><th className="px-3 py-2">V-D</th><th className="px-3 py-2">Jogos</th></tr></thead><tbody>{renderRows(list,movement,finals)}</tbody></table></div></section>};
 const display=tab==="annual"?annualRows:tab==="finals"?finalsRows:seasonRows;
 return <><Navigation/><main className="page-container py-10"><div className="mx-auto max-w-6xl"><div className="flex flex-wrap items-end justify-between gap-4"><div><Link href="/dashboard" className="text-sm text-emerald-400">← Voltar ao dashboard</Link><h1 className="mt-4 text-3xl font-bold text-white">Classificação</h1><p className="mt-2 text-slate-400">Temporadas regulares, ranking anual e elegíveis ao Finals.</p>{updatedAt&&<p className="mt-1 text-xs text-slate-500">Atualizado às {updatedAt}.</p>}</div><div className="flex flex-wrap gap-2 rounded-lg border border-slate-700 bg-slate-900 p-1"><button onClick={()=>setTab("season")} className={`rounded-md px-4 py-2 text-sm font-semibold ${tab==="season"?"bg-emerald-500 text-slate-950":"text-slate-400"}`}>Temporada</button><button onClick={()=>setTab("annual")} className={`rounded-md px-4 py-2 text-sm font-semibold ${tab==="annual"?"bg-emerald-500 text-slate-950":"text-slate-400"}`}>Ranking anual</button><button onClick={()=>setTab("finals")} className={`rounded-md px-4 py-2 text-sm font-semibold ${tab==="finals"?"bg-violet-500 text-white":"text-slate-400"}`}>Classificados Finals</button></div></div>{tab==="season"&&<select value={selectedId} onChange={e=>setSelectedId(e.target.value)} className="mt-6 rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-white">{regularSeasons.map(s=><option key={s.id} value={s.id}>{s.name} {s.year}</option>)}</select>}{tab==="annual"&&<div className="mt-6 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-slate-300">🏆 Campeão por temporada e classe. A pontuação anual permanece separada por atleta e classe.</div>}{tab==="finals"&&<div className="mt-6 space-y-3 rounded-xl border border-violet-500/30 bg-violet-500/10 p-4 text-sm text-slate-200"><p><strong>Elegibilidade ao Finals:</strong> esta aba é apenas informativa. São considerados primeiro os campeões das temporadas e, depois, os maiores pontuadores anuais. Há até 8 atletas por classe, sem repetir o mesmo usuário entre classes.</p><div className="flex flex-wrap gap-3"><span className="rounded-full bg-amber-500/20 px-3 py-1 text-amber-200">🏆 Campeão de temporada</span><span className="rounded-full bg-blue-500/20 px-3 py-1 text-blue-200">📊 Pontuação anual</span></div></div>}{loading?<p className="mt-8 text-slate-400">Carregando classificação...</p>:error?<p className="mt-8 rounded-lg bg-red-500/10 p-4 text-red-300">{error}</p>:!selected?<p className="mt-8 text-slate-400">Nenhuma temporada regular disponível.</p>:<div className="mt-6 grid gap-6 md:grid-cols-2">{labels.map((_,i)=>renderClass(i+1,display,tab==="season",tab==="finals"))}</div>}</div></main></>;
}
