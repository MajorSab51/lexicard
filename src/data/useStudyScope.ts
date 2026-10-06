import { useEffect, useState } from 'react';
import type { Id } from '@/domain/models';
import { loadStudyScope, type StudyScope } from './progressRepository';

type ScopeState = { key: string; value: StudyScope | 'error' } | null;

/**
 * Charge une seule fois les données d'une session : la file reste stable pendant qu'on répond,
 * même si chaque réponse modifie la progression enregistrée.
 * `undefined` pendant le chargement, `'error'` en cas d'échec.
 * Changer `round` recharge les données (nouvelle session après la précédente).
 */
export function useStudyScope(setId: Id | null, round = 0): StudyScope | 'error' | undefined {
  const [state, setState] = useState<ScopeState>(null);
  const key = `${setId ?? ''}:${String(round)}`;

  useEffect(() => {
    let active = true;
    void loadStudyScope(setId).then(
      (value) => {
        if (active) setState({ key, value });
      },
      () => {
        if (active) setState({ key, value: 'error' });
      },
    );
    return () => {
      active = false;
    };
  }, [setId, key]);

  return state?.key === key ? state.value : undefined;
}
