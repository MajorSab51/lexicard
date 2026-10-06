import { t } from '@/i18n';

interface DirectionFieldProps {
  /** Nom du groupe de boutons radio (unique dans la page). */
  name: string;
  reversed: boolean;
  onChange: (reversed: boolean) => void;
}

/** Sens d'étude : terme → traduction, ou l'inverse. */
export function DirectionField({ name, reversed, onChange }: DirectionFieldProps) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">{t('study.direction')}</legend>
      {[false, true].map((value) => (
        <label key={String(value)} className="flex items-center gap-2 py-1">
          <input
            type="radio"
            name={name}
            checked={reversed === value}
            onChange={() => {
              onChange(value);
            }}
            className="size-4 accent-(--primary)"
          />
          {value ? t('study.translationFirst') : t('study.termFirst')}
        </label>
      ))}
    </fieldset>
  );
}
