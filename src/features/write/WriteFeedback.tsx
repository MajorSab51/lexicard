import { CircleAlert, CircleCheck, CircleX, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { AudioButton } from '@/components/AudioButton';
import { CardDetails } from '@/components/CardDetails';
import type { AnswerVerdict } from '@/domain/answers';
import type { CardFace } from '@/domain/flashcards';
import type { Card } from '@/domain/models';
import { t } from '@/i18n';

const STYLES: Record<AnswerVerdict, { icon: LucideIcon; tone: string }> = {
  correct: { icon: CircleCheck, tone: 'border-success text-success' },
  almost: { icon: CircleAlert, tone: 'border-warning text-warning' },
  wrong: { icon: CircleX, tone: 'border-danger text-danger' },
};

interface WriteFeedbackProps {
  verdict: AnswerVerdict;
  given: string;
  expected: CardFace;
  card: Card;
  termLang: string;
  /** Bouton pour continuer. */
  children: ReactNode;
}

/** Correction d'une réponse : verdict, réponse attendue et rappel des détails de la carte. */
export function WriteFeedback({
  verdict,
  given,
  expected,
  card,
  termLang,
  children,
}: WriteFeedbackProps) {
  const { icon: Icon, tone } = STYLES[verdict];

  return (
    <section className={`rounded-2xl border-2 bg-surface p-4 ${tone}`}>
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <Icon aria-hidden="true" className="size-6" />
        {t(`write.verdicts.${verdict}`)}
      </h2>
      <div className="mt-2 grid gap-1 text-fg">
        {verdict !== 'correct' && (
          <p>{given.trim() ? t('write.yourAnswer', { answer: given }) : t('write.noAnswer')}</p>
        )}
        <div className="flex items-center gap-1">
          <p className="font-medium">
            {t('write.expectedLabel')} <span lang={expected.lang}>{expected.text}</span>
          </p>
          <AudioButton text={expected.text} lang={expected.lang} size="sm" />
        </div>
        <div className="flex flex-col items-start gap-2 text-left">
          <CardDetails card={card} termLang={termLang} />
        </div>
      </div>
      <div className="mt-4 flex justify-end">{children}</div>
    </section>
  );
}
