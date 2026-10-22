import Link from "next/link";
import Navigation from "@/components/Navigation";

type SectionEmptyStateProps = {
  title: string;
  description: string;
  emptyMessage: string;
};

export default function SectionEmptyState({ title, description, emptyMessage }: SectionEmptyStateProps) {
  return (
    <>
      <Navigation />
      <main className="page-container py-10">
        <div className="mx-auto max-w-5xl">
          <Link href="/dashboard" className="text-sm text-emerald-400 hover:text-emerald-300">
            ← Voltar ao dashboard
          </Link>
          <h1 className="mt-4 text-3xl font-bold text-white">{title}</h1>
          <p className="mt-2 text-slate-400">{description}</p>
          <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/70 p-8 text-center shadow-xl">
            <h2 className="text-lg font-semibold text-white">{emptyMessage}</h2>
            <p className="mt-2 text-sm text-slate-400">Quando os dados forem cadastrados no aplicativo, eles aparecerão aqui.</p>
          </section>
        </div>
      </main>
    </>
  );
}
