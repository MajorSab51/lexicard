import {
  BookOpen,
  Brain,
  Copy,
  Download,
  GraduationCap,
  Layers,
  ListChecks,
  Pencil,
  Puzzle,
  SquarePen,
  Trash2,
  Upload,
  type LucideIcon,
} from 'lucide-react';
import { useCallback, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Button, ButtonLink } from '@/components/Button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState } from '@/components/EmptyState';
import { Loading } from '@/components/Loading';
import { PageHeader } from '@/components/PageHeader';
import { SET_COLOR_CLASSES } from '@/components/setColors';
import { TagList } from '@/components/TagList';
import { deleteCards } from '@/data/cardsRepository';
import { useSet, useSetCards } from '@/data/hooks';
import { deleteSet, duplicateSet } from '@/data/setsRepository';
import { languageName } from '@/domain/languages';
import type { StudyMode } from '@/domain/models';
import { t, tn, type MessageKey } from '@/i18n';
import { toast } from '@/lib/toast';
import { CardList } from './CardList';
import { ExportDialog } from './ExportDialog';
import { MoveCardsDialog } from './MoveCardsDialog';
import { SetNotFound } from './SetNotFound';

const STUDY_MODES: readonly { mode: StudyMode; labelKey: MessageKey; icon: LucideIcon }[] = [
  { mode: 'flashcards', labelKey: 'study.modes.flashcards', icon: Layers },
  { mode: 'learn', labelKey: 'study.modes.learn', icon: Brain },
  { mode: 'write', labelKey: 'study.modes.write', icon: SquarePen },
  { mode: 'test', labelKey: 'study.modes.test', icon: GraduationCap },
  { mode: 'match', labelKey: 'study.modes.match', icon: Puzzle },
];

type OpenDialog = 'export' | 'deleteSet' | 'deleteCards' | 'moveCards' | null;

export function SetDetailPage() {
  const { setId = '' } = useParams();
  const navigate = useNavigate();
  const set = useSet(setId);
  const cards = useSetCards(setId);
  const [dialog, setDialog] = useState<OpenDialog>(null);
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());

  const toggleSelected = useCallback((id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  if (set === undefined || cards === undefined) return <Loading />;
  if (set === null) return <SetNotFound />;

  // Les cartes supprimées ou déplacées entre-temps ne restent pas sélectionnées.
  const selection = cards.filter((card) => selectedIds.has(card.id)).map((card) => card.id);
  const closeDialog = () => {
    setDialog(null);
  };
  const endSelection = () => {
    setSelecting(false);
    setSelectedIds(new Set());
  };

  const handleDuplicate = async () => {
    const copy = await duplicateSet(set.id, t('setDetail.duplicateTitle', { title: set.title }));
    toast(t('setDetail.duplicated'));
    void navigate(`/sets/${copy.id}`);
  };

  const handleDeleteSet = async () => {
    await deleteSet(set.id);
    toast(t('setDetail.deleted'));
    void navigate('/sets', { replace: true });
  };

  const handleDeleteCards = async () => {
    await deleteCards(selection);
    toast(tn('setDetail.cardsDeleted', selection.length));
    closeDialog();
    endSelection();
  };

  return (
    <>
      <PageHeader
        title={set.title}
        subtitle={`${t('sets.langPair', {
          source: languageName(set.sourceLang),
          target: languageName(set.targetLang),
        })} · ${tn('counts.cards', cards.length)}`}
        actions={
          <ButtonLink to={`/sets/${set.id}/edit`}>
            <Pencil aria-hidden="true" className="size-5" />
            {t('setDetail.edit')}
          </ButtonLink>
        }
      />

      <div className="-mt-3 mb-6 flex flex-wrap items-center gap-3">
        <span
          aria-hidden="true"
          className={`size-3 shrink-0 rounded-full ${SET_COLOR_CLASSES[set.color]}`}
        />
        <TagList tags={set.tags} />
      </div>
      {set.description && <p className="mb-6 max-w-prose whitespace-pre-line">{set.description}</p>}

      <nav aria-label={t('setDetail.actions')} className="mb-8 flex flex-wrap gap-2">
        <ButtonLink variant="secondary" size="sm" to={`/import?set=${set.id}`}>
          <Upload aria-hidden="true" className="size-4" />
          {t('setDetail.importCards')}
        </ButtonLink>
        <Button
          variant="secondary"
          size="sm"
          disabled={cards.length === 0}
          onClick={() => {
            setDialog('export');
          }}
        >
          <Download aria-hidden="true" className="size-4" />
          {t('setDetail.export')}
        </Button>
        <Button variant="secondary" size="sm" onClick={() => void handleDuplicate()}>
          <Copy aria-hidden="true" className="size-4" />
          {t('setDetail.duplicate')}
        </Button>
        <Button
          variant="dangerOutline"
          size="sm"
          onClick={() => {
            setDialog('deleteSet');
          }}
        >
          <Trash2 aria-hidden="true" className="size-4" />
          {t('setDetail.delete')}
        </Button>
      </nav>

      <section aria-labelledby="study-title" className="mb-8">
        <h2 id="study-title" className="mb-3 text-lg font-semibold">
          {t('setDetail.study')}
        </h2>
        {cards.length === 0 ? (
          <p className="text-fg-muted">{t('setDetail.studyNeedsCards')}</p>
        ) : (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {STUDY_MODES.map(({ mode, labelKey, icon: Icon }) => (
              <li key={mode}>
                <Link
                  to={`/sets/${set.id}/${mode}`}
                  className="flex h-full flex-col items-center gap-2 rounded-2xl border border-border bg-surface px-3 py-4 text-center font-medium transition-colors hover:border-primary hover:bg-primary-soft hover:text-on-primary-soft"
                >
                  <Icon aria-hidden="true" className="size-6 text-primary" />
                  {t(labelKey)}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="cards-title">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 id="cards-title" className="text-lg font-semibold">
            {t('setDetail.cards')}
          </h2>
          {cards.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              aria-pressed={selecting}
              onClick={() => {
                if (selecting) endSelection();
                else setSelecting(true);
              }}
            >
              <ListChecks aria-hidden="true" className="size-4" />
              {selecting ? t('setDetail.endSelection') : t('setDetail.selectMode')}
            </Button>
          )}
        </div>

        {selecting && (
          <div className="sticky top-2 z-20 mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-surface p-2 shadow-sm">
            <p className="px-2 text-sm font-medium" aria-live="polite">
              {tn('setDetail.selectedCount', selection.length)}
            </p>
            <div className="ml-auto flex flex-wrap gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedIds(
                    selection.length === cards.length
                      ? new Set()
                      : new Set(cards.map((card) => card.id)),
                  );
                }}
              >
                {selection.length === cards.length
                  ? t('setDetail.deselectAll')
                  : t('setDetail.selectAll')}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={selection.length === 0}
                onClick={() => {
                  setDialog('moveCards');
                }}
              >
                {t('setDetail.moveSelected')}
              </Button>
              <Button
                variant="danger"
                size="sm"
                disabled={selection.length === 0}
                onClick={() => {
                  setDialog('deleteCards');
                }}
              >
                {t('setDetail.deleteSelected')}
              </Button>
            </div>
          </div>
        )}

        {cards.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title={t('setDetail.noCardsTitle')}
            body={t('setDetail.noCardsBody')}
            action={<ButtonLink to={`/sets/${set.id}/edit`}>{t('setDetail.addCards')}</ButtonLink>}
          />
        ) : (
          <CardList
            cards={cards}
            termLang={set.sourceLang}
            translationLang={set.targetLang}
            selecting={selecting}
            selectedIds={selectedIds}
            onToggleSelected={toggleSelected}
          />
        )}
      </section>

      <ExportDialog setId={set.id} open={dialog === 'export'} onClose={closeDialog} />
      <ConfirmDialog
        open={dialog === 'deleteSet'}
        title={t('setDetail.deleteTitle')}
        description={tn('setDetail.deleteBody', cards.length)}
        confirmLabel={t('setDetail.deleteConfirm')}
        danger
        onConfirm={() => void handleDeleteSet()}
        onCancel={closeDialog}
      />
      <ConfirmDialog
        open={dialog === 'deleteCards'}
        title={tn('setDetail.deleteCardsTitle', selection.length)}
        description={t('setDetail.deleteCardsBody')}
        confirmLabel={t('common.delete')}
        danger
        onConfirm={() => void handleDeleteCards()}
        onCancel={closeDialog}
      />
      {dialog === 'moveCards' && (
        <MoveCardsDialog
          open
          sourceSetId={set.id}
          cardIds={selection}
          onClose={closeDialog}
          onMoved={() => {
            closeDialog();
            endSelection();
          }}
        />
      )}
    </>
  );
}
