/**
 * Textes de l'interface en français (langue de référence).
 * Toute nouvelle langue doit fournir exactement les mêmes clés (voir `Messages` dans index.ts).
 * Les variables s'écrivent entre accolades : « {count} cartes ».
 */
export const fr = {
  app: {
    name: 'LexiCards',
    tagline: 'Ton vocabulaire, carte après carte.',
    skipToContent: 'Aller au contenu',
  },
  nav: {
    label: 'Navigation principale',
    home: 'Accueil',
    sets: 'Sets',
    stats: 'Statistiques',
    settings: 'Paramètres',
  },
  common: {
    back: 'Retour',
    close: 'Fermer',
    comingSoon: 'Cet écran sera disponible au {milestone}.',
  },
  dashboard: {
    title: 'Accueil',
    welcome: 'Bienvenue sur LexiCards',
    emptyTitle: 'Aucun set pour le moment',
    emptyBody: 'Crée ton premier set de vocabulaire pour commencer à réviser.',
    createSet: 'Créer un set',
    reviewAll: 'Tout réviser',
  },
  sets: {
    title: 'Mes sets',
    detailTitle: 'Détail du set',
    newSet: 'Nouveau set',
  },
  editor: {
    createTitle: 'Nouveau set',
    editTitle: 'Modifier le set',
  },
  study: {
    exit: 'Quitter la session',
    modes: {
      flashcards: 'Cartes mémoire',
      learn: 'Apprendre',
      write: 'Écrire',
      test: 'Test',
      match: 'Associer',
    },
    reviewAllTitle: 'Révision du jour',
  },
  stats: {
    title: 'Statistiques',
  },
  settings: {
    title: 'Paramètres',
    appearance: 'Apparence',
    theme: 'Thème',
    themeOptions: {
      light: 'Clair',
      dark: 'Sombre',
      system: 'Automatique',
    },
    themeHint: '« Automatique » suit le réglage de ton appareil.',
  },
  notFound: {
    title: 'Page introuvable',
    body: "Cette page n'existe pas ou a été déplacée.",
    goHome: "Revenir à l'accueil",
  },
  milestones: {
    m1: 'jalon 1',
    m2: 'jalon 2',
    m3: 'jalon 3',
    m4: 'jalon 4',
    m5: 'jalon 5',
  },
} as const;
