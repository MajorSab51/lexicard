import { useState } from 'react';
import { Button } from '@/components/Button';
import { Dialog } from '@/components/Dialog';
import { SelectField } from '@/components/fields';
import { moveCards } from '@/data/cardsRepository';
import { useSets } from '@/data/hooks';
import type { Id } from '@/domain/models';
import { t, tn } from '@/i18n';
import { toast } from '@/lib/toast';

interface MoveCardsDialogProps {
  open: boolean;
  sourceSetId: Id;
  cardIds: Id[];
  onClose: () => void;
  onMoved: () => void;
}

export function MoveCardsDialog({
  open,
  sourceSetId,
  cardIds,
  onClose,
  onMoved,
}: MoveCardsDialogProps) {
  const others = (useSets() ?? []).filter((set) => set.id !== sourceSetId);
  const [targetId, setTargetId] = useState('');
  const selectedTarget = others.some((set) => set.id === targetId)
    ? targetId
    : (others[0]?.id ?? '');

  const confirm = async () => {
    if (!selectedTarget) return;
    try {
      await moveCards(cardIds, selectedTarget);
      toast(tn('setDetail.moved', cardIds.length));
      onMoved();
    } catch {
      toast(t('common.unexpectedError'), 'error');
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('setDetail.moveTitle')}
      description={tn('setDetail.selectedCount', cardIds.length)}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button disabled={!selectedTarget} onClick={() => void confirm()}>
            {t('setDetail.moveConfirm')}
          </Button>
        </>
      }
    >
      {others.length === 0 ? (
        <p className="text-fg-muted">{t('setDetail.noOtherSet')}</p>
      ) : (
        <SelectField
          label={t('setDetail.moveLabel')}
          value={selectedTarget}
          onChange={(event) => {
            setTargetId(event.target.value);
          }}
        >
          {others.map((set) => (
            <option key={set.id} value={set.id}>
              {set.title}
            </option>
          ))}
        </SelectField>
      )}
    </Dialog>
  );
}
