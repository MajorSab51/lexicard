import { useState } from 'react';
import { TextField } from '@/components/fields';
import { ToleranceFields } from '@/components/ToleranceFields';
import { saveSetting, SETTINGS, useSetting } from '@/data/settingsRepository';
import { isNewCardsLimit, NEW_CARDS_PER_DAY } from '@/domain/studyPlan';
import { t } from '@/i18n';
import { GoalFields } from './GoalFields';

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
  const tolerance = useSetting(SETTINGS.answerTolerance);
  const goal = useSetting(SETTINGS.dailyGoal);

  return (
    <section
      aria-labelledby="settings-learning"
      className="rounded-2xl border border-border bg-surface p-5"
    >
      <h2 id="settings-learning" className="mb-4 text-lg font-semibold">
        {t('settings.learning')}
      </h2>
      <div className="grid gap-6 sm:max-w-md">
        {limit !== undefined && <NewCardsField saved={limit} />}
        {goal && <GoalFields saved={goal} />}
        {tolerance && (
          <fieldset>
            <legend className="font-medium">{t('answers.tolerance')}</legend>
            <p className="mb-3 text-sm text-fg-muted">{t('answers.toleranceHint')}</p>
            <ToleranceFields
              value={tolerance}
              onChange={(value) => void saveSetting(SETTINGS.answerTolerance, value)}
            />
          </fieldset>
        )}
      </div>
    </section>
  );
}
