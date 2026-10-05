import { ImportError } from '@/data/import-export/errors';
import { t } from '@/i18n';

/** Message lisible pour une erreur de lecture de fichier. */
export function importErrorMessage(error: unknown): string {
  return error instanceof ImportError
    ? t(`import.errors.${error.code}`)
    : t('import.errors.unknown');
}
