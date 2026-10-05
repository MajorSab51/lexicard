import { emptyCardContent, type CardContent } from '@/domain/models';
import type { SetInput } from '@/data/setsRepository';

export function aSetInput(overrides: Partial<SetInput> = {}): SetInput {
  return {
    title: 'Anglais : animaux',
    description: '',
    sourceLang: 'en',
    targetLang: 'fr',
    color: 'teal',
    tags: [],
    ...overrides,
  };
}

export function aCard(
  term: string,
  translation: string,
  extra: Partial<CardContent> = {},
): CardContent {
  return { ...emptyCardContent(), term, translation, ...extra };
}
