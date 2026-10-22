import Link from 'next/link'

export const metadata = {
  title: 'Termos de Uso | App Ranking Smash',
  description: 'Termos de uso do App Ranking Smash.',
}

export default function TermosPage() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-12 text-slate-900">
      <Link href="/cadastro" className="text-sm font-semibold text-emerald-700 hover:underline">
        Voltar ao cadastro
      </Link>

      <h1 className="mt-8 text-3xl font-bold">Termos de Uso</h1>
      <p className="mt-2 text-sm text-slate-600">Última atualização: 22 de outubro de 2026</p>

      <div className="mt-8 space-y-6 leading-7">
        <section>
          <h2 className="text-xl font-semibold">1. Sobre o aplicativo</h2>
          <p className="mt-2">O App Ranking Smash é uma plataforma para gerenciamento de temporadas, rodadas, partidas e classificações esportivas.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">2. Cadastro e responsabilidade</h2>
          <p className="mt-2">O usuário deve fornecer informações verdadeiras, manter seus dados de acesso em segurança e comunicar qualquer uso não autorizado da conta.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">3. Uso aceitável</h2>
          <p className="mt-2">Não é permitido usar o aplicativo para praticar fraude, acessar dados de terceiros, interferir no funcionamento da plataforma ou inserir conteúdo ilícito.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">4. Disponibilidade</h2>
          <p className="mt-2">O aplicativo pode receber atualizações, correções e alterações de funcionalidades. O responsável pelo serviço deve preencher aqui as regras específicas de disponibilidade e suporte.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">5. Contato</h2>
          <p className="mt-2">Antes da publicação, substitua este texto pelo canal oficial de contato e pelos dados da pessoa ou empresa responsável pelo aplicativo.</p>
        </section>
      </div>
    </main>
  )
}
