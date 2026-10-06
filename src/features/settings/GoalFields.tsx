import { useState } from 'react';
import { SelectField, TextField } from '@/components/fields';
import { saveSetting, SETTINGS } from '@/data/settingsRepository';
import { GOAL_KINDS, GOAL_LIMITS, isGoalTarget, type DailyGoal } from '@/domain/stats';
import { t } from '@/i18n';

/** Objectif quotidien : unité (cartes ou minutes) et valeur, enregistrés dès qu'ils sont valides. */
export function GoalFields({ saved }: { saved: DailyGoal }) {
  const [kind, setKind] = useState(saved.kind);
  const [draft, setDraft] = useState(String(saved.target));
  const target = Number(draft);
  const valid = draft.trim() !== '' && isGoalTarget(kind, target);
  const { min, max } = GOAL_LIMITS[kind];

  return (
    <fieldset className="grid gap-3">
      <legend className="mb-1 font-medium">{t('settings.goal')}</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField
          label={t('settings.goalKind')}
          value={kind}
          onChange={(event) => {
            const next = GOAL_KINDS.find((option) => option === event.target.value);
            if (!next) return;
            setKind(next);
            const clamped = Math.min(
              GOAL_LIMITS[next].max,
              Math.max(GOAL_LIMITS[next].min, target || 0),
            );
            setDraft(String(clamped));
            void saveSetting(SETTINGS.dailyGoal, { kind: next, target: clamped });
          }}
        >
          {GOAL_KINDS.map((option) => (
            <option key={option} value={option}>
              {t(`settings.goalKinds.${option}`)}
            </option>
          ))}
        </SelectField>
        <TextField
          label={t('settings.goalTarget')}
          error={valid ? undefined : t('settings.newCardsInvalid', { min, max })}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          step={1}
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            const value = Number(event.target.value);
            if (event.target.value.trim() !== '' && isGoalTarget(kind, value)) {
              void saveSetting(SETTINGS.dailyGoal, { kind, target: value });
            }
          }}
          onBlur={() => {
            if (!valid) setDraft(String(saved.kind === kind ? saved.target : min));
          }}
        />
      </div>
      <p className="text-sm text-fg-muted">{t(`settings.goalHint.${kind}`)}</p>
    </fieldset>
  );
}
