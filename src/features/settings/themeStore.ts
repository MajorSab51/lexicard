import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { isThemePreference, THEME_STORAGE_KEY, type ThemePreference } from '@/lib/theme';

interface ThemeState {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}

/**
 * Préférence de thème. Elle reste dans localStorage (et non IndexedDB) car le script
 * anti-flash de index.html doit la lire de façon synchrone avant le premier rendu.
 */
export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      preference: 'system',
      setPreference: (preference) => {
        set({ preference });
      },
    }),
    {
      name: THEME_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ preference: state.preference }),
      merge: (persisted, current) => {
        const preference = (persisted as Partial<ThemeState> | undefined)?.preference;
        return isThemePreference(preference) ? { ...current, preference } : current;
      },
    },
  ),
);
