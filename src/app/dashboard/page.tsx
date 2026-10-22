import { redirect } from "next/navigation";

import AthleteDashboard from "@/components/AthleteDashboard";
import Navigation from "@/components/Navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Dashboard",
  description: "Acompanhe seus confrontos, resultados e classificação.",
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/dashboard");
  }

  const [{ data: profile }, { data: athlete }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("athletes")
      .select("current_class, status")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const athleteStatus = athlete?.status === "licensed" ? "licensed" : "active";

  return (
    <>
      <Navigation />
      <AthleteDashboard
        athleteName={profile?.full_name ?? user.email?.split("@")[0] ?? "Atleta Smash"}
        athleteClass={athlete?.current_class ?? 6}
        athleteStatus={athleteStatus}
      />
    </>
  );
}
