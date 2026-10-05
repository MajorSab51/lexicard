import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { useCallback, useState } from 'react';
import type { Card } from '@/domain/models';
import { CardListItem } from './CardListItem';

/** Au-delà de ce nombre de cartes, seules les cartes visibles à l'écran sont rendues. */
const VIRTUALIZE_FROM = 200;

interface CardListProps {
  cards: readonly Card[];
  termLang: string;
  translationLang: string;
  selecting: boolean;
  selectedIds: ReadonlySet<string>;
  onToggleSelected: (id: string) => void;
}

export function CardList(props: CardListProps) {
  return props.cards.length >= VIRTUALIZE_FROM ? (
    <VirtualCardList {...props} />
  ) : (
    <ul className="grid gap-2">
      {props.cards.map((card) => (
        <li key={card.id}>
          <CardListItem
            card={card}
            termLang={props.termLang}
            translationLang={props.translationLang}
            selecting={props.selecting}
            selected={props.selectedIds.has(card.id)}
            onToggleSelected={props.onToggleSelected}
          />
        </li>
      ))}
    </ul>
  );
}

function VirtualCardList({
  cards,
  termLang,
  translationLang,
  selecting,
  selectedIds,
  onToggleSelected,
}: CardListProps) {
  // Distance entre le haut de la page et la liste, nécessaire au calcul des positions.
  const [scrollMargin, setScrollMargin] = useState(0);
  const listRef = useCallback((node: HTMLUListElement | null) => {
    if (node) setScrollMargin(node.getBoundingClientRect().top + window.scrollY);
  }, []);
  const virtualizer = useWindowVirtualizer({
    count: cards.length,
    estimateSize: () => 80,
    overscan: 8,
    scrollMargin,
    getItemKey: (index) => cards[index]?.id ?? index,
  });

  return (
    <ul ref={listRef} className="relative" style={{ height: virtualizer.getTotalSize() }}>
      {virtualizer.getVirtualItems().map((item) => {
        const card = cards[item.index];
        if (!card) return null;
        return (
          <li
            key={item.key}
            data-index={item.index}
            ref={virtualizer.measureElement}
            className="absolute inset-x-0 top-0 pb-2"
            style={{ transform: `translateY(${item.start - virtualizer.options.scrollMargin}px)` }}
          >
            <CardListItem
              card={card}
              termLang={termLang}
              translationLang={translationLang}
              selecting={selecting}
              selected={selectedIds.has(card.id)}
              onToggleSelected={onToggleSelected}
            />
          </li>
        );
      })}
    </ul>
  );
}
