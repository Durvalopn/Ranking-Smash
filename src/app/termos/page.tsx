import Link from 'next/link'

export const metadata = {
  title: 'Termos de Uso | App Ranking Smash',
  description: 'Termos de uso do App Ranking Smash.',
}

export default function TermosPage() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-12 text-slate-900">
      <Link href="/cadastro" className="text-sm font-semibold text-emerald-700 hover:underline">Voltar ao cadastro</Link>
      <h1 className="mt-8 text-3xl font-bold">Termos de Uso</h1>
      <p className="mt-2 text-sm text-slate-600">Última atualização: 22 de outubro de 2026</p>
      <div className="mt-8 space-y-6 leading-7">
        <section><h2 className="text-xl font-semibold">1. Sobre o serviço</h2><p className="mt-2">O App Ranking Smash é uma plataforma gratuita para gerenciamento de temporadas, rodadas, partidas e classificações esportivas no Brasil. O responsável pelo aplicativo é Durval Neto.</p></section>
        <section><h2 className="text-xl font-semibold">2. Conta do usuário</h2><p className="mt-2">O usuário deve fornecer informações verdadeiras e manter suas credenciais em segurança. É responsável pelas atividades realizadas em sua conta.</p></section>
        <section><h2 className="text-xl font-semibold">3. Regras do ranking</h2><p className="mt-2">Os usuários devem registrar partidas e resultados de forma honesta, respeitar os participantes e não manipular pontuações, classificações ou sorteios. Resultados podem ser corrigidos quando houver erro comprovado, fraude ou violação das regras da temporada.</p></section>
        <section><h2 className="text-xl font-semibold">4. Condutas proibidas</h2><p className="mt-2">É proibido praticar fraude, assédio, ameaça, acesso não autorizado, tentativa de obter dados de terceiros, inserção de conteúdo ilícito ou interferência técnica no serviço.</p></section>
        <section><h2 className="text-xl font-semibold">5. Suspensão e cancelamento</h2><p className="mt-2">Uma conta pode ser suspensa ou encerrada em caso de violação destes Termos, fraude, risco à segurança, uso abusivo ou obrigação legal. O usuário pode solicitar o encerramento da conta pelo contato oficial.</p></section>
        <section><h2 className="text-xl font-semibold">6. Disponibilidade e responsabilidade</h2><p className="mt-2">O serviço pode receber atualizações ou interrupções temporárias. O usuário é responsável pelos dados e resultados informados. Na medida permitida pela lei, não há garantia de disponibilidade contínua ou de ausência de erros causados por informações incorretas ou serviços de terceiros. Direitos que não possam ser afastados pela legislação brasileira permanecem preservados.</p></section>
        <section><h2 className="text-xl font-semibold">7. Lei aplicável e conflitos</h2><p className="mt-2">Estes Termos são regidos pelas leis brasileiras. Dúvidas e conflitos devem ser encaminhados inicialmente ao contato oficial, sem impedir o exercício de direitos perante as autoridades e órgãos competentes.</p></section>
        <section><h2 className="text-xl font-semibold">8. Contato</h2><p className="mt-2">Responsável: Durval Neto.</p><p className="mt-2">E-mail: <a className="text-emerald-700 underline" href="mailto:eng.durvalneto@gmail.com">eng.durvalneto@gmail.com</a></p></section>
      </div>
    </main>
  )
}
