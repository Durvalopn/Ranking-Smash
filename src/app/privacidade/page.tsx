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
          <h2 className="text-xl font-semibold">1. Responsável pelo tratamento</h2>
          <p className="mt-2">O responsável informado para o App Ranking Smash é Durval Neto. O aplicativo é destinado a usuários no Brasil. Antes da publicação, informe o e-mail ou canal oficial para solicitações relacionadas a dados pessoais.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">2. Dados tratados</h2>
          <p className="mt-2">Para criar e administrar a conta, o aplicativo pode tratar nome completo, e-mail, data de nascimento, telefone, classe esportiva e dados de autenticação.</p>
          <p className="mt-2">Durante o uso, também podem ser tratados dados de temporadas, partidas, resultados, pontuações e classificações associados à conta. O aplicativo pode processar dados técnicos necessários à segurança e ao funcionamento do serviço, conforme sua configuração.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">3. Finalidades</h2>
          <p className="mt-2">Os dados são usados para criar e proteger contas, enviar mensagens de autenticação, administrar temporadas e partidas, calcular classificações, prevenir fraude, manter a segurança e prestar as funções solicitadas pelo usuário.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">4. Bases e compartilhamento</h2>
          <p className="mt-2">O tratamento deve ocorrer conforme as bases legais aplicáveis da legislação brasileira, incluindo execução do serviço solicitado, cumprimento de obrigações legais, exercício regular de direitos e, quando necessário, consentimento.</p>
          <p className="mt-2">O aplicativo utiliza o Supabase para autenticação e armazenamento de dados. Se a função de assistente de IA for ativada, as mensagens necessárias para essa função poderão ser enviadas à OpenAI, conforme a configuração do aplicativo e os termos aplicáveis ao serviço. Antes da publicação, confirme e atualize esta seção de acordo com os provedores realmente utilizados.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">5. E-mails de autenticação</h2>
          <p className="mt-2">O usuário pode receber e-mails necessários para confirmação de cadastro, recuperação de acesso e outras operações de autenticação. Essas mensagens são operacionais e não equivalem a publicidade.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">6. Retenção e segurança</h2>
          <p className="mt-2">Os dados devem ser mantidos pelo período necessário para cumprir as finalidades informadas, atender obrigações legais, resolver disputas e proteger o serviço. São adotadas medidas técnicas e administrativas compatíveis com os riscos, mas nenhum serviço conectado à internet é completamente imune a incidentes.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">7. Direitos do titular</h2>
          <p className="mt-2">Nos termos da legislação aplicável, o titular pode solicitar informações sobre o tratamento, confirmação de existência, acesso, correção, atualização, anonimização, bloqueio ou eliminação quando cabível, além de outros direitos previstos em lei. As solicitações devem ser feitas pelo canal oficial informado nesta página.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">8. Cookies e armazenamento local</h2>
          <p className="mt-2">O aplicativo pode utilizar cookies ou armazenamento local necessários para autenticação, segurança e funcionamento da sessão. Antes da publicação, descreva aqui qualquer ferramenta de analytics, publicidade ou rastreamento adicional que venha a ser ativada.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">9. Crianças e adolescentes</h2>
          <p className="mt-2">Antes da publicação, o responsável deve definir a idade mínima de uso e as regras aplicáveis a crianças e adolescentes, considerando a legislação brasileira e a natureza das atividades esportivas do aplicativo.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">10. Alterações</h2>
          <p className="mt-2">Esta Política pode ser atualizada para refletir mudanças no aplicativo, nos provedores ou na legislação. A data da última atualização será informada no início desta página.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold">11. Contato</h2>
          <p className="mt-2">O responsável pelo aplicativo é Durval Neto. Antes da publicação, informe o e-mail ou canal oficial para solicitações de privacidade, correção, exclusão e demais direitos do titular.</p>
        </section>
      </div>
    </main>
  )
}
