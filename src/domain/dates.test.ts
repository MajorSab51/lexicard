import { addDays, daysBetween, isLocalDay, toLocalDay } from './dates';

describe('jours locaux', () => {
  it('formate un instant dans le fuseau local', () => {
    expect(toLocalDay(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(toLocalDay(new Date(2026, 11, 31, 0, 0))).toBe('2026-12-31');
  });

  it('ajoute des jours en franchissant les mois, les années et les années bissextiles', () => {
    expect(addDays('2026-10-06', 1)).toBe('2026-10-07');
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-12-30', 6)).toBe('2027-01-05');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('ignore les changements d’heure', () => {
    // Passages à l'heure d'été et d'hiver en Europe.
    expect(addDays('2026-03-28', 1)).toBe('2026-03-29');
    expect(addDays('2026-03-29', 1)).toBe('2026-03-30');
    expect(addDays('2026-10-24', 2)).toBe('2026-10-26');
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2);
  });

  it('compte les jours entre deux dates', () => {
    expect(daysBetween('2026-10-06', '2026-10-06')).toBe(0);
    expect(daysBetween('2026-10-06', '2026-11-06')).toBe(31);
    expect(daysBetween('2026-10-06', '2026-10-01')).toBe(-5);
  });

  it('valide le format AAAA-MM-JJ', () => {
    expect(isLocalDay('2026-10-06')).toBe(true);
    expect(isLocalDay('2026-02-30')).toBe(false);
    expect(isLocalDay('2026-10-6')).toBe(false);
    expect(isLocalDay(20261006)).toBe(false);
  });
});
