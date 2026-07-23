import { MovimentoForm } from "./MovimentoForm";

export default async function CassonePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  return <MovimentoForm codice={code} />;
}
