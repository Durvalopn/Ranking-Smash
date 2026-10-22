import SectionEmptyState from "@/components/SectionEmptyState";

export const metadata = { title: "Notificações | Ranking Smash" };

export default function NotificacoesPage() {
  return (
    <SectionEmptyState
      title="Notificações"
      description="Acompanhe avisos e atualizações importantes do Ranking Smash."
      emptyMessage="Você não tem notificações novas."
    />
  );
}
