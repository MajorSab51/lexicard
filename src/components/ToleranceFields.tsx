import { useId } from 'react';
import { TYPO_TOLERANCES, type AnswerTolerance } from '@/domain/answers';
import { t } from '@/i18n';
import { SelectField } from './fields';

interface ToleranceFieldsProps {
  value: AnswerTolerance;
  onChange: (value: AnswerTolerance) => void;
}

/** Réglages de correction des réponses écrites : accents et fautes de frappe. */
export function ToleranceFields({ value, onChange }: ToleranceFieldsProps) {
  const hintId = useId();
  return (
    <div className="grid content-start gap-3">
      <div>
        <label className="flex items-center gap-2 font-medium">
          <input
            type="checkbox"
            checked={value.ignoreAccents}
            aria-describedby={hintId}
            onChange={(event) => {
              onChange({ ...value, ignoreAccents: event.target.checked });
            }}
            className="size-4 accent-(--primary)"
          />
          {t('answers.ignoreAccents')}
        </label>
        <p id={hintId} className="mt-1 ml-6 text-sm text-fg-muted">
          {t('answers.ignoreAccentsHint')}
        </p>
      </div>
      <SelectField
        label={t('answers.typos')}
        value={value.typos}
        onChange={(event) => {
          const typos = TYPO_TOLERANCES.find((option) => option === event.target.value);
          if (typos) onChange({ ...value, typos });
        }}
      >
        {TYPO_TOLERANCES.map((option) => (
          <option key={option} value={option}>
            {t(`answers.typoOptions.${option}`)}
          </option>
        ))}
      </SelectField>
    </div>
  );
}
