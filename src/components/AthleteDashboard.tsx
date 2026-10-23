"use client";

import Link from "next/link";
import { useState } from "react";

type Match={
 id:string;
 athlete_one_id:string;
 athlete_two_id:string|null;
 athlete_one_name?:string;
 athlete_two_name?:string|null;
 status:string;
 result_type:string|null;
 athlete_one_sets:number|null;
 athlete_two_sets:number|null;
 athlete_one_games:number|null;
 athlete_two_games:number|null;
 athlete_one_points:number|null;
 athlete_two_points:number|null;
 winner_athlete_id:string|null;
 class_number?:number;
 draw_order?:number|null;
};

type Standing={athlete_id:string;position:number|null;points:number;sets_balance:number;games_balance:number};
type Props={athleteName:string;athleteClass:number;athleteStatus:string;seasonName?:string;currentRound?:number;totalRounds?:number;roundDeadline?:string|null;matches:Match[];standings:Standing[]};
const pending=["scheduled","pending","awaiting_result","contested"];
const statusText=(status:string,result:string|null)=>pending.includes(status)?"Aguardando resultado":result==="double_walkover"?"WO duplo":result==="walkover"?"Finalizada por WO":"Resultado registrado";

export default function AthleteDashboard({athleteName,athleteClass,athleteStatus,seasonName="Nenhuma temporada ativa",currentRound=0,totalRounds=0,roundDeadline=null,matches,standings}:Props){
 const[status,setStatus]=useState(athleteStatus);const[saving,setSaving]=useState(false);const[message,setMessage]=useState("");const[error,setError]=useState("");
 const deadline=roundDeadline?new Intl.DateTimeFormat("pt-BR",{dateStyle:"short"}).format(new Date(roundDeadline)):null;
 async function changeStatus(next:"active"|"licensed"){if(next===status||saving)return;setSaving(true);setMessage("");setError("");try{const res=await fetch("/api/athlete/status",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({status:next})});if(!res.ok)throw new Error("Não foi possível atualizar o status.");setStatus(next);setMessage(next==="licensed"?"Você está licenciado.":"Você está ativo e poderá participar do próximo sorteio.")}catch(e){setError(e instanceof Error?e.message:"Não foi possível atualizar o status.")}finally{setSaving(false)}}
 const isBye=(m:Match)=>!m.athlete_two_id&&m.result_type==="double_walkover";
 const label=(m:Match)=>m.athlete_one_id===undefined?"Atleta":m.athlete_one_id;
 return <main className="page-container py-10"><div className="mx-auto max-w-6xl"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-400">Painel do atleta</p><h1 className="mt-3 text-4xl font-bold text-white">Olá, {athleteName}</h1><p className="mt-2 text-slate-400">Acompanhe seus jogos, resultados e classificação.</p></div><Link href="/perfil" className="rounded-lg border border-slate-700 px-5 py-3 font-semibold text-white">Meu perfil</Link></div><div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><div className="rounded-2xl bg-slate-900 p-5"><p className="text-sm text-slate-400">Temporada atual</p><p className="mt-3 font-semibold text-white">{seasonName}</p></div><div className="rounded-2xl bg-slate-900 p-5"><p className="text-sm text-slate-400">Classe</p><p className="mt-3 text-2xl font-bold text-emerald-400">{athleteClass}ª classe</p></div><div className="rounded-2xl bg-slate-900 p-5"><p className="text-sm text-slate-400">Rodada</p><p className="mt-3 text-2xl font-bold text-white">{currentRound} de {totalRounds}</p>{deadline&&<p className="mt-2 text-sm text-slate-400">Data limite: <strong className="text-amber-300">{deadline}</strong></p>}</div><div className="rounded-2xl bg-slate-900 p-5"><p className="text-sm text-slate-400">Status</p><select value={status==="licensed"?"licensed":"active"} onChange={e=>void changeStatus(e.target.value as "active"|"licensed")} disabled={saving} className="mt-3 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-semibold text-white"><option value="active">Ativo</option><option value="licensed">Licenciado</option></select><p className="mt-2 text-xs text-slate-500">{status==="licensed"?"Não participa do próximo sorteio.":"Participa do próximo sorteio."}</p></div></div>{message&&<div className="mt-4 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-300">{message}</div>}{error&&<div className="mt-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}<section className="mt-8 rounded-2xl border border-slate-800 bg-slate-950/40 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400">Rodada {currentRound}</p><h2 className="mt-1 text-2xl font-bold text-white">Seus confrontos</h2></div><span className="rounded-full bg-emerald-500/10 px-3 py-1 text-sm text-emerald-300">{matches.length} jogo(s)</span></div>{matches.length===0?<p className="mt-4 text-slate-400">Nenhum confronto disponível na rodada atual.</p>:<div className="mt-5 grid gap-4 md:grid-cols-2">{matches.map((m,index)=>{const mine=m.athlete_one_id;const opponent=m.athlete_two_id?m.athlete_one_id===mine?m.athlete_two_name??"Adversário":m.athlete_one_name??"Adversário":"BYE";const mySets=m.athlete_one_id===mine?m.athlete_one_sets:m.athlete_two_sets;const oppSets=m.athlete_one_id===mine?m.athlete_two_sets:m.athlete_one_sets;const myGames=m.athlete_one_id===mine?m.athlete_one_games:m.athlete_two_games;const oppGames=m.athlete_one_id===mine?m.athlete_two_games:m.athlete_one_games;return <article key={m.id} className={`rounded-xl border p-4 ${pending.includes(m.status)?"border-amber-500/40 bg-amber-500/5":"border-slate-800 bg-slate-900/60"}`}><div className="flex items-center justify-between text-xs text-slate-500"><span>Jogo {index+1}{m.class_number?` · ${m.class_number}ª classe`:""}</span><span className="rounded-full border border-slate-700 px-2 py-1">{statusText(m.status,m.result_type)}</span></div><div className="mt-4 flex items-center justify-between gap-3"><strong className="text-white">Você</strong><span className="text-xs font-bold text-slate-600">VS</span><strong className="text-right text-white">{opponent}</strong></div>{isBye(m)?<p className="mt-3 text-sm text-emerald-300">BYE nesta rodada. Você não precisa lançar resultado.</p>:<p className="mt-3 text-sm text-slate-400">Placar: {mySets??0} x {oppSets??0} sets · {myGames??0} x {oppGames??0} games</p>}</article>})}</div>}</section><section className="mt-8 grid gap-6 lg:grid-cols-2"><div className="rounded-2xl bg-slate-900 p-6"><h2 className="text-xl font-semibold text-white">Meus confrontos</h2><p className="mt-2 text-slate-400">{matches.length?`${matches.length} confronto(s) carregado(s).`:"Nenhum confronto encontrado nesta rodada."}</p></div><div className="rounded-2xl bg-slate-900 p-6"><h2 className="text-xl font-semibold text-white">Classificação da classe</h2><p className="mt-2 text-slate-400">{standings.length?`${standings.length} atleta(s) na classificação.`:"Ainda não há classificação disponível."}</p></div></section></div></main>;
}
