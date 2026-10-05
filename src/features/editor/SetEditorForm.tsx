import { ArrowLeftRight, Plus } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import { useBlocker, useNavigate } from 'react-router';
import { Button, ButtonLink } from '@/components/Button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { TextAreaField, TextField } from '@/components/fields';
import { LanguageSelect } from '@/components/LanguageSelect';
import { PageHeader } from '@/components/PageHeader';
import { saveSetWithCards, type SetInput } from '@/data/setsRepository';
import { findDuplicateIndices, isBlankCard, isCompleteCard, parseTags } from '@/domain/cards';
import { languageName } from '@/domain/languages';
import type { Id } from '@/domain/models';
import { t, tn } from '@/i18n';
import { toast } from '@/lib/toast';
import { CardRowEditor } from './CardRowEditor';
import { ColorPicker } from './ColorPicker';
import {
  editorRowsReducer,
  newRow,
  rowFieldId,
  type EditorAction,
  type EditorRowState,
  type RowField,
} from './editorRows';

interface SetEditorFormProps {
  setId: Id | null;
  initialInput: SetInput;
  initialRows: EditorRowState[];
}

const TITLE_INPUT_ID = 'set-title';

function isIncomplete(row: EditorRowState) {
  return !isBlankCard(row.content) && !isCompleteCard(row.content);
}

export function SetEditorForm({ setId, initialInput, initialRows }: SetEditorFormProps) {
  const navigate = useNavigate();
  const [meta, setMeta] = useState({
    title: initialInput.title,
    description: initialInput.description,
    sourceLang: initialInput.sourceLang,
    targetLang: initialInput.targetLang,
    color: initialInput.color,
    tagsText: initialInput.tags.join(', '),
  });
  const [rows, dispatchRows] = useReducer(editorRowsReducer, initialRows);
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);
  const dirtyRef = useRef(false);
  const rowsRef = useRef(rows);
  // Champ à focaliser après le prochain rendu des lignes (insertion, déplacement, suppression).
  const pendingFocus = useRef<{ key: string; field: RowField } | null>(null);

  useEffect(() => {
    rowsRef.current = rows;
    const target = pendingFocus.current;
    if (!target) return;
    pendingFocus.current = null;
    document.getElementById(rowFieldId(target.key, target.field))?.focus();
  }, [rows]);

  /** Applique une action sur les lignes, puis place éventuellement le focus sur un champ. */
  const change = useCallback((action: EditorAction, focus?: { key: string; field: RowField }) => {
    dirtyRef.current = true;
    if (focus) pendingFocus.current = focus;
    dispatchRows(action);
  }, []);

  const updateMeta = <K extends keyof typeof meta>(field: K, value: (typeof meta)[K]) => {
    dirtyRef.current = true;
    setMeta((current) => ({ ...current, [field]: value }));
  };

  const handleChange = useCallback(
    (key: string, field: RowField, value: string) => {
      change({ type: 'update', key, field, value });
    },
    [change],
  );

  const handleEnter = useCallback(
    (key: string) => {
      const row = newRow();
      change({ type: 'insert', afterKey: key, row }, { key: row.key, field: 'term' });
    },
    [change],
  );

  const handleMove = useCallback(
    (key: string, delta: -1 | 1, field: RowField) => {
      const current = rowsRef.current;
      const target = current.findIndex((row) => row.key === key) + delta;
      if (target < 0 || target >= current.length) return;
      change({ type: 'move', key, delta }, { key, field });
    },
    [change],
  );

  const handleRemove = useCallback(
    (key: string) => {
      const current = rowsRef.current;
      const index = current.findIndex((row) => row.key === key);
      const neighbour = current[index - 1] ?? current[index + 1];
      change({ type: 'remove', key }, neighbour && { key: neighbour.key, field: 'term' });
    },
    [change],
  );

  const addRow = () => {
    const row = newRow();
    change({ type: 'insert', afterKey: null, row }, { key: row.key, field: 'term' });
  };

  const duplicates = useMemo(
    () => findDuplicateIndices(rows.map((row) => row.content.term)),
    [rows],
  );
  const filledCount = rows.filter((row) => !isBlankCard(row.content)).length;
  const titleError = showErrors && !meta.title.trim() ? t('editor.titleRequired') : undefined;

  const save = async () => {
    setShowErrors(true);
    const firstIncomplete = rows.find(isIncomplete);
    if (!meta.title.trim() || firstIncomplete) {
      toast(t('editor.fixErrors'), 'error');
      if (!meta.title.trim()) document.getElementById(TITLE_INPUT_ID)?.focus();
      else if (firstIncomplete) {
        const field = firstIncomplete.content.term.trim() ? 'translation' : 'term';
        document.getElementById(rowFieldId(firstIncomplete.key, field))?.focus();
      }
      return;
    }

    setSaving(true);
    try {
      const id = await saveSetWithCards(
        setId,
        {
          title: meta.title,
          description: meta.description,
          sourceLang: meta.sourceLang,
          targetLang: meta.targetLang,
          color: meta.color,
          tags: parseTags(meta.tagsText),
        },
        rows.map(({ id: cardId, content }) => (cardId ? { id: cardId, content } : { content })),
      );
      dirtyRef.current = false;
      toast(t('editor.saved'));
      void navigate(`/sets/${id}`);
    } catch {
      toast(t('editor.saveError'), 'error');
      setSaving(false);
    }
  };

  // Ctrl + S (ou Cmd + S) enregistre sans quitter le clavier.
  const onShortcut = useEffectEvent((event: KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      void save();
    }
  });
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      onShortcut(event);
    };
    window.addEventListener('keydown', listener);
    return () => {
      window.removeEventListener('keydown', listener);
    };
  }, []);

  // Protection contre la perte des modifications : navigation interne et fermeture de l'onglet.
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirtyRef.current && currentLocation.pathname !== nextLocation.pathname,
  );
  useEffect(() => {
    const listener = (event: BeforeUnloadEvent) => {
      if (dirtyRef.current) event.preventDefault();
    };
    window.addEventListener('beforeunload', listener);
    return () => {
      window.removeEventListener('beforeunload', listener);
    };
  }, []);

  const termLanguage = languageName(meta.sourceLang);
  const translationLanguage = languageName(meta.targetLang);
  const termLabel = `${t('editor.term')} · ${termLanguage}`;
  const translationLabel = `${t('editor.translation')} · ${translationLanguage}`;

  return (
    <>
      <PageHeader
        title={setId ? t('editor.editTitle') : t('editor.createTitle')}
        actions={
          <Button onClick={() => void save()} disabled={saving} className="hidden md:inline-flex">
            {t('common.save')}
          </Button>
        }
      />

      <section
        aria-labelledby="editor-details"
        className="mb-8 rounded-2xl border border-border bg-surface p-4 md:p-5"
      >
        <h2 id="editor-details" className="mb-4 text-lg font-semibold">
          {t('editor.detailsSection')}
        </h2>
        <div className="grid gap-4">
          <TextField
            id={TITLE_INPUT_ID}
            label={t('editor.title')}
            placeholder={t('editor.titlePlaceholder')}
            value={meta.title}
            maxLength={200}
            required
            error={titleError}
            onChange={(event) => {
              updateMeta('title', event.target.value);
            }}
          />
          <TextAreaField
            label={t('editor.description')}
            rows={2}
            value={meta.description}
            onChange={(event) => {
              updateMeta('description', event.target.value);
            }}
          />
          <div className="grid items-end gap-3 sm:grid-cols-[1fr_auto_1fr]">
            <LanguageSelect
              label={t('editor.sourceLang')}
              value={meta.sourceLang}
              onChange={(event) => {
                updateMeta('sourceLang', event.target.value);
              }}
            />
            <Button
              variant="ghost"
              aria-label={t('editor.swapLangs')}
              title={t('editor.swapLangs')}
              className="justify-self-center"
              onClick={() => {
                dirtyRef.current = true;
                setMeta((current) => ({
                  ...current,
                  sourceLang: current.targetLang,
                  targetLang: current.sourceLang,
                }));
              }}
            >
              <ArrowLeftRight aria-hidden="true" className="size-5" />
            </Button>
            <LanguageSelect
              label={t('editor.targetLang')}
              value={meta.targetLang}
              onChange={(event) => {
                updateMeta('targetLang', event.target.value);
              }}
            />
          </div>
          <ColorPicker
            value={meta.color}
            onChange={(color) => {
              updateMeta('color', color);
            }}
          />
          <TextField
            label={t('editor.tags')}
            hint={t('editor.tagsHint')}
            placeholder={t('editor.tagsPlaceholder')}
            value={meta.tagsText}
            onChange={(event) => {
              updateMeta('tagsText', event.target.value);
            }}
          />
        </div>
      </section>

      <section aria-labelledby="editor-cards">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="editor-cards" className="text-lg font-semibold">
            {t('editor.cardsSection')}{' '}
            <span className="font-normal text-fg-muted">({tn('counts.cards', filledCount)})</span>
          </h2>
          <p className="hidden text-sm text-fg-muted md:block">{t('editor.shortcuts')}</p>
        </div>
        <ol className="grid gap-3">
          {rows.map((row, index) => (
            <CardRowEditor
              key={row.key}
              row={row}
              index={index}
              isFirst={index === 0}
              isLast={index === rows.length - 1}
              termLabel={termLabel}
              translationLabel={translationLabel}
              termLang={meta.sourceLang}
              translationLang={meta.targetLang}
              duplicate={duplicates.has(index)}
              incomplete={showErrors && isIncomplete(row)}
              onChange={handleChange}
              onEnter={handleEnter}
              onMove={handleMove}
              onRemove={handleRemove}
            />
          ))}
        </ol>
        <Button variant="secondary" className="mt-3 w-full" onClick={addRow}>
          <Plus aria-hidden="true" className="size-5" />
          {t('editor.addCard')}
        </Button>
      </section>

      {/* Barre d'actions collée en bas, au-dessus de la navigation sur mobile. */}
      <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 -mx-4 mt-6 flex justify-end gap-2 border-t border-border bg-bg/95 px-4 py-3 backdrop-blur md:bottom-0 md:mx-0 md:rounded-t-2xl md:px-0">
        <ButtonLink variant="secondary" to={setId ? `/sets/${setId}` : '/sets'}>
          {t('common.cancel')}
        </ButtonLink>
        <Button onClick={() => void save()} disabled={saving}>
          {t('common.save')}
        </Button>
      </div>

      <ConfirmDialog
        open={blocker.state === 'blocked'}
        title={t('editor.leaveTitle')}
        description={t('editor.leaveBody')}
        confirmLabel={t('editor.leaveConfirm')}
        danger
        onConfirm={() => {
          blocker.proceed?.();
        }}
        onCancel={() => {
          blocker.reset?.();
        }}
      />
    </>
  );
}
