"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import Navigation from "@/components/Navigation";
import AdminPanel from "@/components/AdminPanel";
import ClassMovementPanel from "@/components/ClassMovementPanel";
import { createClient } from "@/lib/supabase/client";

const ADMIN_EMAIL = "eng.durvalneto@gmail.com";

export default function AdminPage() {
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [seasonName, setSeasonName] = useState("");
  const [seasonYear, setSeasonYear] = useState(String(new Date().getFullYear()));
  const [roundsCount, setRoundsCount] = useState("10");
  const [savingSeason, setSavingSeason] = useState(false);
  const [seasonMessage, setSeasonMessage] = useState("");
  const [seasonError, setSeasonError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (active) {
        setAuthorized(Boolean(user?.email && user.email.toLowerCase() === ADMIN_EMAIL));
        setChecking(false);
      }
    })();
    return () => { active = false; };
  }, []);

  async function createSeason(event: FormEvent) {
    event.preventDefault();
    setSeasonMessage("");
    setSeasonError("");
    const name = seasonName.trim();
    const year = Number(seasonYear);
    const totalRounds = Number(roundsCount);
    if (!name) { setSeasonError("Informe o nome da temporada."); return; }
    if (!Number.isInteger(year) || year < 2020 || year > 2100) { setSeasonError("Informe um ano válido."); return; }
    if (!Number.isInteger(totalRounds) || totalRounds < 1 || totalRounds > 100) { setSeasonError("A quantidade de rodadas deve estar entre 1 e 100."); return; }
    setSavingSeason(true);
    const supabase = createClient() as any;
    const { data, error } = await supabase.from("seasons").insert({ name, year, rounds_count: totalRounds, status: "registration", season_type: "regular" }).select("id,name,year,rounds_count,status").single();
    if (error) {
      setSeasonError(error.message.includes("CLASS_MOVEMENT_REQUIRED") ? "A movimentação de classes da temporada anterior precisa ser aplicada antes de criar uma nova temporada." : "Não foi possível criar a temporada. Verifique os dados e tente novamente.");
      setSavingSeason(false);
      return;
    }
    setSeasonName("");
    setSeasonMessage(`Temporada ${data.name} ${data.year} criada com ${data.rounds_count} rodada(s).`);
    setSavingSeason(false);
  }

  return <><Navigation /><main className="page-container py-10"><div className="mx-auto max-w-6xl"><Link href="/dashboard" className="text-sm text-emerald-400">← Voltar ao dashboard</Link>{checking ? <p className="mt-8 text-slate-400">Verificando acesso...</p> : !authorized ? <section className="mt-8 rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center"><h1 className="text-xl font-semibold text-red-200">Acesso negado</h1><p className="mt-2 text-sm text-red-300">Somente o administrador pode acessar esta área.</p></section> : <><h1 className="mt-4 text-3xl font-bold text-white">Administração</h1><p className="mt-2 text-slate-400">Crie temporadas, gerencie rodadas, resultados, movimentações de classes e o Finals.</p><section className="mt-8 rounded-2xl border border-emerald-500/30 bg-slate-900/70 p-6"><p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">Nova temporada regular</p><h2 className="mt-2 text-2xl font-bold text-white">Criar temporada</h2><p className="mt-2 text-sm text-slate-400">A temporada será criada em registro e o Finals continua sendo gerado exclusivamente nesta área.</p><form onSubmit={createSeason} className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_150px_180px_auto] md:items-end"><label className="text-sm text-slate-300">Nome<input value={seasonName} onChange={(event) => setSeasonName(event.target.value)} placeholder="Ex.: Australian Open" className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white" /></label><label className="text-sm text-slate-300">Ano<input type="number" min="2020" max="2100" value={seasonYear} onChange={(event) => setSeasonYear(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white" /></label><label className="text-sm text-slate-300">Rodadas<input type="number" min="1" max="100" value={roundsCount} onChange={(event) => setRoundsCount(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white" /></label><button type="submit" disabled={savingSeason} className="rounded-lg bg-emerald-500 px-5 py-2.5 font-semibold text-slate-950 disabled:opacity-50">{savingSeason ? "Criando..." : "Criar temporada"}</button></form>{seasonError && <p className="mt-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{seasonError}</p>}{seasonMessage && <p className="mt-4 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-300">{seasonMessage}</p>}</section><AdminPanel /><ClassMovementPanel /><section className="mt-8 rounded-2xl border border-yellow-400/30 bg-yellow-400/10 p-6"><p className="text-xs font-semibold uppercase tracking-wide text-yellow-200">Finals automático</p><h2 className="mt-2 text-2xl font-bold text-yellow-100">As próximas fases são geradas pelos resultados dos usuários</h2><p className="mt-2 text-sm text-yellow-100/80">Quando todos os jogos de uma classe na etapa atual tiverem resultado lançado, a próxima etapa dessa classe será criada automaticamente. Nenhum avanço manual é necessário.</p></section></>}</div></main></>;
}
