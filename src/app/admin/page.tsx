"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminPanel from "@/components/AdminPanel";
import Navigation from "@/components/Navigation";
import { createClient } from "@/lib/supabase/client";

const ADMIN_EMAIL = "eng.durvalneto@gmail.com";

export default function AdminPage() {
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL || user?.app_metadata?.role === "admin";
      setAuthorized(Boolean(isAdmin));
      setChecking(false);
    };
    void checkAccess();
  }, []);

  return (
    <>
      <Navigation />
      <main className="page-container py-10">
        <div className="mx-auto max-w-6xl">
          <Link href="/dashboard" className="text-sm text-emerald-400 hover:text-emerald-300">← Voltar ao dashboard</Link>
          {checking ? <p className="mt-8 text-slate-400">Verificando acesso...</p> : !authorized ? (
            <section className="mt-8 rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center">
              <h1 className="text-xl font-semibold text-red-200">Acesso negado</h1>
              <p className="mt-2 text-sm text-red-300">Somente o administrador pode acessar esta área.</p>
            </section>
          ) : (
            <>
              <h1 className="mt-4 text-3xl font-bold text-white">Administração</h1>
              <p className="mt-2 text-slate-400">Gerencie atletas, temporadas, rodadas, partidas, resultados e contestações.</p>
              <div className="mt-8"><AdminPanel /></div>
            </>
          )}
        </div>
      </main>
    </>
  );
}
