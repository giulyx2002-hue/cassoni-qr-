import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";

function escapeHtml(testo: string): string {
  return testo
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const { email, pdfUrl, codice, cliente } = await request.json();

  if (!email || !pdfUrl || !codice) {
    return NextResponse.json({ error: "Dati mancanti" }, { status: 400 });
  }

  const prefissoStorageConsentito = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/documenti-movimento/`;
  if (typeof pdfUrl !== "string" || !pdfUrl.startsWith(prefissoStorageConsentito)) {
    return NextResponse.json({ error: "URL del PDF non valido" }, { status: 400 });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: "Servizio email non configurato (RESEND_API_KEY mancante)" },
      { status: 500 }
    );
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
    to: email,
    subject: `Conferma consegna cassone ${escapeHtml(String(codice))}`,
    html: `
      <p>Gentile ${escapeHtml(String(cliente || "cliente"))},</p>
      <p>in allegato trovi il documento di consegna del cassone <strong>${escapeHtml(String(codice))}</strong>,
      con lo stato rilevato e la firma raccolta al momento della consegna.</p>
      <p>Morgan's — economia circolare</p>
    `,
    attachments: [{ path: pdfUrl, filename: `consegna-${codice}.pdf` }],
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
