import { BookOpen } from 'lucide-react';
import { useState } from 'react';
import { useParams } from 'react-router';
import { ButtonLink } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { Loading } from '@/components/Loading';
import { useSet, useSetCards } from '@/data/hooks';
import { logReviews } from '@/data/reviewLogsRepository';
import { saveSetting, SETTINGS, useSetting } from '@/data/settingsRepository';
import type { AnswerTolerance } from '@/domain/answers';
import type { Card, Id, StudySet } from '@/domain/models';
import {
  generateTest,
  gradeTest,
  type GeneratedTest,
  type TestOptions,
  type TestResponses,
  type TestResult,
} from '@/domain/testGenerator';
import { SetNotFound } from '@/features/sets/SetNotFound';
import { t } from '@/i18n';
import { toast } from '@/lib/toast';
import { TestResults } from './TestResults';
import { TestRun } from './TestRun';
import { TestSetup } from './TestSetup';

type Stage =
  | { name: 'setup' }
  | { name: 'running'; test: GeneratedTest }
  | { name: 'results'; test: GeneratedTest; result: TestResult; responses: TestResponses };

/** Mode Test d'un set (`/sets/:setId/test`). */
export function TestPage() {
  const { setId } = useParams();
  const set = useSet(setId);
  const cards = useSetCards(setId);
  const options = useSetting(SETTINGS.testOptions);
  const tolerance = useSetting(SETTINGS.answerTolerance);

  if (set === undefined || cards === undefined || !options || !tolerance) return <Loading />;
  if (set === null) return <SetNotFound />;
  if (cards.length === 0) {
    return (
      <EmptyState
        icon={BookOpen}
        title={t('setDetail.noCardsTitle')}
        body={t('setDetail.noCardsBody')}
        action={<ButtonLink to={`/sets/${set.id}/edit`}>{t('setDetail.addCards')}</ButtonLink>}
      />
    );
  }

  return (
    <TestFlow key={set.id} set={set} cards={cards} initialOptions={options} tolerance={tolerance} />
  );
}

interface TestFlowProps {
  set: StudySet;
  cards: Card[];
  initialOptions: TestOptions;
  tolerance: AnswerTolerance;
}

/** Enchaînement préparation → test → résultat. */
function TestFlow({ set, cards, initialOptions, tolerance }: TestFlowProps) {
  const [stage, setStage] = useState<Stage>({ name: 'setup' });
  const [options, setOptions] = useState(initialOptions);

  const start = (next: TestOptions, onlyCardIds?: readonly Id[]) => {
    const test = generateTest({ cards, langs: set, options: next, onlyCardIds });
    setStage({ name: 'running', test });
    window.scrollTo({ top: 0 });
  };

  const finish = (test: GeneratedTest, responses: TestResponses, durationMs: number) => {
    const result = gradeTest(test, responses, tolerance);
    void logReviews(
      result.items.map((item) => ({
        cardId: item.cardId,
        setId: set.id,
        mode: 'test' as const,
        result: item.correct ? (item.verdict === 'almost' ? 'hard' : 'good') : 'again',
        durationMs: durationMs / Math.max(1, result.total),
      })),
    ).catch(() => {
      toast(t('study.saveError'), 'error');
    });
    setStage({ name: 'results', test, result, responses });
    window.scrollTo({ top: 0 });
  };

  switch (stage.name) {
    case 'setup':
      return (
        <TestSetup
          cardCount={cards.length}
          initialOptions={options}
          onStart={(next) => {
            setOptions(next);
            void saveSetting(SETTINGS.testOptions, next);
            start(next);
          }}
        />
      );
    case 'running':
      return (
        <TestRun
          test={stage.test}
          onFinish={(responses, durationMs) => {
            finish(stage.test, responses, durationMs);
          }}
        />
      );
    case 'results':
      return (
        <TestResults
          setId={set.id}
          test={stage.test}
          result={stage.result}
          onRetakeFailed={(failedIds) => {
            start({ ...options, count: failedIds.length }, failedIds);
          }}
          onNewTest={() => {
            setStage({ name: 'setup' });
          }}
        />
      );
  }
}
