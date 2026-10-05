import { emptyCardContent, type Card, type CardContent, type Id } from '@/domain/models';
import { createId } from '@/lib/id';

/** Ligne de l'éditeur. `key` identifie la ligne à l'écran ; `id` est celui de la carte enregistrée. */
export interface EditorRowState {
  key: string;
  id?: Id;
  content: CardContent;
}

export type EditorAction =
  | { type: 'update'; key: string; field: keyof CardContent; value: string }
  /** Insère une ligne après `afterKey`, ou à la fin si `afterKey` est nul. */
  | { type: 'insert'; afterKey: string | null; row: EditorRowState }
  | { type: 'remove'; key: string }
  | { type: 'move'; key: string; delta: -1 | 1 };

export type RowField = keyof CardContent;

/** Identifiant DOM d'un champ, utilisé pour déplacer le focus d'une ligne à l'autre. */
export function rowFieldId(key: string, field: RowField) {
  return `card-${key}-${field}`;
}

export function newRow(): EditorRowState {
  return { key: createId(), content: emptyCardContent() };
}

export function rowFromCard(card: Card): EditorRowState {
  return {
    key: card.id,
    id: card.id,
    content: {
      term: card.term,
      translation: card.translation,
      example: card.example,
      note: card.note,
      imageUrl: card.imageUrl,
      partOfSpeech: card.partOfSpeech,
      gender: card.gender,
    },
  };
}

export function editorRowsReducer(rows: EditorRowState[], action: EditorAction): EditorRowState[] {
  switch (action.type) {
    case 'update':
      return rows.map((row) =>
        row.key === action.key
          ? { ...row, content: { ...row.content, [action.field]: action.value } }
          : row,
      );
    case 'insert': {
      const index =
        action.afterKey === null ? -1 : rows.findIndex((row) => row.key === action.afterKey);
      if (index === -1) return [...rows, action.row];
      return [...rows.slice(0, index + 1), action.row, ...rows.slice(index + 1)];
    }
    case 'remove': {
      const remaining = rows.filter((row) => row.key !== action.key);
      // On garde toujours au moins une ligne pour pouvoir saisir.
      return remaining.length > 0 ? remaining : [newRow()];
    }
    case 'move': {
      const index = rows.findIndex((row) => row.key === action.key);
      const target = index + action.delta;
      if (index === -1 || target < 0 || target >= rows.length) return rows;
      const next = [...rows];
      const [moved] = next.splice(index, 1);
      if (moved) next.splice(target, 0, moved);
      return next;
    }
  }
}
