import { useId, type ReactNode } from 'react';
import { AudioButton } from '@/components/AudioButton';
import { inputClasses } from '@/components/fieldStyles';
import type { CardFace } from '@/domain/flashcards';
import { languageName } from '@/domain/languages';
import type { TestQuestion, TestResponse } from '@/domain/testGenerator';
import { t } from '@/i18n';

type QuestionOf<K extends TestQuestion['kind']> = Extract<TestQuestion, { kind: K }>;

interface QuestionProps<K extends TestQuestion['kind']> {
  question: QuestionOf<K>;
  number: number;
  response: (cardId: string) => TestResponse | undefined;
  onAnswer: (cardId: string, response: TestResponse) => void;
}

const optionCard =
  'flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-border px-3 py-2 ' +
  'transition-colors hover:bg-surface-muted has-checked:border-primary has-checked:bg-primary-soft ' +
  'has-checked:text-on-primary-soft has-focus-visible:outline-2 has-focus-visible:outline-focus';

function Prompt({ face }: { face: CardFace }) {
  return (
    <div className="flex items-center gap-1">
      <p lang={face.lang} className="min-w-0 text-xl font-semibold break-words">
        {face.text}
      </p>
      <AudioButton text={face.text} lang={face.lang} size="sm" />
    </div>
  );
}

function QuestionFrame({ number, children }: { number: number; children: ReactNode }) {
  return (
    <fieldset className="grid gap-3 rounded-2xl border border-border bg-surface p-4">
      <legend className="sr-only">{t('test.questionNumber', { n: number })}</legend>
      <p aria-hidden="true" className="text-xs font-medium tracking-wide text-fg-muted uppercase">
        {t('test.questionNumber', { n: number })}
      </p>
      {children}
    </fieldset>
  );
}

export function TrueFalseQuestion({
  question,
  number,
  response,
  onAnswer,
}: QuestionProps<'trueFalse'>) {
  const name = useId();
  return (
    <QuestionFrame number={number}>
      <Prompt face={question.prompt} />
      <p>
        {t('test.proposedLabel')}{' '}
        <span lang={question.proposed.lang} className="font-medium">
          {question.proposed.text}
        </span>
      </p>
      <div className="grid grid-cols-2 gap-2">
        {[true, false].map((value) => (
          <label key={String(value)} className={optionCard}>
            <input
              type="radio"
              name={name}
              checked={response(question.cardId) === value}
              onChange={() => {
                onAnswer(question.cardId, value);
              }}
              className="size-4 accent-(--primary)"
            />
            {value ? t('test.true') : t('test.false')}
          </label>
        ))}
      </div>
    </QuestionFrame>
  );
}

export function MultipleChoiceQuestion({
  question,
  number,
  response,
  onAnswer,
}: QuestionProps<'multipleChoice'>) {
  const name = useId();
  return (
    <QuestionFrame number={number}>
      <Prompt face={question.prompt} />
      <div className="grid gap-2 sm:grid-cols-2">
        {question.choices.map((choice, index) => (
          <label key={`${choice.text}-${String(index)}`} className={optionCard}>
            <input
              type="radio"
              name={name}
              checked={response(question.cardId) === index}
              onChange={() => {
                onAnswer(question.cardId, index);
              }}
              className="size-4 accent-(--primary)"
            />
            <span lang={choice.lang}>{choice.text}</span>
          </label>
        ))}
      </div>
    </QuestionFrame>
  );
}

export function MatchingQuestion({
  question,
  number,
  response,
  onAnswer,
}: QuestionProps<'matching'>) {
  const baseId = useId();
  return (
    <QuestionFrame number={number}>
      <p className="text-fg-muted">{t('test.matchingHelp')}</p>
      <ul className="grid gap-3">
        {question.items.map((item, index) => {
          const id = `${baseId}-${String(index)}`;
          const value = response(item.cardId);
          return (
            <li key={item.cardId} className="grid gap-2 sm:grid-cols-2 sm:items-center">
              <label htmlFor={id} lang={item.prompt.lang} className="font-semibold break-words">
                {item.prompt.text}
              </label>
              <select
                id={id}
                value={typeof value === 'number' ? String(value) : ''}
                onChange={(event) => {
                  if (event.target.value !== '') onAnswer(item.cardId, Number(event.target.value));
                }}
                className={inputClasses}
              >
                <option value="">{t('test.chooseAnswer')}</option>
                {question.choices.map((choice, choiceIndex) => (
                  <option key={`${choice.text}-${String(choiceIndex)}`} value={choiceIndex}>
                    {choice.text}
                  </option>
                ))}
              </select>
            </li>
          );
        })}
      </ul>
    </QuestionFrame>
  );
}

export function WrittenQuestion({
  question,
  number,
  response,
  onAnswer,
}: QuestionProps<'written'>) {
  const id = useId();
  const value = response(question.cardId);
  return (
    <QuestionFrame number={number}>
      <Prompt face={question.prompt} />
      <div>
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
          {t('test.writtenLabel', {
            language: languageName(question.expected.lang).toLocaleLowerCase('fr'),
          })}
        </label>
        <input
          id={id}
          lang={question.expected.lang}
          value={typeof value === 'string' ? value : ''}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          onChange={(event) => {
            onAnswer(question.cardId, event.target.value);
          }}
          className={inputClasses}
        />
      </div>
    </QuestionFrame>
  );
}
