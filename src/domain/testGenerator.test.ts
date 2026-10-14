import { aStoredCard } from '@/test/factories';
import { seeded } from '@/test/random';
import { DEFAULT_ANSWER_TOLERANCE } from './answers';
import type { Card } from './models';
import {
  DEFAULT_TEST_OPTIONS,
  generateTest,
  gradeTest,
  isTestOptions,
  questionCardIds,
  type GeneratedTest,
  type QuestionType,
  type TestOptions,
  type TestQuestion,
  type TestResponses,
} from './testGenerator';

const langs = { sourceLang: 'en', targetLang: 'fr' };
const words = [
  ['cat', 'chat'],
  ['dog', 'chien'],
  ['owl', 'hibou'],
  ['fox', 'renard'],
  ['cow', 'vache'],
  ['pig', 'cochon'],
  ['hen', 'poule'],
  ['bee', 'abeille'],
  ['ant', 'fourmi'],
  ['bat', 'chauve-souris'],
  ['elk', 'élan'],
  ['yak', 'yack'],
] as const;
const cards: Card[] = words.map(([term, translation], order) =>
  aStoredCard(term, { term, translation, order }),
);

const make = (
  options: Partial<TestOptions> = {},
  input: Partial<{ cards: Card[]; seed: number }> = {},
) =>
  generateTest({
    cards: input.cards ?? cards,
    langs,
    options: { ...DEFAULT_TEST_OPTIONS, ...options },
    random: seeded(input.seed ?? 1),
  });

const ofKind = <K extends QuestionType>(test: GeneratedTest, kind: K) =>
  test.questions.filter((q): q is Extract<TestQuestion, { kind: K }> => q.kind === kind);

/** Réponses parfaites pour un test donné. */
function perfectResponses(test: GeneratedTest): TestResponses {
  const responses: Record<string, string | number | boolean> = {};
  for (const question of test.questions) {
    if (question.kind === 'trueFalse') responses[question.cardId] = question.isTrue;
    if (question.kind === 'multipleChoice') responses[question.cardId] = question.answer;
    if (question.kind === 'written') responses[question.cardId] = question.expected.text;
    if (question.kind === 'matching') {
      for (const item of question.items) responses[item.cardId] = item.answer;
    }
  }
  return responses;
}

describe('génération d’un test', () => {
  it('teste le nombre de cartes demandé, chacune une seule fois', () => {
    const test = make({ count: 8 });
    expect(test.cardIds).toHaveLength(8);
    expect(new Set(test.cardIds).size).toBe(8);
    expect(make({ count: 50 }).cardIds).toHaveLength(cards.length);
  });

  it('répartit les cartes à parts égales entre les types activés', () => {
    const test = make({ count: 12 });
    for (const kind of ['trueFalse', 'multipleChoice', 'written'] as const) {
      expect(ofKind(test, kind)).toHaveLength(3);
    }
    expect(ofKind(test, 'matching').flatMap((q) => q.items)).toHaveLength(3);
  });

  it('tire au sort les cartes, leur type et l’ordre des questions à chaque test', () => {
    const describeTest = (test: GeneratedTest) =>
      test.questions.map((q) => `${q.kind}:${questionCardIds(q).join('+')}`).join(' ');
    const tests = [1, 2, 3, 4, 5].map((seed) => make({ count: 8 }, { seed }));

    expect(new Set(tests.map(describeTest)).size).toBe(tests.length);
    // Les types sont mélangés : pas de sections dans un ordre fixe.
    const kindOrders = tests.map((test) => [...new Set(test.questions.map((q) => q.kind))].join());
    expect(new Set(kindOrders).size).toBeGreaterThan(1);
  });

  it('change de test en test les types qui reçoivent les questions en surplus', () => {
    // 5 cartes pour 3 types : deux types ont 2 questions, le troisième 1.
    const types = ['trueFalse', 'multipleChoice', 'written'] as const;
    const smallest = [1, 2, 3, 4, 5, 6].map((seed) => {
      const test = make({ count: 5, types: [...types] }, { seed });
      return types.find((kind) => ofKind(test, kind).length === 1);
    });
    expect(new Set(smallest).size).toBeGreaterThan(1);
  });

  it('ne génère que les types choisis', () => {
    const test = make({ count: 6, types: ['written'] });
    expect(test.questions.every((q) => q.kind === 'written')).toBe(true);
  });

  it('propose quatre choix distincts tirés du même set, dont la bonne réponse', () => {
    for (const question of ofKind(
      make({ count: 12, types: ['multipleChoice'] }),
      'multipleChoice',
    )) {
      const texts = question.choices.map((choice) => choice.text);
      expect(texts).toHaveLength(4);
      expect(new Set(texts).size).toBe(4);
      const card = cards.find((c) => c.id === question.cardId);
      expect(texts[question.answer]).toBe(card?.translation);
      expect(question.prompt).toEqual({ text: card?.term, lang: 'en' });
    }
  });

  it('propose une vraie ou une fausse traduction en vrai ou faux', () => {
    const questions = ofKind(make({ count: 12, types: ['trueFalse'] }), 'trueFalse');
    expect(questions.some((q) => q.isTrue)).toBe(true);
    expect(questions.some((q) => !q.isTrue)).toBe(true);
    for (const question of questions) {
      expect(question.proposed.text === question.answer.text).toBe(question.isTrue);
    }
  });

  it('regroupe les associations par cinq, sans groupe d’une seule carte', () => {
    const groups = ofKind(make({ count: 11, types: ['matching'] }), 'matching');
    expect(groups.map((g) => g.items.length).sort()).toEqual([5, 6]);
    for (const group of groups) {
      for (const item of group.items) {
        const card = cards.find((c) => c.id === item.cardId);
        expect(group.choices[item.answer]?.text).toBe(card?.translation);
      }
    }
  });

  it('inverse le sens sur demande', () => {
    const [question] = ofKind(make({ count: 1, types: ['written'], reversed: true }), 'written');
    const card = cards.find((c) => c.id === question?.cardId);
    expect(question?.prompt).toEqual({ text: card?.translation, lang: 'fr' });
    expect(question?.expected).toEqual({ text: card?.term, lang: 'en' });
  });

  it('se replie sur la réponse écrite quand le set est trop petit', () => {
    const single = make({ count: 5 }, { cards: cards.slice(0, 1) });
    expect(single.questions.map((q) => q.kind)).toEqual(['written']);
    // Une seule carte en association : elle prend un autre type.
    const two = make({ count: 2, types: ['matching', 'written'] }, { cards: cards.slice(0, 2) });
    expect(two.questions.map((q) => q.kind)).toEqual(['written', 'written']);
  });

  it('ne teste que les cartes demandées, mais tire les propositions de tout le set', () => {
    const test = generateTest({
      cards,
      langs,
      options: { ...DEFAULT_TEST_OPTIONS, types: ['multipleChoice'] },
      onlyCardIds: ['cat', 'dog'],
      random: seeded(4),
    });
    expect([...test.cardIds].sort()).toEqual(['cat', 'dog']);
    const choices = ofKind(test, 'multipleChoice').flatMap((q) => q.choices.map((c) => c.text));
    expect(choices.some((text) => !['chat', 'chien'].includes(text))).toBe(true);
  });

  it('valide les options enregistrées', () => {
    expect(isTestOptions(DEFAULT_TEST_OPTIONS)).toBe(true);
    expect(isTestOptions({ ...DEFAULT_TEST_OPTIONS, types: [] })).toBe(false);
    expect(isTestOptions({ ...DEFAULT_TEST_OPTIONS, count: 0 })).toBe(false);
    expect(isTestOptions({ ...DEFAULT_TEST_OPTIONS, types: ['essay'] })).toBe(false);
  });
});

describe('correction d’un test', () => {
  it('donne 100 % pour des réponses parfaites', () => {
    const test = make({ count: 12 });
    expect(gradeTest(test, perfectResponses(test), DEFAULT_ANSWER_TOLERANCE)).toMatchObject({
      correct: 12,
      total: 12,
      percent: 100,
    });
  });

  it('compte les réponses absentes ou fausses et détaille les erreurs', () => {
    const test = make({ count: 12 });
    const responses = { ...perfectResponses(test) } as Record<string, string | number | boolean>;
    const [written] = ofKind(test, 'written');
    const [choice] = ofKind(test, 'multipleChoice');
    const [truth] = ofKind(test, 'trueFalse');
    responses[written!.cardId] = 'n’importe quoi';
    responses[choice!.cardId] = (choice!.answer + 1) % 4;
    responses[truth!.cardId] = 'sans réponse';

    const result = gradeTest(test, responses, DEFAULT_ANSWER_TOLERANCE);
    // Une réponse d’un type inattendu compte comme fausse, comme une réponse absente.
    expect(result).toMatchObject({ correct: 9, total: 12, percent: 75 });
    const errors = result.items.filter((item) => !item.correct);
    expect(errors.map((item) => item.cardId).sort()).toEqual(
      [written!.cardId, choice!.cardId, truth!.cardId].sort(),
    );
    expect(errors.find((item) => item.kind === 'written')).toMatchObject({
      verdict: 'wrong',
      given: 'n’importe quoi',
      expected: written!.expected,
    });
  });

  it('accepte une réponse écrite presque correcte en gardant la correction', () => {
    const test = make({ count: 12, types: ['written'] });
    const target = ofKind(test, 'written').find((q) => q.expected.text === 'chauve-souris');
    const result = gradeTest(test, { [target!.cardId]: 'chauve-sourie' }, DEFAULT_ANSWER_TOLERANCE);
    expect(result.items.find((item) => item.cardId === target!.cardId)).toMatchObject({
      correct: true,
      verdict: 'almost',
    });
  });

  it('liste les cartes de chaque question', () => {
    const [group] = ofKind(make({ count: 4, types: ['matching'] }), 'matching');
    expect(questionCardIds(group!)).toHaveLength(4);
  });
});
