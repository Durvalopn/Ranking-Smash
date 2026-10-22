import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Ranking de tênis",
  description: "Gerencie temporadas, partidas e classificações no App Ranking Smash.",
};

const features = [
  ["🏆", "Classificação completa", "Acompanhe pontos, vitórias e posição em cada classe."],
  ["🎾", "Sorteio inteligente", "Organize confrontos equilibrados para cada rodada."],
  ["📅", "Temporadas e rodadas", "Controle o calendário anual da competição."],
  ["✅", "Resultados confirmados", "Registre, confirme ou conteste resultados."],
  ["📈", "Promoção e rebaixamento", "Acompanhe a evolução dos atletas entre classes."],
  ["🔔", "Notificações", "Receba avisos sobre sorteios, prazos e resultados."],
] as const;

const seasons = [
  "Austrália Open da Smash",
  "Roland Garros da Smash",
  "Wimbledon da Smash",
  "US Open da Smash",
  "Finals da Smash",
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/90 backdrop-blur-xl">
        <div className="page-container flex min-h-16 items-center justify-between gap-4 py-3">
          <Link href="/" className="text-lg font-bold text-white">Ranking <span className="text-smash-400">Smash</span></Link>
          <nav className="hidden gap-6 text-sm text-slate-300 md:flex">
            <a href="#temporadas" className="hover:text-smash-400">Temporadas</a>
            <a href="#funcionalidades" className="hover:text-smash-400">Funcionalidades</a>
            <a href="#regras" className="hover:text-smash-400">Pontuação</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800">Entrar</Link>
            <Link href="/cadastro" className="btn-primary px-4">Cadastrar</Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-white/10">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.18),transparent_38%),radial-gradient(circle_at_85%_35%,rgba(14,165,233,0.12),transparent_30%)]" />
          <div className="page-container grid items-center gap-12 py-20 lg:grid-cols-2 lg:py-28">
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-smash-400">Ranking anual de tênis</p>
              <h1 className="mt-4 text-5xl font-black tracking-tight sm:text-6xl">Entre em quadra.<span className="mt-2 block text-smash-400">Evolua no ranking.</span></h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">Participe das temporadas, acompanhe seus confrontos, registre resultados e dispute cada posição no App Ranking Smash.</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/cadastro" className="btn-primary px-6 py-3">Criar minha conta</Link>
                <Link href="/login" className="btn-secondary px-6 py-3">Acessar painel</Link>
              </div>
              <div className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-white/10 pt-6">
                <div><p className="text-xs uppercase text-slate-500">Temporadas</p><p className="mt-1 text-2xl font-bold">5</p></div>
                <div><p className="text-xs uppercase text-slate-500">Rodadas</p><p className="mt-1 text-2xl font-bold">6</p></div>
                <div><p className="text-xs uppercase text-slate-500">Classes</p><p className="mt-1 text-2xl font-bold">6</p></div>
              </div>
            </div>
            <div className="card mx-auto w-full max-w-md bg-gradient-to-br from-smash-950 to-slate-900">
              <p className="text-sm text-slate-400">Temporada atual</p>
              <h2 className="mt-2 text-2xl font-bold">Austrália Open da Smash</h2>
              <span className="badge-success mt-4">Em andamento</span>
              <div className="mt-6 grid grid-cols-3 gap-3 text-center">
                <div><p className="text-xs text-slate-500">Pontos</p><p className="mt-1 text-2xl font-bold">28</p></div>
                <div><p className="text-xs text-slate-500">Vitórias</p><p className="mt-1 text-2xl font-bold">4</p></div>
                <div><p className="text-xs text-slate-500">Classe</p><p className="mt-1 text-2xl font-bold">2ª</p></div>
              </div>
            </div>
          </div>
        </section>

        <section id="temporadas" className="border-b border-white/10 bg-slate-900/40 py-20">
          <div className="page-container"><p className="text-sm font-bold uppercase tracking-widest text-smash-400">Calendário anual</p><h2 className="mt-3 text-3xl font-bold">Cinco temporadas. Uma grande disputa.</h2><div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{seasons.map((season, index) => <article key={season} className="card-interactive min-h-40"><span className="text-xs font-bold text-slate-500">TEMPORADA {String(index + 1).padStart(2, "0")}</span><h3 className="mt-8 font-bold">{season}</h3></article>)}</div></div>
        </section>

        <section id="funcionalidades" className="py-20"><div className="page-container"><div className="mx-auto max-w-2xl text-center"><p className="text-sm font-bold uppercase tracking-widest text-smash-400">Tudo em um só lugar</p><h2 className="mt-3 text-3xl font-bold">Feito para quem vive o tênis</h2></div><div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{features.map(([icon, title, description]) => <article key={title} className="card-interactive"><span className="text-2xl" aria-hidden="true">{icon}</span><h3 className="mt-4 text-lg font-bold">{title}</h3><p className="mt-2 leading-7 text-slate-400">{description}</p></article>)}</div></div></section>

        <section id="regras" className="py-20"><div className="page-container"><div className="rounded-3xl border border-smash-500/20 bg-smash-950/60 p-8 text-center sm:p-12"><p className="text-sm font-bold uppercase tracking-widest text-smash-400">Regras transparentes</p><h2 className="mt-3 text-3xl font-bold">Cada partida conta.</h2><p className="mx-auto mt-4 max-w-2xl leading-8 text-slate-300">A classificação considera pontos, saldo de sets, saldo de games e os critérios oficiais da competição.</p><div className="mt-8 flex flex-wrap justify-center gap-3"><span className="badge-success">Vitória: 7 pontos</span><span className="badge-success">Derrota: 3 pontos</span><span className="badge-success">WO recebido: 7 pontos</span></div></div></div></section>

        <section className="pb-24 pt-4"><div className="page-container text-center"><h2 className="text-3xl font-bold sm:text-5xl">Pronto para entrar em quadra?</h2><p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-400">Crie sua conta e participe das próximas rodadas.</p><Link href="/cadastro" className="btn-primary mt-8 px-7 py-3">Quero participar</Link></div></section>
      </main>
    </div>
  );
}
