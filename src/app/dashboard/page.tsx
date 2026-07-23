import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/Header";
import { DashboardClient } from "./DashboardClient";
import type { UltimaPosizione } from "@/lib/types";

export default async function DashboardPage() {
  const profile = await getCurrentProfile();

  if (!profile || profile.ruolo !== "admin") {
    redirect("/");
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("ultima_posizione")
    .select("*")
    .order("ultimo_movimento", { ascending: false });

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Header profile={profile} />
      <DashboardClient posizioniIniziali={(data as UltimaPosizione[]) ?? []} />
    </div>
  );
}
