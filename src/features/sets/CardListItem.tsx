import { Flag, Star } from 'lucide-react';
import { memo } from 'react';
import { AudioButton } from '@/components/AudioButton';
import { setCardFlags } from '@/data/cardsRepository';
import type { Card } from '@/domain/models';
import { t } from '@/i18n';

interface CardListItemProps {
  card: Card;
  termLang: string;
  translationLang: string;
  selecting: boolean;
  selected: boolean;
  onToggleSelected: (id: string) => void;
}

const flagButton =
  'flex size-10 items-center justify-center rounded-lg transition-colors hover:bg-surface-muted';

export const CardListItem = memo(function CardListItem({
  card,
  termLang,
  translationLang,
  selecting,
  selected,
  onToggleSelected,
}: CardListItemProps) {
  const checkboxId = `select-${card.id}`;
  const details = [
    card.partOfSpeech && t(`partsOfSpeech.${card.partOfSpeech}`),
    card.gender && t(`genders.${card.gender}`),
  ].filter(Boolean);

  return (
    <div
      className={`flex items-start gap-3 rounded-2xl border bg-surface p-3 md:p-4 ${
        selected ? 'border-primary bg-primary-soft/40' : 'border-border'
      }`}
    >
      {selecting && (
        <div className="flex size-10 shrink-0 items-center justify-center">
          <input
            id={checkboxId}
            type="checkbox"
            checked={selected}
            onChange={() => {
              onToggleSelected(card.id);
            }}
            aria-label={t('setDetail.selectCard', { term: card.term })}
            className="size-5 accent-(--primary)"
          />
        </div>
      )}
      <div className="grid min-w-0 flex-1 gap-1 md:grid-cols-2 md:gap-4">
        <div className="min-w-0">
          <p lang={termLang} className="font-semibold break-words">
            {card.term}
          </p>
          {details.length > 0 && <p className="text-xs text-fg-muted">{details.join(' · ')}</p>}
        </div>
        <div className="min-w-0">
          <p lang={translationLang} className="break-words">
            {card.translation}
          </p>
          {card.example && (
            <p lang={termLang} className="mt-1 text-sm text-fg-muted italic">
              {card.example}
            </p>
          )}
        </div>
      </div>
      {!selecting && (
        <div className="flex shrink-0">
          <AudioButton text={card.term} lang={termLang} size="sm" />
          <button
            type="button"
            aria-pressed={card.favorite}
            aria-label={t('setDetail.toggleFavorite', { term: card.term })}
            title={t('setDetail.favorite')}
            onClick={() => void setCardFlags(card.id, { favorite: !card.favorite })}
            className={`${flagButton} ${card.favorite ? 'text-warning' : 'text-fg-muted'}`}
          >
            <Star aria-hidden="true" className={`size-5 ${card.favorite ? 'fill-current' : ''}`} />
          </button>
          <button
            type="button"
            aria-pressed={card.difficult}
            aria-label={t('setDetail.toggleDifficult', { term: card.term })}
            title={t('setDetail.difficult')}
            onClick={() => void setCardFlags(card.id, { difficult: !card.difficult })}
            className={`${flagButton} ${card.difficult ? 'text-danger' : 'text-fg-muted'}`}
          >
            <Flag aria-hidden="true" className={`size-5 ${card.difficult ? 'fill-current' : ''}`} />
          </button>
        </div>
      )}
    </div>
  );
});
