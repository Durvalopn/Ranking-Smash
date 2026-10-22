import Link from "next/link";
import Navigation from "@/components/Navigation";

export default function RegistrarResultadoPage() {
  return (
    <>
      <Navigation />
      <main className="page-container py-10">
        <div className="mx-auto max-w-3xl">
          <Link href="/dashboard" className="text-sm text-emerald-400 hover:text-emerald-300">← Voltar ao dashboard</Link>
          <h1 className="mt-4 text-3xl font-bold text-white">Registrar resultado</h1>
          <p className="mt-2 text-slate-400">O registro de resultados agora fica na área Administração.</p>
          <Link href="/admin" className="mt-8 inline-flex rounded-lg bg-emerald-500 px-4 py-3 font-semibold text-slate-950 hover:bg-emerald-400">Abrir Administração</Link>
        </div>
      </main>
    </>
  );
}
