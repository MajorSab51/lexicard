import { checkAnswer, normalizeAnswer, type AnswerTolerance, type AnswerVerdict } from './answers';
import { cardFaces, type CardFace } from './flashcards';
import type { Card, Id } from './models';
import { shuffle } from './random';

/*
 * Génération et correction des tests. Chaque carte testée donne un point :
 * une question d'association regroupe plusieurs cartes, chacune notée séparément.
 * Tout est tiré au sort à chaque test : les cartes, le type de question de chacune,
 * l'ordre des questions et les propositions.
 */

/** Types de questions, du plus simple au plus exigeant (ordre des options du test). */
export const QUESTION_TYPES = ['trueFalse', 'multipleChoice', 'matching', 'written'] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const TEST_COUNT = { min: 1, max: 100, default: 10 } as const;
export const CHOICES_PER_QUESTION = 4;
export const MATCHING_GROUP_SIZE = 5;

export interface TestOptions {
  /** Nombre de cartes testées (limité par la taille du set). */
  count: number;
  types: QuestionType[];
  /** Montrer la traduction et demander le terme. */
  reversed: boolean;
}

export const DEFAULT_TEST_OPTIONS: TestOptions = {
  count: TEST_COUNT.default,
  types: [...QUESTION_TYPES],
  reversed: false,
};

export function isTestOptions(value: unknown): value is TestOptions {
  if (typeof value !== 'object' || value === null) return false;
  const { count, types, reversed } = value as Record<string, unknown>;
  return (
    typeof count === 'number' &&
    Number.isInteger(count) &&
    count >= TEST_COUNT.min &&
    count <= TEST_COUNT.max &&
    typeof reversed === 'boolean' &&
    Array.isArray(types) &&
    types.length > 0 &&
    types.every((type) => (QUESTION_TYPES as readonly string[]).includes(type as string))
  );
}

export interface MatchingItem {
  cardId: Id;
  prompt: CardFace;
  /** Indice de la bonne réponse dans `choices`. */
  answer: number;
}

export type TestQuestion =
  | {
      kind: 'trueFalse';
      cardId: Id;
      prompt: CardFace;
      proposed: CardFace;
      answer: CardFace;
      isTrue: boolean;
    }
  | { kind: 'multipleChoice'; cardId: Id; prompt: CardFace; choices: CardFace[]; answer: number }
  | { kind: 'matching'; items: MatchingItem[]; choices: CardFace[] }
  | { kind: 'written'; cardId: Id; prompt: CardFace; expected: CardFace };

export interface GeneratedTest {
  questions: TestQuestion[];
  /** Cartes testées, dans l'ordre d'apparition. */
  cardIds: Id[];
}

interface Langs {
  sourceLang: string;
  targetLang: string;
}

interface GenerateInput {
  /** Toutes les cartes du set : les mauvaises réponses proposées y sont tirées. */
  cards: readonly Card[];
  langs: Langs;
  options: TestOptions;
  /** Limite le test à ces cartes (relance avec les cartes ratées). */
  onlyCardIds?: readonly Id[];
  random?: () => number;
}

const answerKey = (face: CardFace) => normalizeAnswer(face.text, false);

/**
 * Choix des types : répartition aussi égale que possible, en écartant ceux que le set ne
 * permet pas. L'ordre des types est tiré au sort, pour que les questions en surplus
 * n'aillent pas toujours aux mêmes types.
 */
function assignTypes(
  count: number,
  options: TestOptions,
  distinctAnswers: number,
  random: () => number,
): QuestionType[] {
  const feasible = QUESTION_TYPES.filter(
    (type) =>
      options.types.includes(type) &&
      (type === 'written' || type === 'matching' || distinctAnswers >= 2) &&
      (type !== 'matching' || count >= 2),
  );
  const types: QuestionType[] = shuffle(feasible.length > 0 ? feasible : ['written'], random);
  const assigned = Array.from({ length: count }, (_, i) => types[i % types.length] ?? 'written');

  // Une association demande au moins deux cartes : sinon, la carte change de type.
  if (assigned.filter((type) => type === 'matching').length === 1) {
    const fallback = types.find((type) => type !== 'matching') ?? 'written';
    return assigned.map((type) => (type === 'matching' ? fallback : type));
  }
  return assigned;
}

/** Groupes d'association de 2 à `MATCHING_GROUP_SIZE` + 1 cartes. */
function chunkMatching<T>(items: T[]): T[][] {
  const groups: T[][] = [];
  for (let i = 0; i < items.length; i += MATCHING_GROUP_SIZE) {
    groups.push(items.slice(i, i + MATCHING_GROUP_SIZE));
  }
  const last = groups.at(-1);
  const previous = groups.at(-2);
  if (last && previous && last.length === 1) {
    previous.push(...last);
    groups.pop();
  }
  return groups;
}

export function generateTest({
  cards,
  langs,
  options,
  onlyCardIds,
  random = Math.random,
}: GenerateInput): GeneratedTest {
  const faces = new Map(cards.map((card) => [card.id, cardFaces(card, langs, options.reversed)]));
  const only = onlyCardIds ? new Set(onlyCardIds) : null;
  const candidates = cards.filter((card) => !only || only.has(card.id));
  const selected = shuffle(candidates, random).slice(0, Math.max(0, options.count));

  // Réponses distinctes du set, pour les propositions erronées.
  const pool = new Map<string, CardFace>();
  for (const { back } of faces.values())
    if (!pool.has(answerKey(back))) pool.set(answerKey(back), back);
  const otherAnswers = (answer: CardFace) =>
    shuffle(
      [...pool.entries()].filter(([key]) => key !== answerKey(answer)).map(([, face]) => face),
      random,
    );

  const types = assignTypes(selected.length, options, pool.size, random);
  const byType = new Map<QuestionType, TestQuestion[]>(QUESTION_TYPES.map((type) => [type, []]));
  const matchingCards: Card[] = [];

  selected.forEach((card, index) => {
    const type = types[index] ?? 'written';
    const face = faces.get(card.id);
    if (!face) return;
    const { front: prompt, back: answer } = face;
    switch (type) {
      case 'trueFalse': {
        const isTrue = random() < 0.5;
        const proposed = isTrue ? answer : (otherAnswers(answer)[0] ?? answer);
        byType.get(type)?.push({
          kind: type,
          cardId: card.id,
          prompt,
          proposed,
          answer,
          isTrue: isTrue || proposed === answer,
        });
        break;
      }
      case 'multipleChoice': {
        const choices = shuffle(
          [answer, ...otherAnswers(answer).slice(0, CHOICES_PER_QUESTION - 1)],
          random,
        );
        byType.get(type)?.push({
          kind: type,
          cardId: card.id,
          prompt,
          choices,
          answer: choices.indexOf(answer),
        });
        break;
      }
      case 'matching':
        matchingCards.push(card);
        break;
      case 'written':
        byType.get(type)?.push({ kind: type, cardId: card.id, prompt, expected: answer });
        break;
    }
  });

  for (const group of chunkMatching(matchingCards)) {
    // Deux cartes de même réponse partagent un seul choix.
    const choiceByKey = new Map<string, CardFace>();
    for (const card of group) {
      const answer = faces.get(card.id)?.back;
      if (answer && !choiceByKey.has(answerKey(answer))) choiceByKey.set(answerKey(answer), answer);
    }
    const choices = shuffle([...choiceByKey.values()], random);
    const keys = choices.map(answerKey);
    const items = group.flatMap((card): MatchingItem[] => {
      const face = faces.get(card.id);
      return face
        ? [{ cardId: card.id, prompt: face.front, answer: keys.indexOf(answerKey(face.back)) }]
        : [];
    });
    byType.get('matching')?.push({ kind: 'matching', items, choices });
  }

  // Types mélangés : l'ordre des questions change d'un test à l'autre.
  const questions = shuffle([...byType.values()].flat(), random);
  return { questions, cardIds: questions.flatMap(questionCardIds) };
}

export function questionCardIds(question: TestQuestion): Id[] {
  return question.kind === 'matching'
    ? question.items.map((item) => item.cardId)
    : [question.cardId];
}

/** Réponse donnée pour une carte : indice choisi, vrai/faux ou texte saisi. */
export type TestResponse = number | boolean | string;
export type TestResponses = Readonly<Partial<Record<Id, TestResponse>>>;

export interface ItemResult {
  cardId: Id;
  kind: QuestionType;
  correct: boolean;
  /** Correction détaillée d'une réponse écrite (`null` pour les autres types). */
  verdict: AnswerVerdict | null;
  given: TestResponse | undefined;
  prompt: CardFace;
  /** Bonne réponse. */
  expected: CardFace;
}

export interface TestResult {
  items: ItemResult[];
  correct: number;
  total: number;
  /** Pourcentage arrondi à l'unité. */
  percent: number;
}

function gradeQuestion(
  question: TestQuestion,
  responses: TestResponses,
  tolerance: AnswerTolerance,
): ItemResult[] {
  switch (question.kind) {
    case 'trueFalse': {
      const given = responses[question.cardId];
      return [
        {
          cardId: question.cardId,
          kind: question.kind,
          correct: given === question.isTrue,
          verdict: null,
          given,
          prompt: question.prompt,
          expected: question.answer,
        },
      ];
    }
    case 'multipleChoice': {
      const given = responses[question.cardId];
      return [
        {
          cardId: question.cardId,
          kind: question.kind,
          correct: given === question.answer,
          verdict: null,
          given,
          prompt: question.prompt,
          expected: question.choices[question.answer] ?? question.prompt,
        },
      ];
    }
    case 'matching':
      return question.items.map((item) => {
        const given = responses[item.cardId];
        return {
          cardId: item.cardId,
          kind: question.kind,
          correct: given === item.answer,
          verdict: null,
          given,
          prompt: item.prompt,
          expected: question.choices[item.answer] ?? item.prompt,
        };
      });
    case 'written': {
      const given = responses[question.cardId];
      const verdict =
        typeof given === 'string' ? checkAnswer(given, question.expected.text, tolerance) : 'wrong';
      return [
        {
          cardId: question.cardId,
          kind: question.kind,
          // « Presque correct » compte comme juste ; la correction reste affichée.
          correct: verdict !== 'wrong',
          verdict,
          given,
          prompt: question.prompt,
          expected: question.expected,
        },
      ];
    }
  }
}

/** Corrige un test : une réponse absente compte comme fausse. */
export function gradeTest(
  test: GeneratedTest,
  responses: TestResponses,
  tolerance: AnswerTolerance,
): TestResult {
  const items = test.questions.flatMap((question) => gradeQuestion(question, responses, tolerance));
  const correct = items.filter((item) => item.correct).length;
  const total = items.length;
  return { items, correct, total, percent: total === 0 ? 0 : Math.round((correct / total) * 100) };
}
