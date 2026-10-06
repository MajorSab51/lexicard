import { seeded } from '@/test/random';
import { shuffle } from './random';

describe('shuffle', () => {
  it('est reproductible avec le même générateur et ne modifie pas l’entrée', () => {
    const input = [1, 2, 3, 4, 5, 6];
    expect(shuffle(input, seeded(7))).toEqual(shuffle(input, seeded(7)));
    expect(input).toEqual([1, 2, 3, 4, 5, 6]);
  });
});
