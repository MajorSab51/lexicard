import { useParams } from 'react-router';
import { Loading } from '@/components/Loading';
import { useSet, useSetCards, useSets } from '@/data/hooks';
import type { SetInput } from '@/data/setsRepository';
import { DEFAULT_SOURCE_LANG, DEFAULT_TARGET_LANG } from '@/domain/languages';
import { SetNotFound } from '@/features/sets/SetNotFound';
import { newRow, rowFromCard } from './editorRows';
import { SetEditorForm } from './SetEditorForm';

/**
 * Création (`/sets/new`) ou modification (`/sets/:setId/edit`) d'un set.
 * Les données sont lues une fois, puis éditées localement jusqu'à l'enregistrement.
 */
export function SetEditorPage() {
  const { setId } = useParams();
  const set = useSet(setId);
  const cards = useSetCards(setId);
  const sets = useSets();

  if (!setId) {
    if (!sets) return <Loading />;
    // Un nouveau set reprend les langues du dernier set modifié : on travaille souvent une langue à la fois.
    const latest = sets[0];
    const input: SetInput = {
      title: '',
      description: '',
      sourceLang: latest?.sourceLang ?? DEFAULT_SOURCE_LANG,
      targetLang: latest?.targetLang ?? DEFAULT_TARGET_LANG,
      color: 'teal',
      tags: [],
    };
    return <SetEditorForm key="new" setId={null} initialInput={input} initialRows={[newRow()]} />;
  }

  if (set === undefined || cards === undefined) return <Loading />;
  if (set === null) return <SetNotFound />;

  return (
    <SetEditorForm
      key={set.id}
      setId={set.id}
      initialInput={set}
      initialRows={cards.length > 0 ? cards.map(rowFromCard) : [newRow()]}
    />
  );
}
