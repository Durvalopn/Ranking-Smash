import Link from 'next/link'

export const metadata = {
  title: 'Política de Privacidade | App Ranking Smash',
  description: 'Política de privacidade do App Ranking Smash.',
}

export default function PrivacidadePage() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-12 text-slate-900">
      <Link href="/cadastro" className="text-sm font-semibold text-emerald-700 hover:underline">Voltar ao cadastro</Link>
      <h1 className="mt-8 text-3xl font-bold">Política de Privacidade</h1>
      <p className="mt-2 text-sm text-slate-600">Última atualização: 22 de outubro de 2026</p>
      <div className="mt-8 space-y-6 leading-7">
        <section><h2 className="text-xl font-semibold">1. Responsável</h2><p className="mt-2">O responsável pelo App Ranking Smash é Durval Neto. O aplicativo é destinado a usuários no Brasil.</p></section>
        <section><h2 className="text-xl font-semibold">2. Dados tratados</h2><p className="mt-2">Podem ser tratados nome, e-mail, data de nascimento, telefone, classe esportiva, dados de autenticação, temporadas, partidas, resultados, pontuações e classificações associados à conta, além de dados técnicos necessários ao funcionamento e à segurança.</p></section>
        <section><h2 className="text-xl font-semibold">3. Finalidades</h2><p className="mt-2">Os dados são usados para criar e proteger contas, enviar e-mails de autenticação, administrar temporadas e partidas, calcular classificações, prevenir fraude e prestar as funções solicitadas pelo usuário.</p></section>
        <section><h2 className="text-xl font-semibold">4. Serviços utilizados</h2><p className="mt-2">O aplicativo utiliza o Supabase para autenticação e armazenamento de dados. Se o assistente de IA for ativado, as mensagens necessárias poderão ser enviadas à OpenAI conforme a configuração do aplicativo. Confirme esses provedores antes da publicação.</p></section>
        <section><h2 className="text-xl font-semibold">5. E-mails de autenticação</h2><p className="mt-2">O usuário pode receber mensagens operacionais para confirmação de cadastro, recuperação de acesso e outras operações de autenticação. Essas mensagens não são publicidade.</p></section>
        <section><h2 className="text-xl font-semibold">6. Retenção e segurança</h2><p className="mt-2">Os dados devem ser mantidos pelo período necessário às finalidades informadas, obrigações legais, resolução de disputas e proteção do serviço. São adotadas medidas técnicas e administrativas compatíveis com os riscos.</p></section>
        <section><h2 className="text-xl font-semibold">7. Direitos do titular</h2><p className="mt-2">O titular pode solicitar informações sobre o tratamento, confirmação de existência, acesso, correção, atualização, anonimização, bloqueio ou eliminação quando cabível, além de outros direitos previstos na legislação aplicável.</p></section>
        <section><h2 className="text-xl font-semibold">8. Cookies e armazenamento local</h2><p className="mt-2">O aplicativo pode usar cookies ou armazenamento local necessários à autenticação, segurança e funcionamento da sessão. Qualquer analytics ou rastreamento adicional deve ser incluído nesta Política antes de ser ativado.</p></section>
        <section><h2 className="text-xl font-semibold">9. Crianças e adolescentes</h2><p className="mt-2">Antes da publicação, defina a idade mínima de uso e as regras aplicáveis a crianças e adolescentes, considerando a legislação brasileira e a natureza do aplicativo.</p></section>
        <section><h2 className="text-xl font-semibold">10. Contato</h2><p className="mt-2">Responsável: Durval Neto.</p><p className="mt-2">Para solicitações de privacidade, correção ou exclusão de dados: <a className="text-emerald-700 underline" href="mailto:eng.durvalneto@gmail.com">eng.durvalneto@gmail.com</a></p></section>
      </div>
    </main>
  )
}
