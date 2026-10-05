import { Monitor, Moon, Sun, type LucideIcon } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { t } from '@/i18n';
import type { ThemePreference } from '@/lib/theme';
import { DataSection } from './DataSection';
import { useThemeStore } from './themeStore';

const THEME_OPTIONS: readonly { value: ThemePreference; icon: LucideIcon }[] = [
  { value: 'light', icon: Sun },
  { value: 'dark', icon: Moon },
  { value: 'system', icon: Monitor },
];

export function SettingsPage() {
  const preference = useThemeStore((state) => state.preference);
  const setPreference = useThemeStore((state) => state.setPreference);

  return (
    <>
      <PageHeader title={t('settings.title')} />

      <div className="grid gap-6">
        <section className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="mb-4 text-lg font-semibold">{t('settings.appearance')}</h2>
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
        </section>

        <DataSection />
      </div>
    </>
  );
}
