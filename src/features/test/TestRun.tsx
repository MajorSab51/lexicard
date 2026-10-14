import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/Button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { normalizeAnswer } from '@/domain/answers';
import {
  type GeneratedTest,
  type TestQuestion,
  type TestResponse,
  type TestResponses,
} from '@/domain/testGenerator';
import { t, tn } from '@/i18n';
import {
  MatchingQuestion,
  MultipleChoiceQuestion,
  TrueFalseQuestion,
  WrittenQuestion,
} from './TestQuestions';

interface TestRunProps {
  test: GeneratedTest;
  onFinish: (responses: TestResponses, durationMs: number) => void;
}

/** Temps écoulé depuis un instant donné (hors rendu : appelé seulement par les gestionnaires). */
function elapsedSince(start: number): number {
  return Date.now() - start;
}

function isAnswered(response: TestResponse | undefined): boolean {
  return typeof response === 'string'
    ? normalizeAnswer(response, false) !== ''
    : response !== undefined;
}

/** Le test complet sur une page, types de questions mélangés, avec la validation en bas. */
export function TestRun({ test, onFinish }: TestRunProps) {
  const [responses, setResponses] = useState<Record<string, TestResponse>>({});
  const [confirming, setConfirming] = useState(false);
  const startedAt = useRef(0);
  useEffect(() => {
    startedAt.current = Date.now();
  }, [test]);

  const answered = test.cardIds.filter((id) => isAnswered(responses[id])).length;
  const total = test.cardIds.length;
  const response = (cardId: string) => responses[cardId];
  const onAnswer = (cardId: string, value: TestResponse) => {
    setResponses((current) => ({ ...current, [cardId]: value }));
  };
  const finish = () => {
    onFinish(responses, elapsedSince(startedAt.current));
  };

  const numbers = new Map(test.questions.map((question, index) => [question, index + 1]));

  const renderQuestion = (question: TestQuestion) => {
    const props = { number: numbers.get(question) ?? 0, response, onAnswer };
    switch (question.kind) {
      case 'trueFalse':
        return <TrueFalseQuestion question={question} {...props} />;
      case 'multipleChoice':
        return <MultipleChoiceQuestion question={question} {...props} />;
      case 'matching':
        return <MatchingQuestion question={question} {...props} />;
      case 'written':
        return <WrittenQuestion question={question} {...props} />;
    }
  };
  const questionKey = (question: TestQuestion) =>
    question.kind === 'matching'
      ? question.items.map((item) => item.cardId).join('+')
      : question.cardId;

  return (
    // Pas de <form> : Entrée dans une réponse écrite ne doit pas terminer le test.
    <div className="grid gap-8">
      <ol className="grid gap-3">
        {test.questions.map((question) => (
          <li key={questionKey(question)}>{renderQuestion(question)}</li>
        ))}
      </ol>

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center justify-between gap-3 border-t border-border bg-bg/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
        <p aria-live="polite" className="text-sm font-medium text-fg-muted">
          {t('test.answered', { answered, total })}
        </p>
        <Button
          onClick={() => {
            if (answered < total) setConfirming(true);
            else finish();
          }}
        >
          {t('test.submit')}
        </Button>
      </div>

      <ConfirmDialog
        open={confirming}
        title={t('test.unansweredTitle')}
        description={tn('test.unansweredBody', total - answered)}
        confirmLabel={t('test.unansweredConfirm')}
        onConfirm={() => {
          setConfirming(false);
          finish();
        }}
        onCancel={() => {
          setConfirming(false);
        }}
      />
    </div>
  );
}
