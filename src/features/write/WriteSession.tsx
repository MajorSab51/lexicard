import {
  useEffect,
  useId,
  useMemo,
  useReducer,
  useRef,
  useState,
  type SyntheticEvent,
} from 'react';
import { flushSync } from 'react-dom';
import { AudioButton } from '@/components/AudioButton';
import { Button } from '@/components/Button';
import { DirectionField } from '@/components/DirectionField';
import { OptionsPanel } from '@/components/OptionsPanel';
import { ToleranceFields } from '@/components/ToleranceFields';
import { recordAnswer, type StudyScope } from '@/data/progressRepository';
import { saveSetting, SETTINGS } from '@/data/settingsRepository';
import { checkAnswer, type AnswerTolerance } from '@/domain/answers';
import { cardFaces } from '@/domain/flashcards';
import { languageName } from '@/domain/languages';
import type { StudySet } from '@/domain/models';
import { shuffle } from '@/domain/random';
import {
  startWriteSession,
  VERDICT_GRADE,
  writeReducer,
  writeUpdatesSchedule,
  type WriteOptions,
} from '@/domain/writeSession';
import { t, tn } from '@/i18n';
import { toast } from '@/lib/toast';
import { WriteFeedback } from './WriteFeedback';
import { WriteSummary } from './WriteSummary';

interface WriteSessionProps {
  /** Instantané chargé au début de la session (cartes et progression). */
  scope: StudyScope;
  set: StudySet;
  options: WriteOptions;
  tolerance: AnswerTolerance;
  onRestart: () => void;
}

/** Temps écoulé depuis un instant donné (hors rendu : appelé seulement par les gestionnaires). */
function elapsedSince(start: number): number {
  return Date.now() - start;
}

export function WriteSession({ scope, set, options, tolerance, onRestart }: WriteSessionProps) {
  const inputId = useId();
  const [session, dispatch] = useReducer(writeReducer, scope, (initial) =>
    startWriteSession(shuffle(initial.cards.map((card) => card.id))),
  );
  const [total] = useState(session.queue.length);
  const [answer, setAnswer] = useState('');
  const cardsById = useMemo(() => new Map(scope.cards.map((card) => [card.id, card])), [scope]);

  const item = session.queue[0];
  const card = item ? cardsById.get(item.cardId) : undefined;
  const { feedback } = session;

  const shownAt = useRef(0);
  useEffect(() => {
    shownAt.current = Date.now();
  }, [item]);
  const input = useRef<HTMLInputElement>(null);
  const continueButton = useRef<HTMLButtonElement>(null);

  if (!item || !card) {
    return (
      <WriteSummary
        session={session}
        cards={cardsById}
        set={set}
        options={options}
        onRestart={onRestart}
      />
    );
  }

  const { front: prompt, back: expected } = cardFaces(card, set, options.reversed);

  const submit = (given: string) => {
    if (feedback) return;
    const verdict = checkAnswer(given, expected.text, tolerance);
    const grade = VERDICT_GRADE[verdict];
    void recordAnswer({
      cardId: card.id,
      grade,
      mode: 'write',
      durationMs: elapsedSince(shownAt.current),
      // Seul le premier essai compte pour la répétition espacée.
      updateSchedule:
        !item.retry && writeUpdatesSchedule(scope.progress.get(card.id), scope.today, grade),
    }).catch(() => {
      toast(t('study.saveError'), 'error');
    });
    flushSync(() => {
      dispatch({ type: 'submit', given, verdict });
    });
    continueButton.current?.focus();
  };

  const handleSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    submit(answer);
  };

  const next = () => {
    flushSync(() => {
      dispatch({ type: 'continue' });
      setAnswer('');
    });
    // En fin de session, le focus revient au contenu principal plutôt que de se perdre.
    (input.current ?? document.getElementById('main'))?.focus();
  };

  const done = session.results.length;

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div>
        <p className="mb-1.5 text-sm font-medium text-fg-muted">
          {tn('write.remaining', session.queue.length)}
        </p>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={done}
          aria-label={tn('write.remaining', session.queue.length)}
          className="h-2 overflow-hidden rounded-full bg-surface-muted"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width]"
            style={{ width: `${String((done / total) * 100)}%` }}
          />
        </div>
      </div>

      <OptionsPanel>
        <DirectionField
          name="write-direction"
          reversed={options.reversed}
          onChange={(reversed) => void saveSetting(SETTINGS.writeOptions, { reversed })}
        />
        <ToleranceFields
          value={tolerance}
          onChange={(value) => void saveSetting(SETTINGS.answerTolerance, value)}
        />
      </OptionsPanel>

      <article className="flex min-h-48 flex-col rounded-3xl border border-border bg-surface p-5 shadow-sm md:p-8">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium tracking-wide text-fg-muted uppercase">
            {languageName(prompt.lang)}
          </span>
          {item.retry && (
            <span className="rounded-full border border-danger px-2.5 py-0.5 text-xs font-semibold text-danger">
              {t('write.retry')}
            </span>
          )}
        </div>
        <div className="flex flex-1 items-center justify-center gap-1 py-4 text-center">
          <p
            lang={prompt.lang}
            className="min-w-0 text-3xl leading-tight font-semibold break-words"
          >
            {prompt.text}
          </p>
          <AudioButton text={prompt.text} lang={prompt.lang} />
        </div>
      </article>

      <form onSubmit={handleSubmit} className="grid gap-3">
        <div>
          <label htmlFor={inputId} className="mb-1.5 block font-medium">
            {t('write.answerLabel', {
              language: languageName(expected.lang).toLocaleLowerCase('fr'),
            })}
          </label>
          <input
            ref={input}
            id={inputId}
            lang={expected.lang}
            value={answer}
            readOnly={feedback !== null}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            // Le correcteur orthographique dévoilerait la bonne orthographe.
            spellCheck={false}
            // eslint-disable-next-line jsx-a11y/no-autofocus -- le champ est l'unique action de l'écran
            autoFocus
            onChange={(event) => {
              setAnswer(event.target.value);
            }}
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-lg text-fg read-only:bg-surface-muted focus:border-primary focus:outline-2 focus:outline-offset-0 focus:outline-focus"
          />
        </div>
        {!feedback && (
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                submit('');
              }}
            >
              {t('write.dontKnow')}
            </Button>
            <Button type="submit">{t('write.submit')}</Button>
          </div>
        )}
      </form>

      {feedback && (
        <WriteFeedback
          verdict={feedback.verdict}
          given={feedback.given}
          expected={expected}
          card={card}
          termLang={set.sourceLang}
        >
          <Button ref={continueButton} className="w-full sm:w-auto" onClick={next}>
            {t('write.continue')}
          </Button>
        </WriteFeedback>
      )}

      {/* Région persistante : annonce la correction aux lecteurs d'écran. */}
      <p aria-live="polite" className="sr-only">
        {feedback &&
          `${t(`write.verdicts.${feedback.verdict}`)} ${
            feedback.verdict === 'correct' ? '' : t('write.expected', { answer: expected.text })
          }`}
      </p>

      <p className="text-center text-sm text-fg-muted pointer-coarse:hidden">
        {t('write.keyboardHint')}
      </p>
    </div>
  );
}
