# LexiCards

Application web personnelle pour apprendre du vocabulaire avec des cartes mémoire, plusieurs modes d'étude et de la répétition espacée. Toutes les données restent dans le navigateur : aucun compte, aucun traceur, aucun appel réseau.

> **État actuel : jalon 1 (données).** Création et gestion des sets et des cartes, éditeur rapide au clavier, import CSV/JSON avec détection des doublons, export et sauvegarde complète. Les modes d'étude arrivent aux jalons suivants (voir [Feuille de route](#feuille-de-route)).

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

## Fonctionnalités

### Sets et cartes

- Un **set** a un titre, une description, une langue des termes (la langue apprise), une langue des traductions, une couleur et des étiquettes libres.
- Une **carte** a un terme, une traduction et, en option, un exemple, une note, une image (lien), une catégorie grammaticale et un genre. Elle peut être marquée **favorite** ou **difficile**.
- Liste des sets avec recherche (titre et description, sans tenir compte des accents) et filtres par langue et par étiquette. Les filtres sont gardés dans l'adresse.
- Détail d'un set : dupliquer (sans la progression), supprimer, exporter, et sélectionner des cartes pour les **déplacer** vers un autre set ou les supprimer.

### Éditeur rapide

| Touche                       | Action                                              |
| ---------------------------- | --------------------------------------------------- |
| `Tab`                        | Champ suivant (terme → traduction → exemple)        |
| `Entrée`                     | Nouvelle carte sous la carte en cours, focus dessus |
| `Alt` + `↑` / `↓`            | Déplacer la carte                                   |
| `Ctrl` + `S` (`Cmd` sur Mac) | Enregistrer                                         |

Les lignes vides sont ignorées. Les cartes incomplètes (terme sans traduction ou inversement) bloquent l'enregistrement, et les termes en double sont signalés. Quitter avec des modifications non enregistrées demande une confirmation.

### Import

Depuis un **fichier** ou un **texte collé** (par exemple une colonne copiée depuis un tableur), vers un set existant ou un nouveau set.

- **CSV** : colonnes `terme,traduction,exemple`. Le séparateur (virgule, point-virgule, tabulation ou barre verticale) et la ligne d'en-tête sont détectés automatiquement. Avec un en-tête, les colonnes peuvent être dans n'importe quel ordre et `note`, `image`, `categorie` et `genre` sont aussi reconnues. Les fichiers Excel enregistrés en Windows-1252 sont décodés correctement.
- **JSON** : un export de set LexiCards, un tableau `[{ "term": "…", "translation": "…", "example": "…" }]` (noms français `terme`, `traduction`, `exemple` acceptés) ou un objet contenant un tableau `cards`.
- **Aperçu avant validation** : chaque ligne est classée _nouvelle_, _déjà dans le set_, _doublon dans le fichier_ ou _incomplète_. Seules les nouvelles sont cochées par défaut, mais chaque ligne peut être cochée ou décochée.

Un doublon est un terme identique sans tenir compte de la casse ni des espaces, mais en tenant compte des accents (« pêche » et « pèche » sont deux mots différents).

### Export et sauvegarde

- **Un set** : CSV (relisible à l'import) ou JSON LexiCards. Ces exports contiennent les cartes, sans progression ni marquages.
- **Toutes les cartes** : CSV avec une colonne `set` en plus (Paramètres > Données).
- **Sauvegarde complète** : JSON avec sets, cartes, progression, historique et paramètres. La **restauration** remplace toutes les données après confirmation, en une seule transaction. Les éléments incohérents (carte sans set, etc.) sont écartés et comptés.

## Données et fiabilité

Les données sont stockées dans **IndexedDB** (base `lexicards`, via Dexie) et survivent au rechargement comme à la fermeture du navigateur.

| Table        | Contenu                                                            |
| ------------ | ------------------------------------------------------------------ |
| `sets`       | Sets de vocabulaire                                                |
| `cards`      | Cartes, triées par `[setId+order]`                                 |
| `progress`   | État de répétition espacée par carte (jalon 3)                     |
| `reviewLogs` | Historique des révisions, conservé même après suppression d'un set |
| `settings`   | Paramètres clé/valeur                                              |

Toutes les entités ont un `userId` (toujours `null` dans le MVP) pour préparer l'arrivée des comptes. Les évolutions de schéma passent par une nouvelle `version()` Dexie, sans modifier les précédentes.

**À savoir**

- Les données sont propres à chaque navigateur et à chaque appareil. Pour passer de l'ordinateur au téléphone, il faut exporter puis restaurer une sauvegarde (la synchronisation est prévue en version 2).
- À l'enregistrement des premières données, l'application demande au navigateur un **stockage persistant**, pour qu'il n'efface pas les données en cas de manque d'espace. L'état de cette protection est affiché dans Paramètres > Données.
- **Safari (iOS et macOS)** peut effacer les données d'un site non utilisé pendant 7 jours. Ajouter l'application à l'écran d'accueil (jalon 6) et faire des sauvegardes régulières évite cette perte.
- Le thème est un réglage propre à chaque appareil : il n'est pas inclus dans les sauvegardes.

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
│                (modèle, nettoyage des cartes, doublons, aperçu d'import, langues)
├─ data/         Base Dexie, dépôts (sets, cartes, paramètres), requêtes réactives
│  └─ import-export/  CSV, JSON, sauvegarde, décodage des fichiers
├─ features/     Un dossier par fonctionnalité : dashboard, sets, editor, import,
│                flashcards, learn, write, test, match, stats, settings
├─ components/   Composants d'interface réutilisables (boutons, champs, fenêtres…)
├─ hooks/        Hooks React transverses
├─ i18n/         Textes de l'interface (français), fonctions t() et tn() typées
├─ lib/          Utilitaires techniques (identifiants, téléchargement, notifications, thème)
├─ styles/       Tailwind et jetons de couleur
└─ test/         Configuration, fabriques de données et rendu des routes pour les tests
```

**Règles de dépendance** : `domain/` ne dépend de rien d'autre ; `data/` dépend de `domain/` ; `features/` assemble le tout. La logique métier (répétition espacée, comparaison des réponses, génération de tests) est donc testable sans navigateur.

Les écrans lisent les données avec `useLiveQuery` (Dexie) : ils se mettent à jour automatiquement après chaque écriture, y compris depuis un autre onglet. Les écrans secondaires (éditeur, import, paramètres, modes d'étude, statistiques) sont chargés à la demande pour alléger le premier affichage.

Les tests utilisent `fake-indexeddb` : ils passent par la vraie couche Dexie, sans simulacre.

### Choix techniques

| Couche    | Choix                                                                       |
| --------- | --------------------------------------------------------------------------- |
| Langage   | TypeScript 6.0 en mode strict (+ `noUncheckedIndexedAccess`)                |
| Interface | React 19, Vite 8                                                            |
| Style     | Tailwind CSS 4, jetons de couleur en variables CSS                          |
| Routage   | React Router 8 (routeur par hash)                                           |
| Données   | IndexedDB via Dexie 4 et `dexie-react-hooks`                                |
| État      | Zustand pour l'état d'interface ; données lues directement depuis IndexedDB |
| CSV       | PapaParse                                                                   |
| Listes    | `@tanstack/react-virtual` (listes de plus de 200 cartes)                    |
| Icônes    | lucide-react                                                                |
| Tests     | Vitest, Testing Library, jsdom, fake-indexeddb                              |
| Qualité   | ESLint 10 (typescript-eslint, react-hooks, jsx-a11y), Prettier, Husky       |

**Compromis assumés**

- **TypeScript 6.0 et non 7.0** : typescript-eslint ne prend pas encore en charge TypeScript 7.
- **ESLint 10 avec `eslint-plugin-jsx-a11y`** : le plugin n'annonce officiellement qu'ESLint 9, qui n'est plus maintenu. Une règle `overrides` dans `package.json` lève le conflit de dépendances. Le plugin n'utilise aucune API retirée d'ESLint 10.
- **Thème stocké dans `localStorage`** : un petit script dans `index.html` doit le lire de façon synchrone pour appliquer le bon thème avant l'affichage, sans flash.
- **Éditeur non virtualisé** : toutes les lignes sont rendues pour que `Tab` et `Entrée` passent naturellement d'une carte à l'autre. Il reste fluide jusqu'à environ 1 000 cartes par set. La liste du détail d'un set, elle, est virtualisée dès 200 cartes.
- **CSV exporté avec des virgules** (format documenté) et un BOM UTF-8. Excel en français ouvre ces fichiers dans une seule colonne lors d'un double-clic : utiliser plutôt Données > À partir d'un fichier texte/CSV. Les cellules qui ressemblent à une formule (`=`, `+`, `@`) sont préfixées d'une apostrophe, retirée à l'import.
- **Images par lien** : elles nécessitent une connexion et ne s'affichent pas hors ligne. Seuls les liens `http` et `https` sont acceptés.

### Thème et accessibilité

- Thème clair, sombre ou automatique (suit le système), appliqué par la classe `dark` sur `<html>`.
- Palette sarcelle originale ; tous les couples texte/fond respectent un contraste AA (≥ 4,5:1).
- Polices système uniquement : aucune police téléchargée.
- Animations neutralisées si l'utilisateur active « réduire les animations ».
- Lien « Aller au contenu », titres de page mis à jour, cibles tactiles de 44 px minimum.
- Fenêtres modales natives (`<dialog>`) : focus piégé, fermeture avec `Échap`. Les notifications sont annoncées aux lecteurs d'écran.
- Les champs de terme et de traduction portent l'attribut `lang` de leur langue (correcteur orthographique et lecteurs d'écran adaptés).

### Textes et traductions

Tous les textes sont dans `src/i18n/fr.ts`. La fonction `t('nav.home')` est typée : une clé inexistante provoque une erreur de compilation. `tn('counts.cards', n)` gère le pluriel selon les règles de la langue. Une nouvelle langue doit fournir exactement les mêmes clés (type `Messages`).

## Feuille de route

- [x] **Jalon 0, socle** : outillage, structure, thème, routage
- [x] **Jalon 1, données** : modèle Dexie, gestion des sets et cartes, éditeur rapide, import/export
- [ ] **Jalon 2, étude de base** : mode Cartes mémoire, synthèse vocale
- [ ] **Jalon 3, répétition espacée** : module SM-2, mode Apprendre, session du jour
- [ ] **Jalon 4, modes complémentaires** : Écrire, Test, Associer
- [ ] **Jalon 5, suivi** : statistiques, objectifs, série de jours
- [ ] **Jalon 6, finitions** : paramètres, accessibilité, PWA, tests de bout en bout
