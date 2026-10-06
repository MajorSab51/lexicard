import { Monitor, Moon, Sun, type LucideIcon } from 'lucide-react';
import { SelectField } from '@/components/fields';
import { changeLocale, getLocale, isLocale, LOCALE_NAMES, LOCALES, t } from '@/i18n';
import type { ThemePreference } from '@/lib/theme';
import { useThemeStore } from './themeStore';

const THEME_OPTIONS: readonly { value: ThemePreference; icon: LucideIcon }[] = [
  { value: 'light', icon: Sun },
  { value: 'dark', icon: Moon },
  { value: 'system', icon: Monitor },
];

/** Thème et langue de l'interface : deux réglages propres à l'appareil. */
export function AppearanceSection() {
  const preference = useThemeStore((state) => state.preference);
  const setPreference = useThemeStore((state) => state.setPreference);

  return (
    <section
      aria-labelledby="settings-appearance"
      className="rounded-2xl border border-border bg-surface p-5"
    >
      <h2 id="settings-appearance" className="mb-4 text-lg font-semibold">
        {t('settings.appearance')}
      </h2>
      <div className="grid gap-5">
        <fieldset>
          <legend className="mb-2 font-medium">{t('settings.theme')}</legend>
          <div className="grid grid-cols-3 gap-2 sm:max-w-md">
            {THEME_OPTIONS.map(({ value, icon: Icon }) => (
              <label
                key={value}
                className="flex cursor-pointer flex-col items-center gap-1 rounded-xl border border-border px-3 py-3 text-sm font-medium transition-colors hover:bg-surface-muted has-checked:border-primary has-checked:bg-primary-soft has-checked:text-on-primary-soft has-focus-visible:outline-2 has-focus-visible:outline-focus"
              >
                <input
                  type="radio"
                  name="theme"
                  value={value}
                  checked={preference === value}
                  onChange={() => {
                    setPreference(value);
                  }}
                  className="sr-only"
                />
                <Icon aria-hidden="true" className="size-5" />
                {t(`settings.themeOptions.${value}`)}
              </label>
            ))}
          </div>
          <p className="mt-2 text-sm text-fg-muted">{t('settings.themeHint')}</p>
        </fieldset>

        <SelectField
          label={t('settings.language')}
          hint={t('settings.languageHint')}
          value={getLocale()}
          onChange={(event) => {
            if (isLocale(event.target.value)) changeLocale(event.target.value);
          }}
          className="sm:max-w-xs"
        >
          {LOCALES.map((locale) => (
            <option key={locale} value={locale} lang={locale}>
              {LOCALE_NAMES[locale]}
            </option>
          ))}
        </SelectField>
      </div>
    </section>
  );
}
