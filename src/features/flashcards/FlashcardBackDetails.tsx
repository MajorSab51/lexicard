import { AudioButton } from '@/components/AudioButton';
import type { Card } from '@/domain/models';
import { t } from '@/i18n';

interface FlashcardBackDetailsProps {
  card: Card;
  /** Langue des termes : l'exemple est écrit dans la langue apprise. */
  termLang: string;
}

/** Compléments affichés au verso : catégorie, genre, exemple, note et image. */
export function FlashcardBackDetails({ card, termLang }: FlashcardBackDetailsProps) {
  const details = [
    card.partOfSpeech && t(`partsOfSpeech.${card.partOfSpeech}`),
    card.gender && t(`genders.${card.gender}`),
  ].filter(Boolean);

  return (
    <>
      {details.length > 0 && <p className="text-sm text-fg-muted">{details.join(' · ')}</p>}
      {card.example && (
        <div className="flex items-center gap-1">
          <p lang={termLang} className="text-fg-muted italic">
            {card.example}
          </p>
          <AudioButton
            text={card.example}
            lang={termLang}
            size="sm"
            className="pointer-events-auto"
          />
        </div>
      )}
      {card.note && <p className="max-w-prose text-sm whitespace-pre-line">{card.note}</p>}
      {card.imageUrl && (
        <img
          src={card.imageUrl}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          className="max-h-40 max-w-full rounded-xl object-contain"
        />
      )}
    </>
  );
}
