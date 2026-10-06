import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

/**
 * Icônes de l'application installable, générées à partir du logo avec
 * `npm run generate-icons`. Les fichiers produits dans public/ sont versionnés :
 * le build n'a pas besoin de les recréer.
 */
export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    // Fond clair sous le logo pour les icônes sans transparence (Android, iOS).
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: '#d9f3ef' } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: '#d9f3ef' } },
  },
  images: ['public/favicon.svg'],
});
