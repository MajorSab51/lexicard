import { useEffect, useRef } from 'react';
import { Button, ButtonLink } from '@/components/Button';
import type { CardFace } from '@/domain/flashcards';
import type { Id } from '@/domain/models';
import {
  questionCardIds,
  type GeneratedTest,
  type ItemResult,
  type TestQuestion,
  type TestResult,
} from '@/domain/testGenerator';
import { formatNumber, t, tn } from '@/i18n';

interface TestResultsProps {
  setId: Id;
  test: GeneratedTest;
  result: TestResult;
  onRetakeFailed: (cardIds: Id[]) => void;
  onNewTest: () => void;
}

/** Texte de la réponse donnée, tel qu'il était affiché pendant le test. */
function givenText(item: ItemResult, question: TestQuestion | undefined): CardFace | string | null {
  const { given } = item;
  if (given === undefined) return null;
  if (typeof given === 'boolean') return given ? t('test.true') : t('test.false');
  if (typeof given === 'string') return given.trim() || null;
  if (question?.kind === 'multipleChoice' || question?.kind === 'matching') {
    return question.choices[given] ?? null;
  }
  return null;
}

function Answer({ value }: { value: CardFace | string }) {
  return typeof value === 'string' ? value : <span lang={value.lang}>{value.text}</span>;
}

function ResultItem({ item, question }: { item: ItemResult; question: TestQuestion | undefined }) {
  const given = givenText(item, question);
  return (
    <li className="grid gap-1 px-4 py-3">
      <p lang={item.prompt.lang} className="font-semibold">
        {item.prompt.text}
        <span className="ml-2 text-xs font-normal text-fg-muted">
          {t(`test.typeNames.${item.kind}`)}
        </span>
      </p>
      {question?.kind === 'trueFalse' && (
        <p className="text-sm text-fg-muted">
          {t('test.proposedLabel')}{' '}
          <span lang={question.proposed.lang}>{question.proposed.text}</span>
        </p>
      )}
      <p className={item.correct ? 'text-fg-muted' : 'text-danger'}>
        {given === null ? (
          t('test.noAnswer')
        ) : (
          <>
            {t('test.givenLabel')} <Answer value={given} />
          </>
        )}
      </p>
      <p className="text-success">
        {t('test.expectedLabel')} <Answer value={item.expected} />
      </p>
    </li>
  );
}

/** Correction du test : score, pourcentage et liste des erreurs. */
export function TestResults({ setId, test, result, onRetakeFailed, onNewTest }: TestResultsProps) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);

  const questionByCard = new Map(
    test.questions.flatMap((question) =>
      questionCardIds(question).map((id) => [id, question] as const),
    ),
  );
  const errors = result.items.filter((item) => !item.correct);
  const almost = result.items.filter((item) => item.verdict === 'almost');
  const failedIds = errors.map((item) => item.cardId);

  return (
    <div className="grid gap-6">
      <section
        aria-labelledby="test-result"
        className="rounded-2xl border border-border bg-surface p-5 text-center"
      >
        <h2
          id="test-result"
          ref={heading}
          tabIndex={-1}
          className="text-lg font-semibold outline-none"
        >
          {t('test.resultTitle')}
        </h2>
        <p className="mt-3 text-4xl font-bold text-primary tabular-nums">
          {t('test.percent', { percent: result.percent })}
        </p>
        <p className="mt-1 text-fg-muted">
          {t('test.score', {
            correct: formatNumber(result.correct),
            total: formatNumber(result.total),
          })}
        </p>
        <div
          aria-hidden="true"
          className="mx-auto mt-4 h-2 max-w-sm overflow-hidden rounded-full bg-surface-muted"
        >
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${String(result.percent)}%` }}
          />
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {failedIds.length > 0 && (
            <Button
              onClick={() => {
                onRetakeFailed(failedIds);
              }}
            >
              {tn('test.retakeFailed', failedIds.length)}
            </Button>
          )}
          <Button variant="secondary" onClick={onNewTest}>
            {t('test.newTest')}
          </Button>
          <ButtonLink variant="ghost" to={`/sets/${setId}`}>
            {t('study.backToSet')}
          </ButtonLink>
        </div>
      </section>

      <section aria-labelledby="test-errors">
        <h2 id="test-errors" className="mb-3 text-lg font-semibold">
          {t('test.errorsTitle')}
        </h2>
        {errors.length === 0 ? (
          <p className="text-fg-muted">{t('test.noErrors')}</p>
        ) : (
          <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
            {errors.map((item) => (
              <ResultItem
                key={item.cardId}
                item={item}
                question={questionByCard.get(item.cardId)}
              />
            ))}
          </ul>
        )}
      </section>

      {almost.length > 0 && (
        <section aria-labelledby="test-almost">
          <h2 id="test-almost" className="mb-3 text-lg font-semibold">
            {t('test.almostTitle')}
          </h2>
          <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
            {almost.map((item) => (
              <ResultItem
                key={item.cardId}
                item={item}
                question={questionByCard.get(item.cardId)}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
