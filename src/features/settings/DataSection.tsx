import { Download, FileSpreadsheet, HardDrive, Upload } from 'lucide-react';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Button } from '@/components/Button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { isStoragePersisted } from '@/data/db';
import { parseBackup, restoreBackup, type ParsedBackup } from '@/data/import-export/backup';
import { readFileText } from '@/data/import-export/decode';
import { exportAllCardsCsv, exportBackup, type ExportFile } from '@/data/import-export/exporters';
import { importErrorMessage } from '@/features/import/importErrors';
import { t, tn } from '@/i18n';
import { downloadFile } from '@/lib/download';
import { toast } from '@/lib/toast';

function formatDate(iso: string) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleDateString('fr', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Sauvegarde, export global et restauration des données. */
export function DataSection() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<ParsedBackup | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [persisted, setPersisted] = useState<boolean | null>(null);

  useEffect(() => {
    void isStoragePersisted().then(setPersisted);
  }, []);

  const download = async (build: () => Promise<ExportFile>) => {
    try {
      const file = await build();
      downloadFile(file.filename, file.content, file.mimeType);
    } catch {
      toast(t('common.unexpectedError'), 'error');
    }
  };

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      setPending(parseBackup(await readFileText(file)));
    } catch (error) {
      toast(importErrorMessage(error), 'error');
    }
  };

  const confirmRestore = async () => {
    if (!pending) return;
    setRestoring(true);
    try {
      await restoreBackup(pending.backup);
      toast(
        pending.skipped > 0
          ? tn('settings.restoredSkipped', pending.skipped)
          : t('settings.restored'),
      );
      setPending(null);
    } catch {
      toast(t('common.unexpectedError'), 'error');
    } finally {
      setRestoring(false);
    }
  };

  return (
    <section
      aria-labelledby="settings-data"
      className="rounded-2xl border border-border bg-surface p-5"
    >
      <h2 id="settings-data" className="mb-1 text-lg font-semibold">
        {t('settings.data')}
      </h2>
      <p className="mb-4 text-fg-muted">{t('settings.dataHint')}</p>

      <div className="grid gap-4">
        <div>
          <Button onClick={() => void download(exportBackup)}>
            <Download aria-hidden="true" className="size-5" />
            {t('settings.backup')}
          </Button>
          <p className="mt-1.5 text-sm text-fg-muted">{t('settings.backupHint')}</p>
        </div>
        <div>
          <Button variant="secondary" onClick={() => void download(exportAllCardsCsv)}>
            <FileSpreadsheet aria-hidden="true" className="size-5" />
            {t('settings.exportAllCsv')}
          </Button>
        </div>
        <div>
          <input
            ref={fileInput}
            type="file"
            accept=".json,application/json"
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(event) => void handleFile(event)}
          />
          <Button
            variant="secondary"
            onClick={() => {
              fileInput.current?.click();
            }}
          >
            <Upload aria-hidden="true" className="size-5" />
            {t('settings.restore')}
          </Button>
          <p className="mt-1.5 text-sm text-fg-muted">{t('settings.restoreHint')}</p>
        </div>
        {persisted !== null && (
          <div className="flex gap-3 rounded-xl bg-surface-muted p-3 text-sm">
            <HardDrive aria-hidden="true" className="size-5 shrink-0 text-fg-muted" />
            <p>
              <strong>{t('settings.storage')}</strong> —{' '}
              {persisted ? t('settings.storagePersisted') : t('settings.storageNotPersisted')}
            </p>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={pending !== null}
        title={t('settings.restoreTitle')}
        description={
          pending
            ? t('settings.restoreBody', {
                date: formatDate(pending.backup.exportedAt),
                sets: tn('counts.sets', pending.backup.data.sets.length),
                cards: tn('counts.cards', pending.backup.data.cards.length),
              })
            : ''
        }
        confirmLabel={t('settings.restoreConfirm')}
        danger
        busy={restoring}
        onConfirm={() => void confirmRestore()}
        onCancel={() => {
          setPending(null);
        }}
      />
    </section>
  );
}
