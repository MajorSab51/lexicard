import { emptyCardContent, type Card, type CardContent } from '@/domain/models';
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

/** Carte complète telle qu'enregistrée, sans passer par la couche données. */
export function aStoredCard(id: string, overrides: Partial<Card> = {}): Card {
  return {
    ...emptyCardContent(),
    id,
    userId: null,
    setId: 'set',
    term: id,
    translation: id.toUpperCase(),
    order: 0,
    favorite: false,
    difficult: false,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}
