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
          <h2 className="text-xl font-semibold">1. Sobre o serviço</h2>
          <p className="mt-2">O App Ranking Smash é uma plataforma gratuita destinada ao gerenciamento de temporadas, rodadas, partidas e classificações esportivas no Brasil. O responsável pelo aplicativo é Durval Neto.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">2. Conta do usuário</h2>
          <p className="mt-2">Para utilizar determinadas funções, o usuário deve criar uma conta e fornecer informações verdadeiras, completas e atualizadas. O usuário é responsável por manter suas credenciais em sigilo e por todas as atividades realizadas em sua conta.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">3. Regras do ranking</h2>
          <p className="mt-2">Os usuários devem registrar partidas e resultados de forma honesta, respeitar os adversários e não tentar manipular pontuações, classificações, sorteios ou qualquer outro resultado da plataforma.</p>
          <p className="mt-2">Resultados e pontuações podem depender das regras da temporada, dos dados informados pelos usuários e de validações administrativas. O responsável pode corrigir registros comprovadamente incorretos ou fraudulentos.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">4. Condutas proibidas</h2>
          <p className="mt-2">É proibido utilizar o serviço para fraude, assédio, ameaça, acesso não autorizado, tentativa de obter dados de terceiros, inserção de conteúdo ilícito, interferência técnica ou qualquer finalidade que viole a legislação brasileira.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">5. Suspensão e cancelamento</h2>
          <p className="mt-2">Uma conta pode ser suspensa ou encerrada quando houver violação destes Termos, fraude, risco à segurança, uso abusivo ou obrigação legal. O usuário também pode solicitar o encerramento da própria conta pelo canal oficial disponibilizado pelo responsável.</p>
          <p className="mt-2">Quando apropriado e permitido, o usuário poderá ser informado sobre a medida e poderá apresentar esclarecimentos. A suspensão não elimina obrigações ou responsabilidades constituídas antes da medida.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">6. Disponibilidade e alterações</h2>
          <p className="mt-2">O serviço pode receber atualizações, correções, alterações de funcionalidades ou interrupções temporárias para manutenção e segurança. O responsável poderá atualizar estes Termos, informando a nova data de atualização nesta página.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">7. Responsabilidade</h2>
          <p className="mt-2">O usuário é responsável pela veracidade dos dados e resultados que inserir. Na medida permitida pela legislação aplicável, o responsável não garante que o serviço estará disponível sem interrupções ou que todos os resultados estarão livres de erros causados por informações incorretas dos usuários ou por serviços de terceiros.</p>
          <p className="mt-2">Nada nestes Termos limita direitos que não possam ser afastados pela legislação brasileira, inclusive direitos previstos nas normas de proteção do consumidor e de proteção de dados pessoais.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">8. Propriedade intelectual</h2>
          <p className="mt-2">A estrutura, o código, a identidade visual e os conteúdos próprios do aplicativo pertencem ao responsável ou a seus licenciadores. O usuário recebe apenas uma autorização limitada para utilizar o serviço conforme estes Termos.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">9. Lei aplicável e conflitos</h2>
          <p className="mt-2">Estes Termos são regidos pelas leis brasileiras. As partes devem tentar resolver dúvidas ou conflitos inicialmente por meio do canal oficial de contato, sem impedir o exercício de direitos perante as autoridades e os órgãos competentes.</p>
          <p className="mt-2">Antes da publicação, o responsável deve inserir os dados do canal oficial e confirmar com um advogado o foro e a redação aplicáveis ao seu caso.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">10. Contato</h2>
          <p className="mt-2">O responsável pelo aplicativo é Durval Neto. Antes da publicação, informe nesta seção o e-mail ou outro canal oficial para dúvidas, solicitações e notificações.</p>
        </section>
      </div>
    </main>
  )
}
