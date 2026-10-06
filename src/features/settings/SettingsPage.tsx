import { PageHeader } from '@/components/PageHeader';
import { t } from '@/i18n';
import { AppearanceSection } from './AppearanceSection';
import { AppSection } from './AppSection';
import { AudioSection } from './AudioSection';
import { DataSection } from './DataSection';
import { LearningSection } from './LearningSection';

export function SettingsPage() {
  return (
    <>
      <PageHeader title={t('settings.title')} />

      <div className="grid gap-6">
        <AppearanceSection />
        <LearningSection />
        <AudioSection />
        <DataSection />
        <AppSection />
      </div>
    </>
  );
}
