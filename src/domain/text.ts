/** Retire les accents et signes diacritiques (é → e, ñ → n, ü → u). */
export function stripDiacritics(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '')
    .normalize('NFC');
}

/** Nettoie une saisie : espaces superflus retirés et normalisation Unicode NFC. */
export function cleanText(text: string): string {
  return text.normalize('NFC').replace(/\s+/g, ' ').trim();
}

/**
 * Clé de comparaison d'un terme pour la détection des doublons :
 * insensible à la casse et aux espaces superflus, mais sensible aux accents
 * (« pêche » et « pèche » sont deux mots différents).
 */
export function termKey(term: string): string {
  return cleanText(term).toLocaleLowerCase();
}
