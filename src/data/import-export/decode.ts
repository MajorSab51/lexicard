/**
 * Décode le contenu d'un fichier texte. On essaie l'UTF-8 strict ; en cas d'échec,
 * on suppose un export Excel en Windows-1252, encore fréquent sous Windows en français.
 */
export function decodeText(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(view);
  } catch {
    text = new TextDecoder('windows-1252').decode(view);
  }
  return text.replace(/^\uFEFF/, '');
}

export async function readFileText(file: Blob): Promise<string> {
  return decodeText(await file.arrayBuffer());
}
