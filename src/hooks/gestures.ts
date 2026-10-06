export type Gesture = 'tap' | 'swipe-left' | 'swipe-right' | 'none';

/** Seuils en pixels : en dessous de TAP, c'est un appui ; au-delà de SWIPE, un balayage. */
export const GESTURE_THRESHOLDS = { tap: 10, swipe: 60, tapMaxMs: 500 } as const;

/**
 * Classe un geste selon son déplacement. Un balayage doit être nettement horizontal,
 * pour ne pas confondre avec le défilement vertical de la page.
 */
export function classifyGesture(dx: number, dy: number, durationMs: number): Gesture {
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);
  if (absX < GESTURE_THRESHOLDS.tap && absY < GESTURE_THRESHOLDS.tap) {
    return durationMs <= GESTURE_THRESHOLDS.tapMaxMs ? 'tap' : 'none';
  }
  if (absX >= GESTURE_THRESHOLDS.swipe && absX > absY * 1.5) {
    return dx < 0 ? 'swipe-left' : 'swipe-right';
  }
  return 'none';
}
