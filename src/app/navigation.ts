import { ChartColumn, House, Layers, Settings, type LucideIcon } from 'lucide-react';
import type { MessageKey } from '@/i18n';

export interface NavItem {
  to: string;
  labelKey: MessageKey;
  icon: LucideIcon;
  /** Actif uniquement sur le chemin exact (utile pour l'accueil). */
  end?: boolean;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { to: '/', labelKey: 'nav.home', icon: House, end: true },
  { to: '/sets', labelKey: 'nav.sets', icon: Layers },
  { to: '/stats', labelKey: 'nav.stats', icon: ChartColumn },
  { to: '/settings', labelKey: 'nav.settings', icon: Settings },
];
