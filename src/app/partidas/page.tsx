"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Navigation from "@/components/Navigation";
import { createClient } from "@/lib/supabase/client";

type Season={id:string;name:string;year:number;status:string;season_type:string|null;created_at?:string};
type Round={id:string;season_id:string;round_number:number;name:string;status:string};
type Match={id:string;season_id:string;round_id:string;class_number:number;athlete_one_id:string;athlete_two_id:string|null;status:string;result_type:string|null;athlete_one_sets:number|null;athlete_two_sets:number|null;athlete_one_games:number|null;athlete_two_games:number|null;athlete_one_points:number|null;athlete_two_points:number|null;winner_athlete_id:string|null;draw_order:number|null};
type Athlete={id:string;user_id:string};
type Profile={id:string;full_name:string|null};
type Group={label:string;matches:Match[]};
type RoundGroup={round:Round;groups:Group[]};
type SeasonGroup={season:Season;rounds:RoundGroup[]};

const classLabels=["1ª Classe","2ª Classe","3ª Classe","4ª Classe","5ª Classe","6ª Classe","Feminino"];
const pendingStatuses=["scheduled","pending","awaiting_result","contested"];

function statusLabel(match:Match){
 if(pendingStatuses.includes(match.status)) return "Aguardando resultado";
 if(match.result_type==="double_walkover") return "WO duplo";
 if(match.result_type==="walkover") return "Finalizada por WO";
 return "Resultado registrado";
}
function resultText(match:Match){
 if(pendingStatuses.includes(match.status)) return "O resultado ainda não foi lançado.";
 if(match.result_type==="double_walkover") return "Nenhum atleta venceu esta partida.";
 if(match.result_type==="walkover") return "Partida finalizada por WO.";
 return `${match.athlete_one_sets??0} x ${match.athlete_two_sets??0} sets · ${match.athlete_one_games??0} x ${match.athlete_two_games??0} games · ${match.athlete_one_points??0} x ${match.athlete_two_points??0} pontos`;
}
function MatchCard({match,names}:{match:Match;names:Record<string,string>}){
 const first=names[match.athlete_one_id]??"Atleta";
 const second=match.athlete_two_id?(names[match.athlete_two_id]??"Atleta"):"BYE";
 const pending=pendingStatuses.includes(match.status);
 const winner=match.winner_athlete_id;
 return <article className={`rounded-xl border p-4 transition ${pending?"border-amber-500/30 bg-amber-500/5":"border-slate-800 bg-slate-950/50"}`}>
  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500"><span>Confronto {match.draw_order??"-"}</span><span className={`rounded-full border px-2.5 py-1 ${pending?"border-amber-500/40 text-amber-300":"border-emerald-500/30 text-emerald-300"}`}>{statusLabel(match)}</span></div>
  <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3"><div className={`min-w-0 truncate text-sm font-semibold ${winner===match.athlete_one_id?"text-emerald-300":"text-white"}`}>{first}</div><span className="text-xs font-bold text-slate-600">VS</span><div className={`min-w-0 truncate text-right text-sm font-semibold ${winner===match.athlete_two_id?"text-emerald-300":"text-white"}`}>{second}</div></div>
  <p className="mt-3 text-xs text-slate-400">{resultText(match)}</p>
 </article>;
}

export default function PartidasPage(){
 const supabase=createClient();
 const[seasons,setSeasons]=useState<Season[]>([]),[rounds,setRounds]=useState<Round[]>([]),[matches,setMatches]=useState<Match[]>([]),[names,setNames]=useState<Record<string,string>>({}),[seasonFilter,setSeasonFilter]=useState("all"),[loading,setLoading]=useState(true),[error,setError]=useState("");
 useEffect(()=>{let mounted=true;async function load(){setLoading(true);setError("");const[seasonQuery,roundQuery,matchQuery]=await Promise.all([supabase.from("seasons").select("id,name,year,status,season_type,created_at").order("created_at",{ascending:true}),supabase.from("rounds").select("id,season_id,round_number,name,status").order("round_number",{ascending:true}),supabase.from("matches").select("id,season_id,round_id,class_number,athlete_one_id,athlete_two_id,status,result_type,athlete_one_sets,athlete_two_sets,athlete_one_games,athlete_two_games,athlete_one_points,athlete_two_points,winner_athlete_id,draw_order").order("draw_order",{ascending:true})]);if(!mounted)return;if(seasonQuery.error||roundQuery.error||matchQuery.error){setError("Não foi possível carregar as partidas.");setLoading(false);return}const loadedMatches=(matchQuery.data??[])as Match[];const ids=[...new Set(loadedMatches.flatMap(m=>[m.athlete_one_id,m.athlete_two_id].filter(Boolean)))];let map:Record<string,string>={};if(ids.length){const athletes=await supabase.from("athletes").select("id,user_id").in("id",ids);const userIds=(athletes.data??[]).map((a:Athlete)=>a.user_id);const profiles=userIds.length?await supabase.from("profiles").select("id,full_name").in("id",userIds):{data:[]};const profileMap=Object.fromEntries(((profiles.data??[])as Profile[]).map(p=>[p.id,p.full_name??"Atleta"]));for(const athlete of (athletes.data??[])as Athlete[])map[athlete.id]=profileMap[athlete.user_id]??"Atleta"}setSeasons((seasonQuery.data??[])as Season[]);setRounds((roundQuery.data??[])as Round[]);setMatches(loadedMatches);setNames(map);setLoading(false)}void load();return()=>{mounted=false}},[supabase]);
 const visibleSeasons=useMemo(()=>seasonFilter==="all"?seasons:seasons.filter(s=>s.id===seasonFilter),[seasonFilter,seasons]);
 const grouped=useMemo<SeasonGroup[]>(()=>visibleSeasons.map(season=>{const seasonRounds=rounds.filter(r=>r.season_id===season.id).map(round=>{const roundMatches=matches.filter(m=>m.round_id===round.id);const groups=classLabels.map((label,index)=>({label,matches:roundMatches.filter(m=>m.class_number===index+1)})).filter(g=>g.matches.length);return{round,groups}}).filter(g=>g.groups.length>0);return{season,rounds:seasonRounds}}).filter(g=>g.rounds.length>0),[visibleSeasons,rounds,matches]);
 const totalMatches=grouped.reduce((sum,s)=>sum+s.rounds.reduce((rTotal,r)=>rTotal+r.groups.reduce((gTotal,g)=>gTotal+g.matches.length,0),0),0);
 const openMatches=matches.filter(m=>pendingStatuses.includes(m.status)).length;
 return <><Navigation/><main className="page-container py-10"><div className="mx-auto max-w-7xl"><div className="flex flex-wrap items-end justify-between gap-4"><div><Link href="/dashboard" className="text-sm text-emerald-400">← Voltar ao dashboard</Link><h1 className="mt-4 text-3xl font-bold text-white">Partidas</h1><p className="mt-2 text-slate-400">Consulte os confrontos por temporada, rodada e classe.</p></div><label className="text-sm text-slate-300">Temporada<select value={seasonFilter} onChange={e=>setSeasonFilter(e.target.value)} className="mt-2 block min-w-56 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"><option value="all">Todas as temporadas</option>{seasons.map(s=><option key={s.id} value={s.id}>{s.name} {s.year}</option>)}</select></label></div><div className="mt-6 grid gap-3 sm:grid-cols-3"><div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4"><strong className="text-xl text-white">{totalMatches}</strong><span className="ml-2 text-sm text-slate-400">partidas exibidas</span></div><div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4"><strong className="text-xl text-white">{grouped.length}</strong><span className="ml-2 text-sm text-slate-400">temporada(s)</span></div><div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4"><strong className="text-xl text-white">{openMatches}</strong><span className="ml-2 text-sm text-slate-400">aguardando resultado</span></div></div>{loading?<section className="mt-8 rounded-2xl bg-slate-900/70 p-8 text-center text-slate-400">Carregando partidas...</section>:error?<section className="mt-8 rounded-2xl bg-red-500/10 p-8 text-center text-red-300">{error}</section>:!grouped.length?<section className="mt-8 rounded-2xl bg-slate-900/70 p-8 text-center text-slate-400">Nenhuma partida encontrada para o filtro selecionado.</section>:<div className="mt-8 space-y-5">{grouped.map(({season,rounds:seasonRounds})=><details key={season.id} open={seasonFilter!=="all"} className="group rounded-2xl border border-slate-800 bg-slate-900/70 shadow-xl"><summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 p-5"><div><p className="text-xs uppercase tracking-widest text-emerald-400">{season.season_type==="finals"?"Finais":"Temporada regular"}</p><h2 className="mt-1 text-2xl font-bold text-white">{season.name} {season.year}</h2></div><div className="flex items-center gap-3"><span className={`rounded-full px-3 py-1 text-xs ${season.status==="finished"?"bg-emerald-500/15 text-emerald-300":"bg-amber-500/15 text-amber-300"}`}>{season.status==="finished"?"Encerrada":"Em andamento"}</span><span className="text-slate-500 transition group-open:rotate-180">⌄</span></div></summary><div className="space-y-4 border-t border-slate-800 p-4 sm:p-5">{seasonRounds.map(({round,groups})=><details key={round.id} open={seasonFilter!=="all"} className="rounded-xl border border-slate-800 bg-slate-950/40"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4"><div><h3 className="text-lg font-semibold text-white">{round.name||`Rodada ${round.round_number}`}</h3><p className="mt-1 text-sm text-slate-400">{groups.reduce((sum,g)=>sum+g.matches.length,0)} confronto(s) · {round.status==="closed"?"Encerrada":"Em andamento"}</p></div><span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-400">Rodada {round.round_number}</span></summary><div className="space-y-5 border-t border-slate-800 p-4">{groups.map(group=><section key={group.label}><div className="mb-3 flex items-center justify-between"><h4 className="font-semibold text-emerald-300">{group.label}</h4><span className="text-xs text-slate-500">{group.matches.length} confronto(s)</span></div><div className="grid gap-3 lg:grid-cols-2">{group.matches.map(match=><MatchCard key={match.id} match={match} names={names}/>)}</div></section>)}</div></details>)}</div></details>)}</div>}</div></main></>;
}
