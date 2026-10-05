import { ClipboardPaste, FileUp, RotateCcw } from 'lucide-react';
import { useMemo, useState, type ChangeEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Button } from '@/components/Button';
import { SelectField, TextAreaField, TextField } from '@/components/fields';
import { LanguageSelect } from '@/components/LanguageSelect';
import { Loading } from '@/components/Loading';
import { PageHeader } from '@/components/PageHeader';
import { useSetCards, useSets } from '@/data/hooks';
import { readFileText } from '@/data/import-export/decode';
import {
  commitImport,
  parseCardsSource,
  type ParsedCardsSource,
} from '@/data/import-export/importer';
import { buildImportPreview, type PreviewStatus } from '@/domain/importPreview';
import { DEFAULT_SOURCE_LANG, DEFAULT_TARGET_LANG } from '@/domain/languages';
import type { StudySet } from '@/domain/models';
import { t, tn } from '@/i18n';
import { todayStamp } from '@/lib/download';
import { toast } from '@/lib/toast';
import { importErrorMessage } from './importErrors';
import { ImportPreviewTable } from './ImportPreviewTable';

interface LoadedSource {
  name: string;
  parsed: ParsedCardsSource;
}

interface NewSetDraft {
  title: string;
  sourceLang: string;
  targetLang: string;
}

const STATUSES: readonly PreviewStatus[] = [
  'ok',
  'duplicate-existing',
  'duplicate-file',
  'invalid',
];

export function ImportPage() {
  const sets = useSets();
  if (!sets) return <Loading />;
  return <ImportWizard sets={sets} />;
}

function ImportWizard({ sets }: { sets: StudySet[] }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const requestedSet = sets.find((set) => set.id === params.get('set'));

  const [tab, setTab] = useState<'file' | 'paste'>('file');
  const [pasteText, setPasteText] = useState('');
  const [source, setSource] = useState<LoadedSource | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [targetKind, setTargetKind] = useState<'existing' | 'new'>(
    requestedSet ? 'existing' : 'new',
  );
  const [targetSetId, setTargetSetId] = useState(requestedSet?.id ?? sets[0]?.id ?? '');
  const [draft, setDraft] = useState<NewSetDraft>({
    title: '',
    sourceLang: sets[0]?.sourceLang ?? DEFAULT_SOURCE_LANG,
    targetLang: sets[0]?.targetLang ?? DEFAULT_TARGET_LANG,
  });
  const [overrides, setOverrides] = useState<ReadonlyMap<number, boolean>>(new Map());
  const [importing, setImporting] = useState(false);

  const targetSet =
    targetKind === 'existing' ? sets.find((set) => set.id === targetSetId) : undefined;
  const existingCards = useSetCards(targetSet?.id);
  const preview = useMemo(
    () =>
      source && existingCards
        ? buildImportPreview(
            source.parsed.rows,
            existingCards.map((card) => card.term),
          )
        : null,
    [source, existingCards],
  );

  const loadText = (text: string, name: string, filename = '') => {
    try {
      const parsed = parseCardsSource(text, filename);
      setSource({ name, parsed });
      setError(null);
      setOverrides(new Map());
      const meta = parsed.setMeta;
      setDraft((current) => ({
        title: meta?.title ?? (filename ? filename.replace(/\.[^.]+$/, '') : current.title),
        sourceLang: meta?.sourceLang ?? current.sourceLang,
        targetLang: meta?.targetLang ?? current.targetLang,
      }));
      if (meta && !requestedSet) setTargetKind('new');
    } catch (caught) {
      setSource(null);
      setError(importErrorMessage(caught));
    }
  };

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      loadText(await readFileText(file), file.name, file.name);
    } catch (caught) {
      setError(importErrorMessage(caught));
    }
  };

  const changeTarget = (update: () => void) => {
    update();
    // Les doublons dépendent du set cible : on revient à la sélection proposée.
    setOverrides(new Map());
  };

  const isSelected = (index: number) =>
    overrides.get(index) ?? preview?.rows[index]?.selected ?? false;
  const toggle = (index: number) => {
    setOverrides((current) => new Map(current).set(index, !isSelected(index)));
  };
  const selectWhere = (predicate: (status: PreviewStatus) => boolean) => {
    if (!preview) return;
    setOverrides(
      new Map(
        preview.rows.map((row, index) => [
          index,
          row.status !== 'invalid' && predicate(row.status),
        ]),
      ),
    );
  };

  const selectedContents = preview
    ? preview.rows.filter((_, index) => isSelected(index)).map((row) => row.content)
    : [];
  const newSetTitle = draft.title.trim() || t('import.defaultSetTitle', { date: todayStamp() });
  const canImport =
    selectedContents.length > 0 && (targetKind === 'new' || targetSet !== undefined) && !importing;

  const submit = async () => {
    if (!canImport) return;
    setImporting(true);
    try {
      const meta = source?.parsed.setMeta;
      const result = await commitImport(
        targetKind === 'existing' && targetSet
          ? { kind: 'existing', setId: targetSet.id }
          : {
              kind: 'new',
              input: {
                title: newSetTitle,
                description: meta?.description ?? '',
                sourceLang: draft.sourceLang,
                targetLang: draft.targetLang,
                color: meta?.color ?? 'teal',
                tags: meta?.tags ?? [],
              },
            },
        selectedContents,
      );
      toast(tn('import.imported', result.added));
      void navigate(`/sets/${result.setId}`);
    } catch {
      toast(t('common.unexpectedError'), 'error');
      setImporting(false);
    }
  };

  const termLang = targetSet?.sourceLang ?? draft.sourceLang;
  const translationLang = targetSet?.targetLang ?? draft.targetLang;

  return (
    <>
      <PageHeader title={t('import.title')} />

      <section aria-labelledby="import-source" className="mb-8">
        <h2 id="import-source" className="mb-3 text-lg font-semibold">
          {t('import.sourceSection')}
        </h2>
        {source ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4">
            <p>
              {t('import.sourceLoaded', { name: source.name })} ·{' '}
              {tn('counts.cards', source.parsed.rows.length)}
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSource(null);
              }}
            >
              <RotateCcw aria-hidden="true" className="size-4" />
              {t('import.changeSource')}
            </Button>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-surface p-4">
            <div
              role="radiogroup"
              aria-label={t('import.sourceSection')}
              className="mb-4 flex gap-2"
            >
              {(['file', 'paste'] as const).map((value) => (
                <Button
                  key={value}
                  role="radio"
                  aria-checked={tab === value}
                  variant={tab === value ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => {
                    setTab(value);
                  }}
                >
                  {value === 'file' ? (
                    <FileUp aria-hidden="true" className="size-4" />
                  ) : (
                    <ClipboardPaste aria-hidden="true" className="size-4" />
                  )}
                  {value === 'file' ? t('import.fileTab') : t('import.pasteTab')}
                </Button>
              ))}
            </div>
            {tab === 'file' ? (
              <TextField
                type="file"
                accept=".csv,.tsv,.txt,.json,text/csv,application/json,text/plain"
                label={t('import.fileLabel')}
                hint={t('import.fileHint')}
                onChange={(event) => void handleFile(event)}
                className="file:mr-3 file:rounded-lg file:border-0 file:bg-primary-soft file:px-3 file:py-1.5 file:font-medium file:text-on-primary-soft"
              />
            ) : (
              <div className="grid gap-3">
                <TextAreaField
                  label={t('import.pasteLabel')}
                  hint={t('import.pasteHint')}
                  rows={8}
                  value={pasteText}
                  onChange={(event) => {
                    setPasteText(event.target.value);
                  }}
                  className="font-mono text-sm"
                />
                <Button
                  className="justify-self-start"
                  disabled={!pasteText.trim()}
                  onClick={() => {
                    loadText(pasteText, t('import.pastedText'));
                  }}
                >
                  {t('import.analyze')}
                </Button>
              </div>
            )}
            {error && (
              <p role="alert" className="mt-3 text-danger">
                {error}
              </p>
            )}
          </div>
        )}
      </section>

      {source && (
        <>
          <section aria-labelledby="import-destination" className="mb-8">
            <h2 id="import-destination" className="mb-3 text-lg font-semibold">
              {t('import.destinationSection')}
            </h2>
            <div className="grid gap-4 rounded-2xl border border-border bg-surface p-4">
              <fieldset className="flex flex-wrap gap-x-6 gap-y-2">
                <legend className="sr-only">{t('import.destinationSection')}</legend>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="import-target"
                    checked={targetKind === 'new'}
                    onChange={() => {
                      changeTarget(() => {
                        setTargetKind('new');
                      });
                    }}
                    className="size-4 accent-(--primary)"
                  />
                  {t('import.newSet')}
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="import-target"
                    checked={targetKind === 'existing'}
                    disabled={sets.length === 0}
                    onChange={() => {
                      changeTarget(() => {
                        setTargetKind('existing');
                      });
                    }}
                    className="size-4 accent-(--primary)"
                  />
                  {t('import.existingSet')}
                </label>
              </fieldset>

              {targetKind === 'existing' ? (
                <SelectField
                  label={t('import.targetSet')}
                  value={targetSet?.id ?? ''}
                  onChange={(event) => {
                    changeTarget(() => {
                      setTargetSetId(event.target.value);
                    });
                  }}
                >
                  {sets.map((set) => (
                    <option key={set.id} value={set.id}>
                      {set.title}
                    </option>
                  ))}
                </SelectField>
              ) : (
                <div className="grid gap-3 sm:grid-cols-3">
                  <TextField
                    label={t('import.newSetTitle')}
                    value={draft.title}
                    placeholder={newSetTitle}
                    onChange={(event) => {
                      setDraft({ ...draft, title: event.target.value });
                    }}
                  />
                  <LanguageSelect
                    label={t('editor.sourceLang')}
                    value={draft.sourceLang}
                    onChange={(event) => {
                      setDraft({ ...draft, sourceLang: event.target.value });
                    }}
                  />
                  <LanguageSelect
                    label={t('editor.targetLang')}
                    value={draft.targetLang}
                    onChange={(event) => {
                      setDraft({ ...draft, targetLang: event.target.value });
                    }}
                  />
                </div>
              )}
            </div>
          </section>

          <section aria-labelledby="import-preview">
            <h2 id="import-preview" className="mb-3 text-lg font-semibold">
              {t('import.previewSection')}
            </h2>
            {!preview ? (
              <Loading />
            ) : (
              <>
                <ul className="mb-3 flex flex-wrap gap-2" aria-label={t('import.status')}>
                  {STATUSES.filter((status) => preview.counts[status] > 0).map((status) => (
                    <li
                      key={status}
                      className="rounded-full border border-border bg-surface px-3 py-1 text-sm"
                    >
                      {t(`import.statuses.${status}`)} : <strong>{preview.counts[status]}</strong>
                    </li>
                  ))}
                </ul>
                <div className="mb-3 flex flex-wrap gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      selectWhere(() => true);
                    }}
                  >
                    {t('import.selectAll')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      selectWhere((status) => status === 'ok');
                    }}
                  >
                    {t('import.selectNew')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      selectWhere(() => false);
                    }}
                  >
                    {t('import.selectNone')}
                  </Button>
                </div>
                <ImportPreviewTable
                  rows={preview.rows}
                  isSelected={isSelected}
                  onToggle={toggle}
                  termLang={termLang}
                  translationLang={translationLang}
                />
                <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 -mx-4 mt-6 flex justify-end border-t border-border bg-bg/95 px-4 py-3 backdrop-blur md:bottom-0 md:mx-0 md:px-0">
                  <Button disabled={!canImport} onClick={() => void submit()}>
                    {tn('import.submit', selectedContents.length)}
                  </Button>
                </div>
              </>
            )}
          </section>
        </>
      )}
    </>
  );
}
