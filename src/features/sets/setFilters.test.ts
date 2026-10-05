import type { StudySet } from '@/domain/models';
import { collectFilterOptions, EMPTY_FILTERS, filterSets } from './setFilters';

const aSet = (id: string, overrides: Partial<StudySet> = {}): StudySet => ({
  id,
  userId: null,
  title: id,
  description: '',
  sourceLang: 'en',
  targetLang: 'fr',
  color: 'teal',
  tags: [],
  createdAt: '',
  updatedAt: '',
  ...overrides,
});

const sets = [
  aSet('Anglais : animaux', { tags: ['B1', 'nature'] }),
  aSet('Espagnol : vacances', { sourceLang: 'es', description: 'Vocabulaire de l’été' }),
  aSet('Allemand', { sourceLang: 'de', tags: ['b1'] }),
];
const titles = (result: StudySet[]) => result.map((set) => set.title);

describe('filterSets', () => {
  it('ne filtre rien sans critère', () => {
    expect(filterSets(sets, EMPTY_FILTERS)).toHaveLength(3);
  });

  it('cherche dans le titre et la description, sans accents ni casse', () => {
    expect(titles(filterSets(sets, { ...EMPTY_FILTERS, query: 'ANIMAUX' }))).toEqual([
      'Anglais : animaux',
    ]);
    expect(titles(filterSets(sets, { ...EMPTY_FILTERS, query: 'ete' }))).toEqual([
      'Espagnol : vacances',
    ]);
  });

  it('filtre par langue (termes ou traductions) et par étiquette', () => {
    expect(titles(filterSets(sets, { ...EMPTY_FILTERS, language: 'es' }))).toEqual([
      'Espagnol : vacances',
    ]);
    expect(filterSets(sets, { ...EMPTY_FILTERS, language: 'fr' })).toHaveLength(3);
    expect(titles(filterSets(sets, { ...EMPTY_FILTERS, tag: 'b1' }))).toEqual([
      'Anglais : animaux',
      'Allemand',
    ]);
  });
});

describe('collectFilterOptions', () => {
  it('liste les langues et étiquettes sans doublons', () => {
    const options = collectFilterOptions(sets);
    expect(options.languages.sort()).toEqual(['de', 'en', 'es', 'fr']);
    expect(options.tags).toEqual(['B1', 'nature']);
  });
});
