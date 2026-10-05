# LexiCards

Application web personnelle pour apprendre du vocabulaire avec des cartes mémoire, plusieurs modes d'étude et de la répétition espacée. Toutes les données restent dans le navigateur : aucun compte, aucun traceur, aucun appel réseau.

> **État actuel : jalon 0 (socle).** L'outillage, le thème, la navigation et les écrans provisoires sont en place. Les fonctionnalités arrivent jalon par jalon (voir [Feuille de route](#feuille-de-route)).

## Prérequis

- Node.js 22 ou plus récent (développé avec Node 24)
- npm 10 ou plus récent

## Installation et lancement

```bash
npm install
npm run dev
```

L'application est servie sur <http://localhost:5173>.

## Scripts

| Commande               | Rôle                                                         |
| ---------------------- | ------------------------------------------------------------ |
| `npm run dev`          | Serveur de développement avec rechargement à chaud           |
| `npm run build`        | Vérification des types puis build de production dans `dist/` |
| `npm run preview`      | Sert le build de production en local                         |
| `npm run typecheck`    | Vérification TypeScript seule                                |
| `npm run lint`         | ESLint (règles TypeScript strictes, React, accessibilité)    |
| `npm run format`       | Formate tout le projet avec Prettier                         |
| `npm run format:check` | Vérifie le formatage sans modifier                           |
| `npm run test`         | Tests unitaires et de composants (Vitest)                    |
| `npm run test:watch`   | Tests en mode surveillance                                   |

Un hook **pre-commit** (Husky + lint-staged) lance ESLint et Prettier sur les fichiers modifiés.

## Déploiement

`npm run build` produit un site statique dans `dist/`, utilisable sur n'importe quel hébergeur (GitHub Pages, Netlify, Cloudflare Pages…) sans configuration serveur :

- les chemins des ressources sont relatifs (`base: './'`), donc le site fonctionne aussi dans un sous-dossier ;
- le routage utilise le hash (`/#/sets`), donc aucune réécriture d'URL n'est nécessaire.

Sur téléphone, l'application doit être servie en **HTTPS** pour pouvoir être installée et fonctionner hors ligne (jalon 6).

## Architecture

```
src/
├─ app/          Routes, mises en page (navigation, plein écran d'étude), pages globales
├─ domain/       Logique métier pure, sans React ni IndexedDB, entièrement testée
├─ data/         Accès à IndexedDB (Dexie), import et export
├─ features/     Un dossier par fonctionnalité : dashboard, sets, editor, flashcards,
│                learn, write, test, match, stats, settings
├─ components/   Composants d'interface réutilisables
├─ hooks/        Hooks React transverses
├─ i18n/         Textes de l'interface (français) et fonction t() typée
├─ lib/          Utilitaires techniques (thème…)
├─ styles/       Tailwind et jetons de couleur
└─ test/         Configuration et utilitaires de test
```

**Règles de dépendance** : `domain/` ne dépend de rien d'autre ; `data/` dépend de `domain/` ; `features/` assemble le tout. La logique métier (répétition espacée, comparaison des réponses, génération de tests) est donc testable sans navigateur.

### Choix techniques

| Couche    | Choix                                                                       |
| --------- | --------------------------------------------------------------------------- |
| Langage   | TypeScript 6.0 en mode strict (+ `noUncheckedIndexedAccess`)                |
| Interface | React 19, Vite 8                                                            |
| Style     | Tailwind CSS 4, jetons de couleur en variables CSS                          |
| Routage   | React Router 8 (routeur par hash)                                           |
| État      | Zustand pour l'état d'interface ; données lues directement depuis IndexedDB |
| Icônes    | lucide-react                                                                |
| Tests     | Vitest, Testing Library, jsdom                                              |
| Qualité   | ESLint 10 (typescript-eslint, react-hooks, jsx-a11y), Prettier, Husky       |

**Compromis assumés**

- **TypeScript 6.0 et non 7.0** : typescript-eslint ne prend pas encore en charge TypeScript 7.
- **ESLint 10 avec `eslint-plugin-jsx-a11y`** : le plugin n'annonce officiellement qu'ESLint 9, qui n'est plus maintenu. Une règle `overrides` dans `package.json` lève le conflit de dépendances. Le plugin n'utilise aucune API retirée d'ESLint 10.
- **Thème stocké dans `localStorage`** : un petit script dans `index.html` doit le lire de façon synchrone pour appliquer le bon thème avant l'affichage, sans flash.

### Thème et accessibilité

- Thème clair, sombre ou automatique (suit le système), appliqué par la classe `dark` sur `<html>`.
- Palette sarcelle originale ; tous les couples texte/fond respectent un contraste AA (≥ 4,5:1).
- Polices système uniquement : aucune police téléchargée.
- Animations neutralisées si l'utilisateur active « réduire les animations ».
- Lien « Aller au contenu », titres de page mis à jour, cibles tactiles de 44 px minimum.

### Textes et traductions

Tous les textes sont dans `src/i18n/fr.ts`. La fonction `t('nav.home')` est typée : une clé inexistante provoque une erreur de compilation. Une nouvelle langue doit fournir exactement les mêmes clés (type `Messages`).

## Feuille de route

- [x] **Jalon 0, socle** : outillage, structure, thème, routage
- [ ] **Jalon 1, données** : modèle Dexie, gestion des sets et cartes, éditeur rapide, import/export
- [ ] **Jalon 2, étude de base** : mode Cartes mémoire, synthèse vocale
- [ ] **Jalon 3, répétition espacée** : module SM-2, mode Apprendre, session du jour
- [ ] **Jalon 4, modes complémentaires** : Écrire, Test, Associer
- [ ] **Jalon 5, suivi** : statistiques, objectifs, série de jours
- [ ] **Jalon 6, finitions** : paramètres, accessibilité, PWA, tests de bout en bout
