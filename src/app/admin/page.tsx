"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminPanel from "@/components/AdminPanel";
import ClassMovementPanel from "@/components/ClassMovementPanel";
import Navigation from "@/components/Navigation";
import { createClient } from "@/lib/supabase/client";

const ADMIN_EMAIL="eng.durvalneto@gmail.com";
type RoleRow={role?:string|null};

function isAdmin(email:string|undefined,role:unknown,metadataRole:unknown){const e=(email??"").trim().toLowerCase();const r=String(role??metadataRole??"").trim().toLowerCase();return e===ADMIN_EMAIL||r==="admin";}

export default function AdminPage(){const [checking,setChecking]=useState(true);const [authorized,setAuthorized]=useState(false);useEffect(()=>{let active=true;(async()=>{const supabase=createClient();const {data:{user}}=await supabase.auth.getUser();if(!user){if(active){setChecking(false);setAuthorized(false);}return;}const {data:roleRow}=await supabase.from("user_roles").select("role").eq("user_id",user.id).maybeSingle() as {data:RoleRow|null};if(active){setAuthorized(isAdmin(user.email,roleRow?.role,user.app_metadata?.role));setChecking(false);}})();return()=>{active=false;};},[]);return <><Navigation/><main className="page-container py-10"><div className="mx-auto max-w-6xl"><Link href="/dashboard" className="text-sm text-emerald-400">← Voltar ao dashboard</Link>{checking?<p className="mt-8 text-slate-400">Verificando acesso...</p>:!authorized?<section className="mt-8 rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center"><h1 className="text-xl font-semibold text-red-200">Acesso negado</h1><p className="mt-2 text-sm text-red-300">Somente o administrador pode acessar esta área.</p></section>:<><h1 className="mt-4 text-3xl font-bold text-white">Administração</h1><p className="mt-2 text-slate-400">Atualização por rodada, atletas, temporadas, partidas, resultados e movimentação de classes.</p><div className="mt-8"><AdminPanel/></div><ClassMovementPanel/></>}</div></main></>;
}
