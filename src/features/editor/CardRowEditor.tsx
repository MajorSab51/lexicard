import { ArrowDown, ArrowUp, ChevronDown, Trash2 } from 'lucide-react';
import { memo, useState, type KeyboardEvent } from 'react';
import { Button } from '@/components/Button';
import { inputClasses } from '@/components/fieldStyles';
import { GENDERS, PARTS_OF_SPEECH } from '@/domain/models';
import { t } from '@/i18n';
import { rowFieldId, type EditorRowState, type RowField } from './editorRows';

interface CardRowEditorProps {
  row: EditorRowState;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  termLabel: string;
  translationLabel: string;
  termLang: string;
  translationLang: string;
  duplicate: boolean;
  incomplete: boolean;
  onChange: (key: string, field: RowField, value: string) => void;
  onEnter: (key: string) => void;
  onMove: (key: string, delta: -1 | 1, field: RowField) => void;
  onRemove: (key: string) => void;
}

const compactInput = `${inputClasses} py-2`;

/** Une carte dans l'éditeur rapide. Mémoïsée : seule la ligne modifiée est re-rendue. */
export const CardRowEditor = memo(function CardRowEditor({
  row,
  index,
  isFirst,
  isLast,
  termLabel,
  translationLabel,
  termLang,
  translationLang,
  duplicate,
  incomplete,
  onChange,
  onEnter,
  onMove,
  onRemove,
}: CardRowEditorProps) {
  const [expanded, setExpanded] = useState(
    () =>
      Boolean(row.content.note || row.content.imageUrl) ||
      row.content.partOfSpeech !== '' ||
      row.content.gender !== '',
  );
  const { key, content } = row;
  const number = index + 1;
  const detailsId = `card-${key}-details`;
  const messageId = `card-${key}-message`;

  const handleKeyDown = (field: RowField) => (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      onEnter(key);
    } else if (event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
      event.preventDefault();
      onMove(key, event.key === 'ArrowUp' ? -1 : 1, field);
    }
  };

  const textInput = (
    field: RowField,
    label: string,
    lang?: string,
    invalid = false,
    className = '',
  ) => (
    <div className={`min-w-0 ${className}`}>
      <input
        id={rowFieldId(key, field)}
        type="text"
        lang={lang}
        value={content[field]}
        onChange={(event) => {
          onChange(key, field, event.target.value);
        }}
        onKeyDown={handleKeyDown(field)}
        aria-invalid={invalid || undefined}
        aria-describedby={incomplete || duplicate ? messageId : undefined}
        autoComplete="off"
        className={compactInput}
      />
      <label
        htmlFor={rowFieldId(key, field)}
        className="mt-1 block text-xs font-medium tracking-wide text-fg-muted uppercase"
      >
        {label}
      </label>
    </div>
  );

  return (
    <li>
      <fieldset className="rounded-2xl border border-border bg-surface p-3 md:p-4">
        <legend className="sr-only">{t('editor.cardNumber', { n: number })}</legend>
        <div className="flex gap-2 md:gap-3">
          <span
            aria-hidden="true"
            className="w-6 shrink-0 pt-2.5 text-right text-sm font-semibold text-fg-muted tabular-nums"
          >
            {number}
          </span>
          <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2 md:gap-3 lg:grid-cols-3">
            {textInput('term', termLabel, termLang, incomplete && !content.term.trim())}
            {textInput(
              'translation',
              translationLabel,
              translationLang,
              incomplete && !content.translation.trim(),
            )}
            {textInput(
              'example',
              t('editor.example'),
              termLang,
              false,
              'sm:col-span-2 lg:col-span-1',
            )}
          </div>
          <div className="flex shrink-0 flex-col gap-1 md:flex-row">
            <button
              type="button"
              aria-expanded={expanded}
              aria-controls={detailsId}
              aria-label={t('editor.options', { n: number })}
              onClick={() => {
                setExpanded((value) => !value);
              }}
              className="flex size-10 items-center justify-center rounded-lg text-fg-muted hover:bg-surface-muted hover:text-fg"
            >
              <ChevronDown
                aria-hidden="true"
                className={`size-5 transition-transform ${expanded ? 'rotate-180' : ''}`}
              />
            </button>
            {/* Raccourci souris ; au clavier, la suppression est dans les options de la carte. */}
            <button
              type="button"
              tabIndex={-1}
              aria-label={t('editor.removeCard')}
              onClick={() => {
                onRemove(key);
              }}
              className="flex size-10 items-center justify-center rounded-lg text-fg-muted hover:bg-surface-muted hover:text-danger"
            >
              <Trash2 aria-hidden="true" className="size-5" />
            </button>
          </div>
        </div>

        {(incomplete || duplicate) && (
          <p
            id={messageId}
            className={`mt-2 ml-8 text-sm md:ml-9 ${incomplete ? 'text-danger' : 'text-warning'}`}
          >
            {incomplete ? t('editor.incomplete') : t('editor.duplicateOf')}
          </p>
        )}

        {expanded && (
          <div id={detailsId} className="mt-3 ml-8 grid gap-3 md:ml-9 md:grid-cols-2">
            <div>
              <label htmlFor={rowFieldId(key, 'note')} className="mb-1 block text-sm font-medium">
                {t('editor.note')}
              </label>
              <textarea
                id={rowFieldId(key, 'note')}
                rows={2}
                value={content.note}
                onChange={(event) => {
                  onChange(key, 'note', event.target.value);
                }}
                className={compactInput}
              />
            </div>
            <div>
              <label
                htmlFor={rowFieldId(key, 'imageUrl')}
                className="mb-1 block text-sm font-medium"
              >
                {t('editor.imageUrl')}
              </label>
              <input
                id={rowFieldId(key, 'imageUrl')}
                type="url"
                inputMode="url"
                placeholder="https://"
                value={content.imageUrl}
                onChange={(event) => {
                  onChange(key, 'imageUrl', event.target.value);
                }}
                aria-describedby={`${detailsId}-image-hint`}
                className={compactInput}
              />
              <p id={`${detailsId}-image-hint`} className="mt-1 text-xs text-fg-muted">
                {t('editor.imageUrlHint')}
              </p>
            </div>
            <div>
              <label
                htmlFor={rowFieldId(key, 'partOfSpeech')}
                className="mb-1 block text-sm font-medium"
              >
                {t('editor.partOfSpeech')}
              </label>
              <select
                id={rowFieldId(key, 'partOfSpeech')}
                value={content.partOfSpeech}
                onChange={(event) => {
                  onChange(key, 'partOfSpeech', event.target.value);
                }}
                className={compactInput}
              >
                <option value="">{t('editor.none')}</option>
                {PARTS_OF_SPEECH.map((value) => (
                  <option key={value} value={value}>
                    {t(`partsOfSpeech.${value}`)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor={rowFieldId(key, 'gender')} className="mb-1 block text-sm font-medium">
                {t('editor.gender')}
              </label>
              <select
                id={rowFieldId(key, 'gender')}
                value={content.gender}
                onChange={(event) => {
                  onChange(key, 'gender', event.target.value);
                }}
                className={compactInput}
              >
                <option value="">{t('editor.none')}</option>
                {GENDERS.map((value) => (
                  <option key={value} value={value}>
                    {t(`genders.${value}`)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap gap-2 md:col-span-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={isFirst}
                onClick={() => {
                  onMove(key, -1, 'term');
                }}
              >
                <ArrowUp aria-hidden="true" className="size-4" />
                {t('editor.moveUp')}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={isLast}
                onClick={() => {
                  onMove(key, 1, 'term');
                }}
              >
                <ArrowDown aria-hidden="true" className="size-4" />
                {t('editor.moveDown')}
              </Button>
              <Button
                variant="dangerOutline"
                size="sm"
                onClick={() => {
                  onRemove(key);
                }}
              >
                <Trash2 aria-hidden="true" className="size-4" />
                {t('editor.removeCard')}
              </Button>
            </div>
          </div>
        )}
      </fieldset>
    </li>
  );
});
