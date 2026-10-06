import { useEffect, useState } from 'react';
import { loadStudyScope, type StudyScope } from '@/data/progressRepository';
import type { Id } from '@/domain/models';

type ScopeState = { setId: Id | null; value: StudyScope | 'error' } | null;

/**
 * Charge une seule fois les données d'une session : la file reste stable pendant qu'on répond,
 * même si chaque réponse modifie la progression enregistrée.
 * `undefined` pendant le chargement, `'error'` en cas d'échec.
 */
export function useStudyScope(setId: Id | null): StudyScope | 'error' | undefined {
  const [state, setState] = useState<ScopeState>(null);

  useEffect(() => {
    let active = true;
    void loadStudyScope(setId).then(
      (value) => {
        if (active) setState({ setId, value });
      },
      () => {
        if (active) setState({ setId, value: 'error' });
      },
    );
    return () => {
      active = false;
    };
  }, [setId]);

  return state?.setId === setId ? state.value : undefined;
}
