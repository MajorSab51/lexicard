import { AudioButton } from '@/components/AudioButton';
import { CardDetails } from '@/components/CardDetails';
import type { LearnItemKind } from '@/domain/learnSession';
import { languageName } from '@/domain/languages';
import type { Card, StudySet } from '@/domain/models';
import { t } from '@/i18n';

interface LearnCardProps {
  card: Card;
  set: StudySet;
  kind: LearnItemKind;
  revealed: boolean;
  /** Affiche le set d'origine (session « Tout réviser »). */
  showSetTitle: boolean;
}

const BADGE_STYLES: Record<LearnItemKind, string> = {
  review: 'bg-primary-soft text-on-primary-soft',
  new: 'bg-surface-muted text-fg',
  relearn: 'border border-danger text-danger',
};

/** Carte du mode Apprendre : le terme, puis la traduction et les détails une fois la réponse affichée. */
export function LearnCard({ card, set, kind, revealed, showSetTitle }: LearnCardProps) {
  return (
    <article className="flex min-h-72 flex-1 flex-col overflow-y-auto rounded-3xl border border-border bg-surface p-5 shadow-sm md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="min-w-0 text-sm text-fg-muted">
          <span className="text-xs font-medium tracking-wide uppercase">
            {languageName(set.sourceLang)}
          </span>
          {showSetTitle && <span> · {set.title}</span>}
        </p>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${BADGE_STYLES[kind]}`}>
          {t(`learn.badges.${kind}`)}
        </span>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-6 text-center">
        <div className="flex max-w-full items-center gap-1">
          <p
            lang={set.sourceLang}
            className="min-w-0 text-3xl leading-tight font-semibold break-words md:text-4xl"
          >
            {card.term}
          </p>
          <AudioButton text={card.term} lang={set.sourceLang} />
        </div>

        {revealed && (
          <>
            <hr aria-hidden="true" className="w-16 border-border" />
            <div className="flex max-w-full items-center gap-1">
              <p
                lang={set.targetLang}
                className="min-w-0 text-2xl leading-tight font-semibold break-words md:text-3xl"
              >
                {card.translation}
              </p>
              <AudioButton text={card.translation} lang={set.targetLang} size="sm" />
            </div>
            <CardDetails card={card} termLang={set.sourceLang} />
          </>
        )}
      </div>
    </article>
  );
}
