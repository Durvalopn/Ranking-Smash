"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navigation from "@/components/Navigation";
import AdminPanel from "@/components/AdminPanel";
import ClassMovementPanel from "@/components/ClassMovementPanel";
import FinalsAdminPanel from "@/components/FinalsAdminPanel";
import { createClient } from "@/lib/supabase/client";

const ADMIN_EMAIL="eng.durvalneto@gmail.com";
export default function AdminPage(){const [checking,setChecking]=useState(true);const [authorized,setAuthorized]=useState(false);useEffect(()=>{let active=true;(async()=>{const supabase=createClient();const {data:{user}}=await supabase.auth.getUser();if(active){setAuthorized(Boolean(user&&user.email?.toLowerCase()===ADMIN_EMAIL));setChecking(false);}})();return()=>{active=false;};},[]);return <><Navigation/><main className="page-container py-10"><div className="mx-auto max-w-6xl"><Link href="/dashboard" className="text-sm text-emerald-400">← Voltar ao dashboard</Link>{checking?<p className="mt-8 text-slate-400">Verificando acesso...</p>:!authorized?<section className="mt-8 rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center"><h1 className="text-xl font-semibold text-red-200">Acesso negado</h1><p className="mt-2 text-sm text-red-300">Somente o administrador pode acessar esta área.</p></section>:<><h1 className="mt-4 text-3xl font-bold text-white">Administração</h1><p className="mt-2 text-slate-400">Rodadas, resultados, movimentação de classes e Finals.</p><AdminPanel/><ClassMovementPanel/><FinalsAdminPanel/></>}</div></main></>;
}
