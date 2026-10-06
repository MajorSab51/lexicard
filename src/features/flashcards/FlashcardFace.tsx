import type { ReactNode } from 'react';
import { AudioButton } from '@/components/AudioButton';
import type { CardFace } from '@/domain/flashcards';
import { languageName } from '@/domain/languages';

interface FlashcardFaceProps {
  face: CardFace;
  label: string;
  /** Face actuellement cachée : retirée de l'ordre de tabulation et des lecteurs d'écran. */
  hidden: boolean;
  back?: boolean;
  children?: ReactNode;
}

/**
 * Une face de la carte. Le conteneur laisse passer les clics vers le bouton de retournement
 * placé dessous ; seuls les boutons de la face (écoute) les interceptent.
 */
export function FlashcardFace({ face, label, hidden, back = false, children }: FlashcardFaceProps) {
  return (
    <div
      inert={hidden}
      className={`absolute inset-0 flex flex-col overflow-y-auto rounded-3xl border border-border bg-surface p-5 shadow-sm backface-hidden md:p-8 ${
        back ? 'rotate-y-180' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="pt-3 text-xs font-medium tracking-wide text-fg-muted uppercase">
          {label} · {languageName(face.lang)}
        </span>
        <AudioButton
          text={face.text}
          lang={face.lang}
          className="pointer-events-auto -mt-1 -mr-1"
        />
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-4 text-center">
        <p
          lang={face.lang}
          className="text-3xl leading-tight font-semibold break-words md:text-4xl"
        >
          {face.text}
        </p>
        {children}
      </div>
    </div>
  );
}
