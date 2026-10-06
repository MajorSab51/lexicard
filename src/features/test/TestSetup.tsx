import { useId, useState } from 'react';
import { Button } from '@/components/Button';
import { DirectionField } from '@/components/DirectionField';
import { TextField } from '@/components/fields';
import { PageHeader } from '@/components/PageHeader';
import { QUESTION_TYPES, TEST_COUNT, type TestOptions } from '@/domain/testGenerator';
import { t, tn } from '@/i18n';

interface TestSetupProps {
  cardCount: number;
  initialOptions: TestOptions;
  onStart: (options: TestOptions) => void;
}

/** Préparation d'un test : nombre de questions, types de questions et sens. */
export function TestSetup({ cardCount, initialOptions, onStart }: TestSetupProps) {
  const typesError = useId();
  const max = Math.min(TEST_COUNT.max, cardCount);
  const [count, setCount] = useState(String(Math.min(initialOptions.count, max)));
  const [types, setTypes] = useState(initialOptions.types);
  const [reversed, setReversed] = useState(initialOptions.reversed);

  const parsedCount = Number(count);
  const countValid =
    count.trim() !== '' && Number.isInteger(parsedCount) && parsedCount >= 1 && parsedCount <= max;
  const typesValid = types.length > 0;

  return (
    <>
      <PageHeader title={t('test.setupTitle')} />
      <form
        className="grid gap-6 rounded-2xl border border-border bg-surface p-5"
        onSubmit={(event) => {
          event.preventDefault();
          if (countValid && typesValid) onStart({ count: parsedCount, types, reversed });
        }}
      >
        <div className="sm:max-w-xs">
          <TextField
            label={t('test.count')}
            hint={tn('test.countHint', max)}
            error={countValid ? undefined : t('test.countInvalid', { max })}
            type="number"
            inputMode="numeric"
            min={1}
            max={max}
            step={1}
            value={count}
            onChange={(event) => {
              setCount(event.target.value);
            }}
          />
        </div>

        <fieldset aria-describedby={typesValid ? undefined : typesError}>
          <legend className="mb-2 font-medium">{t('test.types')}</legend>
          <div className="grid gap-1 sm:grid-cols-2">
            {QUESTION_TYPES.map((type) => (
              <label key={type} className="flex items-center gap-2 py-1">
                <input
                  type="checkbox"
                  checked={types.includes(type)}
                  onChange={(event) => {
                    setTypes((current) =>
                      event.target.checked
                        ? QUESTION_TYPES.filter((item) => item === type || current.includes(item))
                        : current.filter((item) => item !== type),
                    );
                  }}
                  className="size-4 accent-(--primary)"
                />
                {t(`test.typeNames.${type}`)}
              </label>
            ))}
          </div>
          {!typesValid && (
            <p id={typesError} className="mt-1.5 text-sm text-danger">
              {t('test.typesRequired')}
            </p>
          )}
        </fieldset>

        <DirectionField name="test-direction" reversed={reversed} onChange={setReversed} />

        <div>
          <Button type="submit" size="lg" disabled={!countValid || !typesValid}>
            {t('test.start')}
          </Button>
        </div>
      </form>
    </>
  );
}
