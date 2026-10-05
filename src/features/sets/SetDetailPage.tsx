import { Link, useParams } from 'react-router';
import { ComingSoon } from '@/components/ComingSoon';
import { t, type MessageKey } from '@/i18n';

const STUDY_MODES: readonly { path: string; labelKey: MessageKey }[] = [
  { path: 'flashcards', labelKey: 'study.modes.flashcards' },
  { path: 'learn', labelKey: 'study.modes.learn' },
  { path: 'write', labelKey: 'study.modes.write' },
  { path: 'test', labelKey: 'study.modes.test' },
  { path: 'match', labelKey: 'study.modes.match' },
];

export function SetDetailPage() {
  const { setId = '' } = useParams();

  return (
    <>
      <ComingSoon title={t('sets.detailTitle')} milestone="milestones.m1" />
      {/* Accès provisoire aux modes d'étude pour vérifier le routage. */}
      <ul className="mt-6 flex flex-wrap gap-2">
        {STUDY_MODES.map(({ path, labelKey }) => (
          <li key={path}>
            <Link
              to={`/sets/${setId}/${path}`}
              className="inline-flex h-11 items-center rounded-xl border border-border bg-surface px-4 hover:bg-surface-muted"
            >
              {t(labelKey)}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
