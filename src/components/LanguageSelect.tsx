import type { SelectHTMLAttributes } from 'react';
import { isKnownLanguage, LANGUAGE_CODES, languageName } from '@/domain/languages';
import { SelectField } from './fields';

interface LanguageSelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label: string;
  value: string;
}

/** Liste des langues, triée par nom ; une langue inconnue (import) reste sélectionnable. */
export function LanguageSelect({ label, value, ...props }: LanguageSelectProps) {
  const options = [...LANGUAGE_CODES]
    .map((code) => ({ code, name: languageName(code) }))
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'));

  return (
    <SelectField label={label} value={value} {...props}>
      {!isKnownLanguage(value) && <option value={value}>{languageName(value)}</option>}
      {options.map(({ code, name }) => (
        <option key={code} value={code}>
          {name}
        </option>
      ))}
    </SelectField>
  );
}
