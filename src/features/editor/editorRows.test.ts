import { aCard } from '@/test/factories';
import { editorRowsReducer, newRow, type EditorRowState } from './editorRows';

const row = (key: string, term = key): EditorRowState => ({ key, content: aCard(term, '') });
const keys = (rows: EditorRowState[]) => rows.map((r) => r.key);

describe('editorRowsReducer', () => {
  const rows = [row('a'), row('b'), row('c')];

  it('met à jour un seul champ d’une seule ligne', () => {
    const next = editorRowsReducer(rows, {
      type: 'update',
      key: 'b',
      field: 'translation',
      value: 'bé',
    });
    expect(next[1]?.content.translation).toBe('bé');
    expect(next[0]).toBe(rows[0]);
  });

  it('insère après une ligne donnée ou à la fin', () => {
    expect(keys(editorRowsReducer(rows, { type: 'insert', afterKey: 'a', row: row('x') }))).toEqual(
      ['a', 'x', 'b', 'c'],
    );
    expect(
      keys(editorRowsReducer(rows, { type: 'insert', afterKey: null, row: row('x') })),
    ).toEqual(['a', 'b', 'c', 'x']);
  });

  it('déplace une ligne sans sortir des bornes', () => {
    expect(keys(editorRowsReducer(rows, { type: 'move', key: 'c', delta: -1 }))).toEqual([
      'a',
      'c',
      'b',
    ]);
    expect(editorRowsReducer(rows, { type: 'move', key: 'a', delta: -1 })).toBe(rows);
    expect(editorRowsReducer(rows, { type: 'move', key: 'c', delta: 1 })).toBe(rows);
  });

  it('supprime une ligne mais en garde toujours au moins une', () => {
    expect(keys(editorRowsReducer(rows, { type: 'remove', key: 'b' }))).toEqual(['a', 'c']);
    const single = editorRowsReducer([row('a')], { type: 'remove', key: 'a' });
    expect(single).toHaveLength(1);
    expect(single[0]?.key).not.toBe('a');
  });

  it('crée des lignes vides avec des clés uniques', () => {
    expect(newRow().key).not.toBe(newRow().key);
    expect(newRow().content.term).toBe('');
  });
});
