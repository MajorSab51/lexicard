import {
  acceptedAnswers,
  allowedTypos,
  checkAnswer,
  DEFAULT_ANSWER_TOLERANCE,
  editDistance,
  isAnswerTolerance,
  normalizeAnswer,
  type AnswerTolerance,
} from './answers';

const strict: AnswerTolerance = { ignoreAccents: false, typos: 'none' };
const lenient: AnswerTolerance = { ignoreAccents: true, typos: 'lenient' };
const check = (given: string, expected: string, tolerance = DEFAULT_ANSWER_TOLERANCE) =>
  checkAnswer(given, expected, tolerance);

describe('distance d’édition', () => {
  it('compte insertions, suppressions et substitutions', () => {
    expect(editDistance('chat', 'chat')).toBe(0);
    expect(editDistance('chat', 'chats')).toBe(1);
    expect(editDistance('chat', 'cat')).toBe(1);
    expect(editDistance('chat', 'chut')).toBe(1);
    expect(editDistance('kitten', 'sitting')).toBe(3);
    expect(editDistance('', 'abc')).toBe(3);
  });

  it('compte une inversion de lettres voisines comme une seule faute', () => {
    expect(editDistance('the', 'teh')).toBe(1);
    expect(editDistance('maison', 'msaion')).toBe(2);
  });

  it('compte les caractères et non les unités de code', () => {
    expect(editDistance('ñandú', 'nandu')).toBe(2);
  });
});

describe('normalisation', () => {
  it('ignore la casse, la ponctuation et les espaces superflus', () => {
    expect(normalizeAnswer('  Le  Chat !', false)).toBe('le chat');
    expect(normalizeAnswer('rendez-vous', false)).toBe('rendez vous');
    expect(normalizeAnswer('¿Qué tal?', true)).toBe('que tal');
  });

  it('accepte chaque formulation séparée par ; ou /, avec ou sans parenthèses', () => {
    expect(acceptedAnswers('chat ; matou / minou')).toEqual([
      'chat ; matou / minou',
      'chat',
      'matou',
      'minou',
    ]);
    expect(acceptedAnswers('(to) run')).toEqual(['run', '(to) run']);
  });
});

describe('correction d’une réponse', () => {
  it('accepte la bonne réponse sans tenir compte de la casse ni de la ponctuation', () => {
    expect(check('le chat', 'Le chat.')).toBe('correct');
    expect(check('  LE   CHAT ', 'le chat')).toBe('correct');
  });

  it('accepte une des formulations proposées', () => {
    expect(check('matou', 'chat ; matou')).toBe('correct');
    expect(check('she', 'he/she')).toBe('correct');
    expect(check('run', '(to) run')).toBe('correct');
    expect(check('to run', '(to) run')).toBe('correct');
  });

  it('ignore les accents par défaut, ou les signale comme presque corrects', () => {
    expect(check('ete', 'été')).toBe('correct');
    expect(check('ete', 'été', strict)).toBe('almost');
    expect(check('été', 'été', strict)).toBe('correct');
  });

  it('tolère une faute de frappe pour les mots d’au moins 5 lettres', () => {
    expect(check('maisn', 'maison')).toBe('almost');
    expect(check('msaion', 'maison')).toBe('wrong');
    expect(check('chut', 'chat')).toBe('wrong');
    expect(check('maisn', 'maison', strict)).toBe('wrong');
  });

  it('tolère davantage en mode indulgent', () => {
    expect(check('chut', 'chat', lenient)).toBe('almost');
    expect(check('bibliotheqe', 'bibliothèque', lenient)).toBe('almost');
    expect(check('biblotheqe', 'bibliothèque', lenient)).toBe('almost');
    expect(check('blibotheqe', 'bibliothèque', lenient)).toBe('wrong');
  });

  it('refuse une réponse vide ou différente', () => {
    expect(check('', 'chat')).toBe('wrong');
    expect(check('   ', 'chat')).toBe('wrong');
    expect(check('chien', 'chat')).toBe('wrong');
  });

  it('calcule les fautes tolérées selon la longueur', () => {
    expect([4, 5, 12].map((length) => allowedTypos(length, 'normal'))).toEqual([0, 1, 1]);
    expect([3, 4, 9].map((length) => allowedTypos(length, 'lenient'))).toEqual([0, 1, 2]);
    expect(allowedTypos(20, 'none')).toBe(0);
  });

  it('valide le réglage de tolérance', () => {
    expect(isAnswerTolerance(DEFAULT_ANSWER_TOLERANCE)).toBe(true);
    expect(isAnswerTolerance({ ignoreAccents: true, typos: 'many' })).toBe(false);
    expect(isAnswerTolerance(null)).toBe(false);
  });
});
