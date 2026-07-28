import { NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(request: Request) {
  const { email, pdfUrl, codice, cliente } = await request.json();

  if (!email || !pdfUrl || !codice) {
    return NextResponse.json({ error: "Dati mancanti" }, { status: 400 });
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
    subject: `Conferma consegna cassone ${codice}`,
    html: `
      <p>Gentile ${cliente || "cliente"},</p>
      <p>in allegato trovi il documento di consegna del cassone <strong>${codice}</strong>,
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
