import { jsPDF } from "jspdf";
import { TIPI_OPERAZIONE, type TipoOperazione } from "@/lib/types";

interface DatiConsegna {
  codiceCassone: string;
  cliente: string;
  clienteEmail: string;
  targa: string;
  nomeAutista: string;
  tipoOperazione: TipoOperazione;
  dimensioni: string;
  note: string;
  lat: number;
  lng: number;
  foto: File[];
  firmaBlob: Blob;
  firmaAutistaBlob: Blob;
  dataOra: Date;
}

function blobADataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function dimensioniImmagine(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.src = dataUrl;
  });
}

export async function generaPdfConsegna(dati: DatiConsegna): Promise<Blob> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const marginX = 18;
  const larghezzaPagina = 210;
  const altezzaPagina = 297;
  let y = 20;

  try {
    const logoDataUrl = await fetch("/logo-morgans.png")
      .then((r) => r.blob())
      .then(blobADataUrl);
    doc.addImage(logoDataUrl, "PNG", marginX, y, 45, 11.25);
  } catch {
    // se il logo non è disponibile, si procede senza
  }

  y += 22;
  doc.setFontSize(14);
  doc.setTextColor(20, 20, 20);
  doc.text(`Documento di consegna - Cassone ${dati.codiceCassone}`, marginX, y);

  y += 10;
  doc.setFontSize(10);

  const riga = (etichetta: string, valore: string) => {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(80, 80, 80);
    doc.text(`${etichetta}:`, marginX, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(20, 20, 20);
    doc.text(valore || "-", marginX + 40, y);
    y += 7;
  };

  riga("Data e ora", dati.dataOra.toLocaleString("it-IT"));
  riga("Cliente", dati.cliente || "-");
  riga("Email cliente", dati.clienteEmail);
  riga("Targa camion", dati.targa);
  riga("Nome autista", dati.nomeAutista);
  riga(
    "Tipo operazione",
    TIPI_OPERAZIONE.find((t) => t.value === dati.tipoOperazione)?.label ?? dati.tipoOperazione
  );
  riga("Dimensioni", dati.dimensioni || "-");
  riga("Posizione GPS", `${dati.lat.toFixed(5)}, ${dati.lng.toFixed(5)}`);

  if (dati.note) {
    y += 2;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(80, 80, 80);
    doc.text("Note:", marginX, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(20, 20, 20);
    const righeNote = doc.splitTextToSize(dati.note, larghezzaPagina - marginX * 2);
    doc.text(righeNote, marginX, y);
    y += righeNote.length * 5 + 4;
  }

  if (dati.foto.length > 0) {
    y += 4;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20, 20, 20);
    doc.text("Foto stato cassone", marginX, y);
    y += 6;

    const box = 42;
    const gap = 4;
    let x = marginX;

    for (const file of dati.foto) {
      if (x + box > larghezzaPagina - marginX) {
        x = marginX;
        y += box + gap;
      }
      if (y + box > altezzaPagina - 20) {
        doc.addPage();
        y = 20;
        x = marginX;
      }

      const dataUrl = await blobADataUrl(file);
      const { width, height } = await dimensioniImmagine(dataUrl);
      const scala = Math.min(box / width, box / height);
      const w = width * scala;
      const h = height * scala;
      const formato = file.type.includes("png") ? "PNG" : "JPEG";

      doc.addImage(dataUrl, formato, x + (box - w) / 2, y + (box - h) / 2, w, h);
      doc.setDrawColor(220);
      doc.rect(x, y, box, box);
      x += box + gap;
    }
    y += box + gap + 6;
  }

  if (y > altezzaPagina - 55) {
    doc.addPage();
    y = 20;
  }

  const boxFirma = 70;
  const altezzaFirma = 25;
  const gapFirme = 14;
  const xFirmaAutista = marginX + boxFirma + gapFirme;

  doc.setFont("helvetica", "bold");
  doc.setTextColor(20, 20, 20);
  doc.text("Firma autista", marginX, y);
  doc.text("Firma cliente", xFirmaAutista, y);
  y += 4;

  const firmaAutistaDataUrl = await blobADataUrl(dati.firmaAutistaBlob);
  doc.addImage(firmaAutistaDataUrl, "PNG", marginX, y, boxFirma, altezzaFirma);
  doc.setDrawColor(200);
  doc.rect(marginX, y, boxFirma, altezzaFirma);

  const firmaDataUrl = await blobADataUrl(dati.firmaBlob);
  doc.addImage(firmaDataUrl, "PNG", xFirmaAutista, y, boxFirma, altezzaFirma);
  doc.rect(xFirmaAutista, y, boxFirma, altezzaFirma);

  y += altezzaFirma + 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(dati.nomeAutista || "autista", marginX, y);
  doc.text(dati.cliente || "cliente", xFirmaAutista, y);
  y += 5;
  doc.text(`Firmato digitalmente il ${dati.dataOra.toLocaleString("it-IT")}`, marginX, y);

  return doc.output("blob");
}
