import { stripDiacritics } from '@/domain/text';

/** Propose le téléchargement d'un fichier généré dans le navigateur (aucun envoi réseau). */
export function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.append(link);
  link.click();
  link.remove();
  // Laisse le temps au navigateur de démarrer le téléchargement avant de libérer l'URL.
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

/** Transforme un titre en nom de fichier sûr : « Anglais : animaux » → « anglais-animaux ». */
export function slugify(text: string, fallback = 'export'): string {
  const slug = stripDiacritics(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return slug || fallback;
}

/** Date locale au format AAAA-MM-JJ, pour les noms de fichiers. */
export function todayStamp(date = new Date()): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}
