import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Ranking de tênis",
  description:
    "Gerencie temporadas, rodadas, confrontos, resultados e classificações no App Ranking Smash.",
};

const seasons = [
  { number: "01", name: "Austrália Open da Smash", period: "Início do calendário", color: "from-sky-500/20 to-blue-500/5", border: "hover:border-sky-500/50" },
  { number: "02", name: "Roland Garros da Smash", period: "Segunda temporada", color: "from-orange-500/20 to-amber-500/5", border: "hover:border-orange-500/50" },
  { number: "03", name: "Wimbledon da Smash", period: "Terceira temporada", color: "from-emerald-500/20 to-green-500/5", border: "hover:border-emerald-500/50" },
  { number: "04", name: "US Open da Smash", period: "Quarta temporada", color: "from-indigo-500/20 to-blue-500/5", border: "hover:border-indigo-500/50" },
  { number: "05", name: "Finals da Smash", period: "Encerramento do calendário", color: "from-amber-400/20 to-yellow-500/5", border: "hover:border-amber-500/50" },
] as const;

const features = [
  { icon: "🏆", title: "Classificação completa", description: "Acompanhe pontos, vitórias, saldo de sets, saldo de games e posição em cada classe." },
  { icon: "🎾", title: "Sorteio inteligente", description: "Confrontos equilibrados considerando a classificação, o histórico e as zonas de disputa." },
  { icon: "📅", title: "Temporadas e rodadas", description: "Cinco temporadas anuais, com seis rodadas controladas pela organização." },
  { icon: "✅", title: "Resultados confirmados", description: "Envie resultados, confirme placares ou conteste informações diretamente pela plataforma." },
  { icon: "📈", title: "Promoção e rebaixamento", description: "Movimentação de 20% dos atletas entre classes ao final de cada temporada." },
  { icon: "🔔", title: "Notificações", description: "Receba avisos sobre sorteios, prazos, resultados e demais eventos importantes." },
] as const;

const rules = ["Vitória: 7 pontos", "Derrota: 3 pontos", "WO recebido: 7 pontos", "Atleta licenciado: 3 pontos"] as const;

function TennisBallIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 64 64" className="h-9 w-9" fill="none">
      <circle cx="32" cy="32" r="28" fill="currentColor" />
      <path d="M10.5 19.5c13 1.5 20.5 9 22 22M53.5 44.5c-13-1.5-20.5-9-22-22" stroke="#052e16" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none">
      <path d="M4 10h12m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/85 backdrop-blur-xl">
        <div className="page-container flex min-h-16 items-center justify-between gap-6 py-3">
          <Link href="/" aria-label="App Ranking Smash — página inicial" className="flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-smash-400">
            <span className="text-smash-400"><TennisBallIcon /></span>
            <span className="leading-tight"><strong className="block text-base font-bold text-white sm:text-lg">Ranking Smash</strong><span className="hidden text-xs text-slate-400 sm:block">Sua competição, em um só lugar</span></span>
          </Link>

          <nav aria-label="Navegação principal" className="hidden items-center gap-7 md:flex">
            <a href="#temporadas" className="text-sm font-medium text-slate-300 transition hover:text-smash-400">Temporadas</a>
            <a href="#funcionalidades" className="text-sm font-medium text-slate-300 transition hover:text-smash-400">Funcionalidades</a>
            <a href="#regras" className="text-sm font-medium text-slate-300 transition hover:text-smash-400">Pontuação</a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/login" className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800 hover:text-white sm:px-4">Entrar</Link>
            <Link href="/cadastro" className="btn-primary px-3 sm:px-4">Cadastrar</Link>
          </div>
        </div>
      </header>

      <section className="relative isolate overflow-hidden">
        <div aria-hidden="true" className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.16),transparent_34%),radial-gradient(circle_at_85%_30%,rgba(14,165,233,0.11),transparent_28%)]" />
        <div aria-hidden="true" className="absolute left-1/2 top-20 -z-10 h-80 w-80 -translate-x-1/2 rounded-full bg-smash-500/10 blur-3xl" />

        <div className="page-container grid items-center gap-14 py-20 lg:grid-cols-[1.08fr_0.92fr] lg:py-28">
          <div className="max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-smash-500/30 bg-smash-500/10 px-3 py-1.5 text-sm font-medium text-smash-300"><span aria-hidden="true" className="h-2 w-2 rounded-full bg-smash-400 shadow-[0_0_12px_rgba(74,222,128,0.9)]" />Ranking anual de tênis</div>
            <h1 className="text-balance text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-7xl">Entre em quadra.<span className="mt-2 block bg-gradient-to-r from-smash-300 via-smash-400 to-emerald-500 bg-clip-text text-transparent">Evolua no ranking.</span></h1>
            <p className="mt-6 max-w-2xl text-pretty text-lg leading-8 text-slate-300 sm:text-xl">Participe das temporadas, acompanhe seus confrontos, registre resultados e dispute cada posição no App Ranking Smash.</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row"><Link href="/cadastro" className="btn-primary px-6 py-3">Criar minha conta<ArrowIcon /></Link><Link href="/dashboard" className="btn-secondary px-6 py-3">Acessar painel</Link></div>
            <dl className="mt-10 grid max-w-xl grid-cols-3 gap-3 border-t border-white/10 pt-7"><div><dt className="text-xs uppercase tracking-wider text-slate-500">Temporadas</dt><dd className="mt-1 text-2xl font-bold text-white">5</dd></div><div><dt className="text-xs uppercase tracking-wider text-slate-500">Rodadas</dt><dd className="mt-1 text-2xl font-bold text-white">6</dd></div><div><dt className="text-xs uppercase tracking-wider text-slate-500">Classes</dt><dd className="mt-1 text-2xl font-bold text-white">6</dd></div></dl>
          </div>

          <div className="relative mx-auto w-full max-w-lg lg:mx-0 lg:ml-auto"><div aria-hidden="true" className="absolute -inset-5 -z-10 rounded-[2rem] bg-gradient-to-br from-smash-500/20 to-sky-500/10 blur-2xl" /><div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/90 shadow-2xl shadow-black/40"><div className="flex items-center justify-between border-b border-white/10 px-5 py-4"><div><p className="text-xs font-medium uppercase tracking-wider text-slate-500">Temporada atual</p><h2 className="mt-1 text-base font-bold text-white">Austrália Open da Smash</h2></div><span className="badge-success">Em andamento</span></div><div className="p-5"><div className="rounded-2xl border border-smash-500/20 bg-gradient-to-br from-smash-500/10 to-transparent p-5"><div className="flex items-start justify-between gap-4"><div><p className="text-sm text-slate-400">Sua posição</p><p className="mt-1 text-4xl font-black text-white">3<span className="text-lg text-smash-400">º</span></p></div><div className="rounded-xl bg-smash-500/15 p-3 text-smash-400"><TennisBallIcon /></div></div><div className="mt-5 grid grid-cols-3 gap-3"><div><p className="text-xs text-slate-500">Pontos</p><p className="mt-1 font-bold text-white">28</p></div><div><p className="text-xs text-slate-500">Vitórias</p><p className="mt-1 font-bold text-white">4</p></div><div><p className="text-xs text-slate-500">Classe</p><p className="mt-1 font-bold text-white">2ª</p></div></div></div><div className="mt-5"><div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold text-white">Próximo confronto</h3><span className="text-xs font-medium text-smash-400">Rodada 5</span></div><div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-4"><div className="text-center"><span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-smash-500/15 text-sm font-bold text-smash-300">VS</span><p className="mt-2 text-xs text-slate-400">Você</p></div><div className="min-w-0 flex-1 text-center"><p className="text-xs uppercase tracking-wider text-slate-500">Prazo</p><p className="mt-1 truncate text-sm font-semibold text-white">10 dias</p></div><div className="text-center"><span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-sky-500/15 text-sm font-bold text-sky-300">4º</span><p className="mt-2 text-xs text-slate-400">Adversário</p></div></div></div></div></div></div>
        </div>
      </section>

      <section id="temporadas" aria-labelledby="temporadas-title" className="scroll-mt-20 border-y border-white/10 bg-slate-900/40 py-20"><div className="page-container"><div className="max-w-2xl"><p className="text-sm font-bold uppercase tracking-widest text-smash-400">Calendário anual</p><h2 id="temporadas-title" className="mt-3 text-3xl font-bold text-white sm:text-4xl">Cinco temporadas. Uma grande disputa.</h2><p className="mt-4 text-lg leading-8 text-slate-400">Some pontos durante o ano e conquiste uma das oito vagas da sua classe na Finals da Smash.</p></div><ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{seasons.map((season) => <li key={season.number} className={`group min-h-52 rounded-2xl border border-slate-800 bg-gradient-to-br ${season.color} ${season.border} p-5 transition duration-200 hover:-translate-y-1`}><div className="flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-widest text-slate-500">Temporada</span><span className="text-2xl font-black text-white/20 transition group-hover:text-white/40">{season.number}</span></div><h3 className="mt-10 text-xl font-bold leading-snug text-white">{season.name}</h3><p className="mt-3 text-sm leading-6 text-slate-400">{season.period}</p></li>)}</ol></div></section>

      <section id="funcionalidades" aria-labelledby="funcionalidades-title" className="scroll-mt-20 py-20"><div className="page-container"><div className="mx-auto max-w-2xl text-center"><p className="text-sm font-bold uppercase tracking-widest text-smash-400">Tudo em um só lugar</p><h2 id="funcionalidades-title" className="mt-3 text-3xl font-bold text-white sm:text-4xl">Feito para quem vive o tênis</h2><p className="mt-4 text-lg leading-8 text-slate-400">Organização, transparência e competitividade para atletas e administradores.</p></div><div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{features.map((feature) => <article key={feature.title} className="card-interactive"><span aria-hidden="true" className="flex h-12 w-12 items-center justify-center rounded-xl bg-smash-500/10 text-2xl">{feature.icon}</span><h3 className="mt-5 text-lg font-bold text-white">{feature.title}</h3><p className="mt-2 leading-7 text-slate-400">{feature.description}</p></article>)}</div></div></section>

      <section id="regras" aria-labelledby="regras-title" className="scroll-mt-20 py-20"><div className="page-container"><div className="relative overflow-hidden rounded-3xl border border-smash-500/20 bg-gradient-to-br from-smash-950/80 via-slate-900 to-slate-950 p-6 sm:p-10 lg:p-14"><div aria-hidden="true" className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-smash-500/10 blur-3xl" /><div className="relative grid items-center gap-10 lg:grid-cols-2"><div><p className="text-sm font-bold uppercase tracking-widest text-smash-400">Regras transparentes</p><h2 id="regras-title" className="mt-3 text-3xl font-bold text-white sm:text-4xl">Cada partida conta.</h2><p className="mt-4 max-w-xl text-lg leading-8 text-slate-300">Os critérios de classificação consideram pontos, saldo de sets, saldo de games e, em caso de novo empate, a maior idade.</p></div><ul className="grid gap-3 sm:grid-cols-2">{rules.map((rule) => <li key={rule} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4"><span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-smash-500/15 text-sm font-bold text-smash-400">✓</span><span className="font-medium text-slate-200">{rule}</span></li>)}</ul></div></div></div></div></section>

      <section aria-labelledby="cta-title" className="pb-24 pt-8"><div className="page-container"><div className="mx-auto max-w-3xl text-center"><h2 id="cta-title" className="text-3xl font-bold text-white sm:text-5xl">Pronto para entrar em quadra?</h2><p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-400">Crie sua conta, acompanhe o ranking e participe das próximas rodadas do App Ranking Smash.</p><div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><Link href="/cadastro" className="btn-primary px-7 py-3">Quero participar<ArrowIcon /></Link><Link href="/login" className="btn-secondary px-7 py-3">Já tenho uma conta</Link></div></div></div></section>
    </div>
  );
}
