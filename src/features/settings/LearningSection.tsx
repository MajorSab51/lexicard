import { useState } from 'react';
import { TextField } from '@/components/fields';
import { saveSetting, SETTINGS, useSetting } from '@/data/settingsRepository';
import { isNewCardsLimit, NEW_CARDS_PER_DAY } from '@/domain/studyPlan';
import { t } from '@/i18n';

function parseLimit(text: string): number | null {
  const value = Number(text);
  return text.trim() !== '' && isNewCardsLimit(value) ? value : null;
}

/** Champ enregistré dès qu'il contient une valeur valide. */
function NewCardsField({ saved }: { saved: number }) {
  const [draft, setDraft] = useState(String(saved));
  const valid = parseLimit(draft) !== null;

  return (
    <TextField
      label={t('settings.newCardsPerDay')}
      hint={t('settings.newCardsHint')}
      error={
        valid
          ? undefined
          : t('settings.newCardsInvalid', {
              min: NEW_CARDS_PER_DAY.min,
              max: NEW_CARDS_PER_DAY.max,
            })
      }
      type="number"
      inputMode="numeric"
      min={NEW_CARDS_PER_DAY.min}
      max={NEW_CARDS_PER_DAY.max}
      step={1}
      value={draft}
      onChange={(event) => {
        setDraft(event.target.value);
        const limit = parseLimit(event.target.value);
        if (limit !== null) void saveSetting(SETTINGS.newCardsPerDay, limit);
      }}
      onBlur={() => {
        if (!valid) setDraft(String(saved));
      }}
      className="max-w-32"
    />
  );
}

export function LearningSection() {
  const limit = useSetting(SETTINGS.newCardsPerDay);

  return (
    <section
      aria-labelledby="settings-learning"
      className="rounded-2xl border border-border bg-surface p-5"
    >
      <h2 id="settings-learning" className="mb-4 text-lg font-semibold">
        {t('settings.learning')}
      </h2>
      <div className="sm:max-w-md">{limit !== undefined && <NewCardsField saved={limit} />}</div>
    </section>
  );
}
