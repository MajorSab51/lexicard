import type { PreviewRow, PreviewStatus } from '@/domain/importPreview';
import { t } from '@/i18n';

/** Nombre maximal de lignes affichées ; les suivantes sont importées selon leur sélection par défaut. */
export const PREVIEW_LIMIT = 500;

const STATUS_CLASSES: Record<PreviewStatus, string> = {
  ok: 'bg-primary-soft text-on-primary-soft',
  'duplicate-existing': 'bg-surface-muted text-warning',
  'duplicate-file': 'bg-surface-muted text-warning',
  invalid: 'bg-surface-muted text-danger',
};

interface ImportPreviewTableProps {
  rows: readonly PreviewRow[];
  isSelected: (index: number) => boolean;
  onToggle: (index: number) => void;
  termLang: string;
  translationLang: string;
}

export function ImportPreviewTable({
  rows,
  isSelected,
  onToggle,
  termLang,
  translationLang,
}: ImportPreviewTableProps) {
  const visible = rows.slice(0, PREVIEW_LIMIT);

  return (
    <>
      <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead className="border-b border-border text-fg-muted">
            <tr>
              <th scope="col" className="w-12 px-3 py-2 font-medium">
                <span className="sr-only">{t('import.include')}</span>
              </th>
              <th scope="col" className="w-14 px-2 py-2 font-medium">
                {t('import.line')}
              </th>
              <th scope="col" className="px-2 py-2 font-medium">
                {t('editor.term')}
              </th>
              <th scope="col" className="px-2 py-2 font-medium">
                {t('editor.translation')}
              </th>
              <th scope="col" className="hidden px-2 py-2 font-medium md:table-cell">
                {t('editor.example')}
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                {t('import.status')}
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row, index) => {
              const disabled = row.status === 'invalid';
              return (
                <tr
                  key={`${row.line}-${index}`}
                  className={`border-b border-border last:border-0 ${disabled ? 'text-fg-muted' : ''}`}
                >
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={isSelected(index)}
                      disabled={disabled}
                      onChange={() => {
                        onToggle(index);
                      }}
                      aria-label={t('import.includeLine', { line: row.line })}
                      className="size-5 accent-(--primary)"
                    />
                  </td>
                  <td className="px-2 py-2 tabular-nums">{row.line}</td>
                  <td lang={termLang} className="px-2 py-2 break-words">
                    {row.content.term}
                  </td>
                  <td lang={translationLang} className="px-2 py-2 break-words">
                    {row.content.translation}
                  </td>
                  <td
                    lang={termLang}
                    className="hidden px-2 py-2 break-words text-fg-muted md:table-cell"
                  >
                    {row.content.example}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${STATUS_CLASSES[row.status]}`}
                    >
                      {t(`import.statuses.${row.status}`)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {rows.length > PREVIEW_LIMIT && (
        <p className="mt-2 text-sm text-fg-muted">
          {t('import.previewLimit', { count: PREVIEW_LIMIT })}
        </p>
      )}
    </>
  );
}
