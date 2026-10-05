import type { StudySet } from '@/domain/models';
import { stripDiacritics } from '@/domain/text';

export interface SetFilters {
  query: string;
  language: string;
  tag: string;
}

export const EMPTY_FILTERS: SetFilters = { query: '', language: '', tag: '' };

function searchable(text: string) {
  return stripDiacritics(text).toLowerCase();
}

/** Filtre les sets par texte (titre ou description, sans accents ni casse), langue et étiquette. */
export function filterSets(sets: readonly StudySet[], filters: SetFilters): StudySet[] {
  const query = searchable(filters.query.trim());
  const tag = filters.tag.toLowerCase();
  return sets.filter((set) => {
    if (query && !searchable(`${set.title} ${set.description}`).includes(query)) return false;
    if (
      filters.language &&
      set.sourceLang !== filters.language &&
      set.targetLang !== filters.language
    )
      return false;
    if (tag && !set.tags.some((value) => value.toLowerCase() === tag)) return false;
    return true;
  });
}

/** Langues et étiquettes présentes dans les sets, pour alimenter les filtres. */
export function collectFilterOptions(sets: readonly StudySet[]) {
  const languages = new Set<string>();
  const tags = new Map<string, string>();
  for (const set of sets) {
    languages.add(set.sourceLang);
    languages.add(set.targetLang);
    for (const tag of set.tags) {
      if (!tags.has(tag.toLowerCase())) tags.set(tag.toLowerCase(), tag);
    }
  }
  return {
    languages: [...languages],
    tags: [...tags.values()].sort((a, b) => a.localeCompare(b, 'fr')),
  };
}
