import { createId } from './id';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('createId', () => {
  it('produit des UUID v4 uniques', () => {
    const ids = new Set(Array.from({ length: 100 }, createId));
    expect(ids.size).toBe(100);
    ids.forEach((id) => {
      expect(id).toMatch(UUID_V4);
    });
  });

  it('fonctionne sans crypto.randomUUID (HTTP hors localhost)', () => {
    const original = crypto.randomUUID.bind(crypto);
    Object.defineProperty(crypto, 'randomUUID', { value: undefined, configurable: true });
    try {
      expect(createId()).toMatch(UUID_V4);
    } finally {
      Object.defineProperty(crypto, 'randomUUID', { value: original, configurable: true });
    }
  });
});
