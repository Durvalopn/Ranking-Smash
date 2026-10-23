"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type FinalsSeason = { id: string; name: string; year: number; status: string; season_type: string };
type Entry = { id: string; season_id: string; class_number: number; athlete_id: string; qualification_reason: string; annual_points: number; seed: number; group_name: "A" | "B" };
type AthleteRef = { id: string; user_id: string };
type Profile = { id: string; full_name: string | null };
type RpcClient = { rpc: (name: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }> };
const labels = ["1ª Classe", "2ª Classe", "3ª Classe", "4ª Classe", "5ª Classe", "6ª Classe"];

export default function FinalsAdminPanel() {
  const supabase = createClient();
  const [finished, setFinished] = useState(0);
  const [finals, setFinals] = useState<FinalsSeason | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    const [seasonsQuery, entriesQuery] = await Promise.all([
      supabase.from("seasons").select("id,name,year,status,season_type").order("created_at", { ascending: true }),
      supabase.from("finals_entries").select("id,season_id,class_number,athlete_id,qualification_reason,annual_points,seed,group_name"),
    ]);
    if (seasonsQuery.error || entriesQuery.error) { setError("Não foi possível carregar o estado do Finals."); setLoading(false); return; }
    const allSeasons = (seasonsQuery.data ?? []) as FinalsSeason[];
    const currentFinals = allSeasons.find((season) => season.season_type === "finals") ?? null;
    const allEntries = (entriesQuery.data ?? []) as Entry[];
    const currentEntries = currentFinals ? allEntries.filter((entry) => entry.season_id === currentFinals.id) : [];
    const athleteIds = [...new Set(currentEntries.map((entry) => entry.athlete_id))];
    let athleteRefs: AthleteRef[] = []; let profileRows: Profile[] = [];
    if (athleteIds.length) {
      const athleteQuery = await supabase.from("athletes").select("id,user_id").in("id", athleteIds);
      if (athleteQuery.error) { setError("Não foi possível carregar os atletas do Finals."); setLoading(false); return; }
      athleteRefs = (athleteQuery.data ?? []) as AthleteRef[];
      const userIds = athleteRefs.map((athlete) => athlete.user_id);
      if (userIds.length) {
        const profileQuery = await supabase.from("profiles").select("id,full_name").in("id", userIds);
        if (profileQuery.error) { setError("Não foi possível carregar os nomes dos atletas."); setLoading(false); return; }
        profileRows = (profileQuery.data ?? []) as Profile[];
      }
    }
    const names: Record<string, string> = {};
    for (const athlete of athleteRefs) names[athlete.id] = profileRows.find((profile) => profile.id === athlete.user_id)?.full_name ?? "Atleta";
    setFinished(allSeasons.filter((season) => season.status === "finished" && season.season_type !== "finals").length);
    setFinals(currentFinals); setEntries(currentEntries); setProfiles(names); setLoading(false);
  }, [supabase]);

  useEffect(() => { void load(); }, [load]);

  async function generate() {
    setWorking(true); setMessage(""); setError("");
    const result = await (supabase as unknown as RpcClient).rpc("generate_finals");
    if (result.error) { const text = result.error.message; setError(text.includes("FOUR_FINISHED") ? "É necessário encerrar as quatro temporadas regulares antes de gerar o Finals." : text.includes("ALREADY_GENERATED") ? "O Finals desta temporada já foi gerado." : "Não foi possível gerar o Finals."); }
    else setMessage("Finals gerado com a fase de grupos pronta.");
    setWorking(false); await load();
  }

  async function advance() {
    if (!finals) return;
    setWorking(true); setMessage(""); setError("");
    const result = await (supabase as unknown as RpcClient).rpc("advance_finals_phase", { p_season_id: finals.id });
    if (result.error) { const text = result.error.message; setError(text.includes("GROUP_STAGE") ? "Finalize todos os jogos da fase de grupos antes de avançar." : text.includes("SEMIFINALS") ? "Finalize as semifinais antes de criar a final." : "Não foi possível avançar a fase."); }
    else setMessage(result.data === "SEMIFINALS_CREATED" ? "Semifinais criadas." : result.data === "FINALS_CREATED" ? "Final criada." : "A fase já foi avançada.");
    setWorking(false); await load();
  }

  const grouped = useMemo(() => labels.map((label, index) => ({ label, rows: entries.filter((entry) => entry.class_number === index + 1) })).filter((group) => group.rows.length), [entries]);
  return <section className="mt-8 rounded-2xl border border-yellow-500/30 bg-yellow-500/5 p-5">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-wide text-yellow-300">Administração do Finals</p><h2 className="mt-1 text-2xl font-bold text-white">Gerar e conduzir o Finals</h2><p className="mt-2 text-sm text-slate-300">Quatro temporadas regulares encerradas, grupos de quatro, semifinais e final em um set.</p></div>{!finals ? <button disabled={working || finished < 4} onClick={generate} className="rounded-lg bg-yellow-400 px-4 py-3 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50">{working ? "Gerando..." : "Gerar Finals"}</button> : <button disabled={working} onClick={advance} className="rounded-lg bg-emerald-500 px-4 py-3 font-semibold text-slate-950 disabled:opacity-50">{working ? "Processando..." : "Avançar fase"}</button>}</div>
    {loading ? <p className="mt-5 text-slate-400">Carregando estado do Finals...</p> : <><p className="mt-3 text-sm text-slate-400">Temporadas regulares encerradas: {finished}/4{finals ? ` · Finals ${finals.year} criado` : ""}</p>{message && <p className="mt-4 rounded-lg bg-emerald-500/10 p-3 text-emerald-300">{message}</p>}{error && <p className="mt-4 rounded-lg bg-red-500/10 p-3 text-red-300">{error}</p>}{finals && grouped.length > 0 && <div className="mt-6 grid gap-4 md:grid-cols-2">{grouped.map((group) => <div key={group.label} className="rounded-xl border border-slate-800 bg-slate-950/50 p-4"><h3 className="font-semibold text-white">{group.label}</h3><div className="mt-3 grid gap-2 sm:grid-cols-2"><div><p className="text-xs uppercase text-slate-500">Grupo A</p>{group.rows.filter((entry) => entry.group_name === "A").map((entry) => <p key={entry.id} className="text-sm text-slate-300">{entry.seed}. {profiles[entry.athlete_id] ?? "Atleta"}</p>)}</div><div><p className="text-xs uppercase text-slate-500">Grupo B</p>{group.rows.filter((entry) => entry.group_name === "B").map((entry) => <p key={entry.id} className="text-sm text-slate-300">{entry.seed}. {profiles[entry.athlete_id] ?? "Atleta"}</p>)}</div></div></div>)}</div>}</>}</section>;
}
