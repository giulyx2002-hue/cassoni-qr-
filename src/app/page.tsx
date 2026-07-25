import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth";
import { Header } from "@/components/Header";

const ICONE: Record<string, React.ReactNode> = {
  scansiona: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} stroke="currentColor" className="h-6 w-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7V5a1 1 0 0 1 1-1h2M20 7V5a1 1 0 0 0-1-1h-2M4 17v2a1 1 0 0 0 1 1h2M20 17v2a1 1 0 0 1-1 1h-2M7 12h10" />
    </svg>
  ),
  genera: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} stroke="currentColor" className="h-6 w-6">
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <path strokeLinecap="round" d="M15 15h2m2 0h2M15 19h6M17 15v6" />
    </svg>
  ),
  dashboard: (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} stroke="currentColor" className="h-6 w-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 20V10M15 20V4M4 20h16" />
    </svg>
  ),
};

export default async function HomePage() {
  const profile = await getCurrentProfile();

  const voci = [
    {
      href: "/scansiona",
      icona: "scansiona",
      titolo: "Scansiona cassone",
      descrizione: "Leggi il QR di un cassone e registra posizione e dettagli",
    },
    {
      href: "/genera",
      icona: "genera",
      titolo: "Genera nuovo QR",
      descrizione: "Crea un nuovo cassone e stampa il suo codice QR",
    },
  ];

  if (profile?.ruolo === "admin") {
    voci.push({
      href: "/dashboard",
      icona: "dashboard",
      titolo: "Dashboard",
      descrizione: "Vedi la posizione di tutti i cassoni in tempo reale",
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-green-light/60 to-gray-50">
      <Header profile={profile} />
      <main className="mx-auto max-w-md px-4 py-10">
        <p className="mb-6 text-sm text-gray-500">
          Ciao{profile ? `, ${profile.nome.split("@")[0]}` : ""} 👋 cosa vuoi fare?
        </p>
        <div className="space-y-3">
          {voci.map((voce) => (
            <Link
              key={voce.href}
              href={voce.href}
              className="group flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-green-light text-brand-green-dark transition-colors group-hover:bg-brand-green group-hover:text-white">
                {ICONE[voce.icona]}
              </span>
              <span>
                <p className="font-medium text-gray-900">{voce.titolo}</p>
                <p className="mt-0.5 text-sm text-gray-500">{voce.descrizione}</p>
              </span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
