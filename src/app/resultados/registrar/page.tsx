"use client";

import Link from "next/link";
import AdminPanel from "@/components/AdminPanel";

export const metadata = {
  title: "Registrar resultado | Ranking Smash",
};

export default function RegistrarResultadoPage() {
  return (
    <main className="page-container py-10">
      <div className="mx-auto max-w-6xl">
        <Link href="/dashboard" className="text-sm text-emerald-400 hover:text-emerald-300">
          ← Voltar ao dashboard
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-white">Registrar resultado</h1>
        <p className="mt-2 text-slate-400">
          Selecione a partida e registre resultado normal, WO ou WO duplo.
        </p>
        <div className="mt-8">
          <AdminPanel />
        </div>
      </div>
    </main>
  );
}
