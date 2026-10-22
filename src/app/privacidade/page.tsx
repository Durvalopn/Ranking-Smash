import Link from 'next/link'

export const metadata = {
  title: 'Política de Privacidade | App Ranking Smash',
  description: 'Política de privacidade do App Ranking Smash.',
}

export default function PrivacidadePage() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-12 text-slate-900">
      <Link href="/cadastro" className="text-sm font-semibold text-emerald-700 hover:underline">
        Voltar ao cadastro
      </Link>

      <h1 className="mt-8 text-3xl font-bold">Política de Privacidade</h1>
      <p className="mt-2 text-sm text-slate-600">Última atualização: 22 de outubro de 2026</p>

      <div className="mt-8 space-y-6 leading-7">
        <section>
          <h2 className="text-xl font-semibold">1. Dados coletados</h2>
          <p className="mt-2">O aplicativo pode coletar dados informados no cadastro, como nome, e-mail, data de nascimento, telefone e informações esportivas necessárias para o funcionamento do ranking.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">2. Como os dados são usados</h2>
          <p className="mt-2">Os dados são usados para criar e proteger contas, administrar temporadas e partidas, calcular classificações e disponibilizar as funções do aplicativo.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">3. Armazenamento e segurança</h2>
          <p className="mt-2">Os dados devem ser armazenados em serviços autorizados e protegidos por controles de acesso. Chaves secretas e credenciais técnicas não devem ser compartilhadas no navegador ou em repositórios públicos.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">4. Serviços de terceiros</h2>
          <p className="mt-2">O aplicativo pode utilizar serviços de hospedagem, banco de dados e inteligência artificial. Antes da publicação, informe aqui quais provedores são usados e como seus termos e políticas se aplicam.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">5. Direitos do usuário</h2>
          <p className="mt-2">Para solicitar acesso, correção ou exclusão de dados, o usuário deve utilizar o canal oficial de contato informado pelo responsável pelo aplicativo.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">6. Contato</h2>
          <p className="mt-2">Antes da publicação, substitua este texto pelo nome do responsável, canal de contato e demais informações exigidas para o serviço.</p>
        </section>
      </div>
    </main>
  )
}
