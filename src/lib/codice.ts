const ALFABETO = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // niente 0/O/1/I per evitare ambiguità

export function generaCodice(lunghezza = 7): string {
  let codice = "";
  const bytes = crypto.getRandomValues(new Uint32Array(lunghezza));
  for (let i = 0; i < lunghezza; i++) {
    codice += ALFABETO[bytes[i] % ALFABETO.length];
  }
  return codice;
}
