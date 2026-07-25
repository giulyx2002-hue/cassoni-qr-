"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Html5Qrcode } from "html5-qrcode";
import { SchermataCard } from "@/components/SchermataCard";

const REGION_ID = "qr-reader";

function estraiCodice(testo: string): string | null {
  try {
    const url = new URL(testo);
    const parti = url.pathname.split("/").filter(Boolean);
    const idx = parti.indexOf("c");
    if (idx !== -1 && parti[idx + 1]) return parti[idx + 1];
    return null;
  } catch {
    // Non è una URL: trattalo come codice diretto (es. inserito a mano)
    return /^[A-Z0-9]{4,12}$/i.test(testo) ? testo : null;
  }
}

export default function ScansionaPage() {
  const router = useRouter();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [avviato, setAvviato] = useState(false);

  useEffect(() => {
    const scanner = new Html5Qrcode(REGION_ID);
    scannerRef.current = scanner;
    let fermato = false;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (testoDecodificato) => {
          const codice = estraiCodice(testoDecodificato);
          if (!codice || fermato) return;
          fermato = true;
          scanner
            .stop()
            .catch(() => {})
            .finally(() => router.push(`/c/${codice}`));
        },
        undefined
      )
      .then(() => setAvviato(true))
      .catch(() => setErrore("Impossibile accedere alla fotocamera. Controlla i permessi del browser."));

    return () => {
      if (scanner.isScanning) {
        scanner.stop().catch(() => {});
      }
    };
  }, [router]);

  return (
    <SchermataCard>
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-lg shadow-gray-200/50">
        <h1 className="mb-1 text-lg font-semibold text-gray-900">
          Scansiona cassone
        </h1>
        <p className="mb-4 text-sm text-gray-500">
          Inquadra il QR stampato sul cassone
        </p>

        {errore && (
          <p className="mb-4 rounded-lg bg-brand-orange-light px-3 py-2 text-sm text-brand-orange-dark">
            {errore}
          </p>
        )}

        <div id={REGION_ID} className="overflow-hidden rounded-lg bg-black" />

        {!avviato && !errore && (
          <p className="mt-4 text-center text-sm text-gray-500">
            Avvio fotocamera...
          </p>
        )}

        <Link
          href="/"
          className="mt-4 block text-center text-sm text-gray-500 hover:text-gray-900"
        >
          Annulla
        </Link>
      </div>
    </SchermataCard>
  );
}
