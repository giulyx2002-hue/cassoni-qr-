import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth";
import { Header } from "@/components/Header";

export default async function HomePage() {
  const profile = await getCurrentProfile();

  const voci = [
    {
      href: "/scansiona",
      titolo: "Scansiona cassone",
      descrizione: "Leggi il QR di un cassone e registra posizione e dettagli",
    },
    {
      href: "/genera",
      titolo: "Genera nuovo QR",
      descrizione: "Crea un nuovo cassone e stampa il suo codice QR",
    },
  ];

  if (profile?.ruolo === "admin") {
    voci.push({
      href: "/dashboard",
      titolo: "Dashboard",
      descrizione: "Vedi la posizione di tutti i cassoni in tempo reale",
    });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header profile={profile} />
      <main className="mx-auto max-w-md px-4 py-8">
        <div className="space-y-3">
          {voci.map((voce) => (
            <Link
              key={voce.href}
              href={voce.href}
              className="block rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:border-gray-300"
            >
              <p className="font-medium text-gray-900">{voce.titolo}</p>
              <p className="mt-1 text-sm text-gray-500">{voce.descrizione}</p>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
