import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { Header } from "@/components/Header";
import { ImportaClient } from "./ImportaClient";

export default async function ImportaPage() {
  const profile = await getCurrentProfile();

  if (!profile || profile.ruolo !== "admin") {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Header profile={profile} />
      <ImportaClient />
    </div>
  );
}
