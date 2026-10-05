import { FileJson, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/Button';
import { Dialog } from '@/components/Dialog';
import type { Id } from '@/domain/models';
import { t } from '@/i18n';
import { downloadFile } from '@/lib/download';
import { toast } from '@/lib/toast';

interface ExportDialogProps {
  setId: Id;
  open: boolean;
  onClose: () => void;
}

export function ExportDialog({ setId, open, onClose }: ExportDialogProps) {
  const run = async (format: 'csv' | 'json') => {
    try {
      // Chargé à la demande : la bibliothèque CSV n'alourdit pas le premier affichage.
      const exporters = await import('@/data/import-export/exporters');
      const file = await (format === 'csv' ? exporters.exportSetCsv : exporters.exportSetJson)(
        setId,
      );
      downloadFile(file.filename, file.content, file.mimeType);
      toast(t('setDetail.exported'));
      onClose();
    } catch {
      toast(t('common.unexpectedError'), 'error');
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('setDetail.exportTitle')}
      description={t('setDetail.exportBody')}
    >
      <div className="grid gap-2 sm:grid-cols-2">
        <Button variant="secondary" onClick={() => void run('csv')}>
          <FileSpreadsheet aria-hidden="true" className="size-5" />
          {t('setDetail.exportCsv')}
        </Button>
        <Button variant="secondary" onClick={() => void run('json')}>
          <FileJson aria-hidden="true" className="size-5" />
          {t('setDetail.exportJson')}
        </Button>
      </div>
    </Dialog>
  );
}
