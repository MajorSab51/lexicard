import { Volume2 } from 'lucide-react';
import { speechKey, useSpeech } from '@/hooks/speechContext';
import { t } from '@/i18n';

interface AudioButtonProps {
  text: string;
  lang: string;
  size?: 'sm' | 'md';
  className?: string;
}

const SIZES = {
  sm: { button: 'size-10', icon: 'size-5' },
  md: { button: 'size-12', icon: 'size-6' },
};

/** Bouton « écouter » : prononce le texte avec une voix de la langue indiquée. */
export function AudioButton({ text, lang, size = 'md', className = '' }: AudioButtonProps) {
  const { say, speakingKey } = useSpeech();
  const key = speechKey(text, lang);
  const speaking = speakingKey === key;

  return (
    <button
      type="button"
      onClick={() => void say(text, lang, key)}
      aria-label={speaking ? t('speech.stop') : t('speech.listen', { text })}
      title={speaking ? t('speech.stop') : t('speech.listenShort')}
      className={`flex shrink-0 items-center justify-center rounded-full transition-colors hover:bg-surface-muted ${
        speaking ? 'text-primary' : 'text-fg-muted hover:text-fg'
      } ${SIZES[size].button} ${className}`}
    >
      <Volume2
        aria-hidden="true"
        className={`${SIZES[size].icon} ${speaking ? 'animate-pulse' : ''}`}
      />
    </button>
  );
}
