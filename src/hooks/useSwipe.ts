import { useRef, useState, type MouseEvent, type PointerEvent } from 'react';
import { classifyGesture, GESTURE_THRESHOLDS } from './gestures';

interface SwipeHandlers {
  onTap: () => void;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
}

interface PointerStart {
  id: number;
  x: number;
  y: number;
  time: number;
}

/**
 * Gestes sur un élément cliquable : appui (ou clic, ou Entrée au clavier) et balayage horizontal.
 * Retourne les gestionnaires à poser sur l'élément et le décalage courant pour suivre le doigt.
 */
export function useSwipe({ onTap, onSwipeLeft, onSwipeRight }: SwipeHandlers) {
  const start = useRef<PointerStart | null>(null);
  // Après un balayage à la souris, le navigateur émet aussi un clic qu'il faut ignorer.
  const suppressClick = useRef(false);
  const [offsetX, setOffsetX] = useState(0);

  const reset = () => {
    start.current = null;
    setOffsetX(0);
  };

  return {
    offsetX,
    handlers: {
      onPointerDown: (event: PointerEvent<HTMLElement>) => {
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        start.current = {
          id: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          time: Date.now(),
        };
        suppressClick.current = false;
        // Garde le suivi du doigt même s'il sort de l'élément pendant le geste.
        const target = event.currentTarget;
        if (typeof target.setPointerCapture === 'function')
          target.setPointerCapture(event.pointerId);
      },
      onPointerMove: (event: PointerEvent<HTMLElement>) => {
        const origin = start.current;
        if (origin?.id !== event.pointerId) return;
        const dx = event.clientX - origin.x;
        if (Math.abs(dx) > Math.abs(event.clientY - origin.y)) setOffsetX(dx);
      },
      onPointerUp: (event: PointerEvent<HTMLElement>) => {
        const origin = start.current;
        if (origin?.id !== event.pointerId) return;
        const dx = event.clientX - origin.x;
        const dy = event.clientY - origin.y;
        const gesture = classifyGesture(dx, dy, Date.now() - origin.time);
        reset();
        if (gesture === 'swipe-left' || gesture === 'swipe-right') {
          suppressClick.current = true;
          if (gesture === 'swipe-left') onSwipeLeft();
          else onSwipeRight();
        } else {
          // Un glissement qui n'est pas un balayage ne doit pas non plus retourner la carte.
          const moved =
            Math.abs(dx) >= GESTURE_THRESHOLDS.tap || Math.abs(dy) >= GESTURE_THRESHOLDS.tap;
          suppressClick.current = moved;
        }
      },
      onPointerCancel: reset,
      onClick: (event: MouseEvent<HTMLElement>) => {
        if (suppressClick.current) {
          suppressClick.current = false;
          event.preventDefault();
          return;
        }
        onTap();
      },
    },
  };
}
