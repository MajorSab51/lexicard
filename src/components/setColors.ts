import type { SetColor } from '@/domain/models';

/** Couleurs d'étiquette des sets (classes écrites en entier pour que Tailwind les génère). */
export const SET_COLOR_CLASSES: Record<SetColor, string> = {
  teal: 'bg-teal-500',
  blue: 'bg-blue-500',
  violet: 'bg-violet-500',
  pink: 'bg-pink-500',
  red: 'bg-red-500',
  orange: 'bg-orange-500',
  amber: 'bg-amber-400',
  green: 'bg-green-500',
  slate: 'bg-slate-500',
};
