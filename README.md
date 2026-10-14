# LexiCards

Application web personnelle pour apprendre du vocabulaire avec des cartes mémoire, plusieurs modes d'étude et de la répétition espacée. Toutes les données restent dans le navigateur : aucun compte, aucun traceur, aucun appel réseau.

> **Version 1.0 : MVP terminé (jalon 6).** Gestion des sets et des cartes, éditeur rapide, import/export et sauvegarde, synthèse vocale, les cinq modes d'étude (Cartes mémoire, Apprendre avec SM-2, Écrire, Test, Associer), statistiques, série de jours et objectif quotidien. L'application s'installe sur l'appareil et fonctionne hors ligne. Voir les [critères d'acceptation](#critères-dacceptation-du-mvp) et la [feuille de route](#feuille-de-route).

## Prérequis

- Node.js 22 ou plus récent (développé avec Node 24)
- npm 10 ou plus récent
- Pour les tests de bout en bout seulement : Microsoft Edge installé (il l'est d'office sous Windows)

## Installation et lancement

```bash
npm install
npm run dev
```

L'application est servie sur <http://localhost:5173>.

## Scripts

| Commande                 | Rôle                                                         |
| ------------------------ | ------------------------------------------------------------ |
| `npm run dev`            | Serveur de développement avec rechargement à chaud           |
| `npm run build`          | Vérification des types puis build de production dans `dist/` |
| `npm run preview`        | Sert le build de production en local                         |
| `npm run typecheck`      | Vérification TypeScript seule                                |
| `npm run lint`           | ESLint (règles TypeScript strictes, React, accessibilité)    |
| `npm run format`         | Formate tout le projet avec Prettier                         |
| `npm run format:check`   | Vérifie le formatage sans modifier                           |
| `npm run test`           | Tests unitaires et de composants (Vitest)                    |
| `npm run test:watch`     | Tests en mode surveillance                                   |
| `npm run test:e2e`       | Tests de bout en bout (Playwright, Edge), sur le build       |
| `npm run generate-icons` | Régénère les icônes de l'application à partir du logo        |

Un hook **pre-commit** (Husky + lint-staged) lance ESLint et Prettier sur les fichiers modifiés.

## Tests

- **Tests unitaires et de composants** (`npm run test`, Vitest) : toute la logique métier de `domain/` (SM-2, comparaison des réponses, génération des tests, statistiques…), les dépôts de données sur une vraie base Dexie (`fake-indexeddb`) et chaque écran rendu avec Testing Library.
- **Tests de bout en bout** (`npm run test:e2e`, Playwright) : ils construisent l'application, la servent avec `vite preview` et la pilotent dans **Microsoft Edge installé sur la machine** (`channel: 'msedge'`, aucun navigateur à télécharger), en format ordinateur et en format téléphone (Pixel 7, écran tactile).

| Parcours                                        | Ce qui est vérifié                                                                                                                                                 |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `create-and-review` : créer et réviser          | 20 cartes saisies uniquement au clavier, Cartes mémoire, session Apprendre (une carte ratée revient en fin de session), accueil à jour avant et après rechargement |
| `import-and-practice` : importer et s'entraîner | CSV de 200 lignes avec aperçu, doublons et ligne incomplète ; Écrire, Test de 8 questions de tous types sans faute, partie d'Associer et record                    |
| `offline` : hors ligne                          | Manifeste, service worker ; sans connexion : rechargement, import, étude, écrans chargés à la demande, données conservées ; sauvegarde téléchargée                 |
| `accessibility` : audit automatique             | Règles WCAG 2.2 A et AA (axe-core) sur 12 écrans et 9 états (réponse affichée, correction, résultats, fenêtres de confirmation…), thèmes clair et sombre           |

Le rapport HTML est écrit dans `playwright-report/` (`npx playwright show-report`). Si un serveur tourne déjà sur le port 4173, il est réutilisé : arrêtez-le pour tester un nouveau build.

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

### Mode Cartes mémoire

Depuis le détail d'un set, **Étudier > Cartes mémoire**. La carte se retourne avec une animation (supprimée si l'appareil demande de réduire les animations).

| Geste ou touche                   | Action             |
| --------------------------------- | ------------------ |
| Clic, appui, `Espace` ou `Entrée` | Retourner la carte |
| `→` ou balayage vers la gauche    | Carte suivante     |
| `←` ou balayage vers la droite    | Carte précédente   |

- **Options**, retenues d'une session à l'autre : sens (terme → traduction ou l'inverse), mélange, cartes difficiles uniquement.
- Marquage **favorite** ou **difficile** de la carte en cours. En fin de série, l'écran propose de recommencer ou de revoir les cartes difficiles.
- Le verso affiche la traduction, l'exemple, la note, la catégorie, le genre et l'image.
- Chaque carte retournée est enregistrée dans l'historique avec le résultat `seen` (« vue ») : elle compte pour la série de jours mais ne modifie pas la répétition espacée.

### Mode Apprendre (répétition espacée)

Depuis le détail d'un set, **Étudier > Apprendre** ; ou depuis l'accueil, **Tout réviser** pour tous les sets à la fois.

- **Session du jour** : toutes les cartes dues (prévues aujourd'hui ou en retard), mélangées, puis des cartes jamais étudiées, dans l'ordre du set. Les nouvelles cartes sont limitées à **10 par jour, tous sets confondus** (réglable dans Paramètres > Apprentissage, de 0 à 200). Avec « Tout réviser », elles sont prises d'abord dans les sets modifiés le plus récemment.
- Pour chaque carte : afficher la réponse, puis s'évaluer.

| Touche               | Action              |
| -------------------- | ------------------- |
| `Espace` ou `Entrée` | Afficher la réponse |
| `1`                  | Raté                |
| `2`                  | Difficile           |
| `3`                  | Bien                |
| `4`                  | Facile              |

- Une carte **ratée** revient en fin de session (« à revoir ») jusqu'à ce qu'elle soit retrouvée. Seule la première réponse du jour compte pour la planification ; les suivantes sont gardées dans l'historique.
- **Compteurs** : pendant la session, les cartes restantes (à réviser, nouvelles, à revoir) ; sur l'accueil, les cartes à réviser aujourd'hui, les nouvelles du jour et les cartes maîtrisées ; sur la page d'un set, la répartition à réviser / nouvelles / en cours / maîtrisées.
- En fin de session, un bilan donne le nombre de cartes étudiées, les réponses par note et la prochaine révision. Quand il n'y a rien à réviser, l'écran indique la prochaine date prévue et, le cas échéant, que la limite de nouvelles cartes du jour est atteinte.

#### Algorithme SM-2

La planification suit SM-2 (SuperMemo 2) dans sa formulation de référence. Elle est codée dans le module pur `src/domain/srs.ts`, entièrement testé.

| Bouton    | Note SM-2 (q) | Effet                                                   |
| --------- | ------------- | ------------------------------------------------------- |
| Raté      | 1             | Répétitions remises à zéro, carte due demain, EF − 0,54 |
| Difficile | 3             | Rappel réussi, EF − 0,14                                |
| Bien      | 4             | Rappel réussi, EF inchangé                              |
| Facile    | 5             | Rappel réussi, EF + 0,1                                 |

- **Intervalles** d'un rappel réussi : 1 jour, puis 6 jours, puis l'intervalle précédent × facteur de facilité (EF), arrondi. L'EF part de 2,5 et ne descend jamais sous 1,3 : EF ← EF + (0,1 − (5 − q) × (0,08 + (5 − q) × 0,02)). L'intervalle est calculé avec l'EF d'avant la réponse.
- Exemple avec « Bien » à chaque fois : 1, 6, 15, 38 jours. Avec « Difficile » : 1, 6, 13, 27 jours. Avec « Facile » : 1, 6, 16, 45 jours.
- Une carte est **maîtrisée** dès que son intervalle atteint 21 jours. Un **oubli** est compté quand une carte déjà retenue est ratée.
- Les dates sont des jours locaux : une carte prévue demain est due dès minuit, heure locale. Comme dans SM-2, une révision faite en retard ne modifie pas le calcul.

### Mode Écrire

Depuis le détail d'un set, **Étudier > Écrire**. Le terme s'affiche, on écrit la traduction (ou l'inverse, au choix dans les options), puis on valide avec `Entrée`. Un second `Entrée` passe à la carte suivante.

- **Correction** : _correct_, _presque correct_ (avec la réponse attendue) ou _faux_ (avec la réponse attendue). Le bouton **Je ne sais pas** affiche directement la réponse. Les détails de la carte (exemple, note, image) sont rappelés avec la correction.
- Une carte fausse revient en fin de session jusqu'à ce qu'elle soit trouvée. Le bilan donne le score du premier essai et la liste des cartes à revoir.
- **Répétition espacée** : correct vaut Bien, presque correct vaut Difficile, faux vaut Raté. Seul le premier essai compte, et seulement pour une carte nouvelle ou due ; une carte prévue plus tard n'est replanifiée qu'en cas d'erreur (réussir en avance ne repousse pas sa révision).
- Le champ de réponse désactive la correction automatique et le correcteur orthographique du navigateur, qui souffleraient la bonne orthographe.

#### Correction des réponses écrites

Utilisée par les modes Écrire et Test, réglable dans Paramètres > Apprentissage ou dans les options du mode Écrire.

- Casse, ponctuation et espaces superflus sont ignorés : « Le chat ! » vaut « le chat ».
- **Plusieurs réponses** : une traduction « chat ; matou » ou « he/she » accepte chaque partie. Le texte entre parenthèses est facultatif : « (to) run » accepte « run » et « to run ».
- **Accents** : ignorés par défaut (« ete » vaut « été »). Si on choisit de les compter, une réponse juste à un accent près est _presque correcte_.
- **Fautes de frappe** : aucune ; une faute dans les mots de 5 lettres ou plus (par défaut) ; ou indulgent (une faute dès 4 lettres, deux dès 9). Une faute est une lettre ajoutée, oubliée, remplacée, ou deux lettres voisines inversées (distance de Levenshtein, inversion comptée pour une faute). Une réponse acceptée grâce à cette tolérance est _presque correcte_.

### Mode Test

Depuis le détail d'un set, **Étudier > Test**. On choisit le nombre de questions (jusqu'à la taille du set), les types de questions et le sens ; ces choix sont retenus.

- **Vrai ou faux** : une réponse est proposée, juste ou tirée d'une autre carte.
- **Choix multiples** : quatre propositions, la bonne et trois autres tirées du même set.
- **Association** : jusqu'à cinq cartes regroupées, chacune associée à sa réponse dans une liste.
- **Réponse écrite** : corrigée avec les mêmes règles que le mode Écrire ; une réponse presque correcte compte comme juste.

Chaque test est tiré au sort : les cartes, le type de question de chacune, l'ordre des questions (les types sont mélangés) et les propositions. Les types restent répartis à parts égales. Si le nombre de questions atteint la taille du set, toutes les cartes sont testées : seuls leur ordre et leur type changent.

Chaque carte vaut un point. Le test est présenté sur une page, chaque question indiquant son type, et un compteur indique les réponses données. À la fin : score, pourcentage, liste des erreurs (réponse donnée et bonne réponse), réponses acceptées à une faute près, et un bouton pour **refaire un test avec les cartes ratées** seulement. Terminer avec des questions sans réponse demande une confirmation.

### Mode Associer

Depuis le détail d'un set, **Étudier > Associer**. Une grille de douze tuiles (six termes et leurs traductions, mélangés) : on touche un terme puis sa traduction, ou l'inverse.

- Une bonne paire disparaît avec une courte animation ; une mauvaise paire tremble et s'affiche en rouge. Toucher deux tuiles du même côté change simplement la sélection.
- **Chronomètre** : chaque erreur ajoute une seconde, pour que tout essayer au hasard ne soit pas la meilleure stratégie. Le **meilleur temps** est enregistré par set.
- Les cartes d'une partie sont tirées au hasard, sans deux termes ni deux traductions identiques (chaque tuile n'a qu'une paire possible). Il faut au moins deux cartes de ce type pour jouer.

### Statistiques et progression

L'onglet **Statistiques** présente, pour les 7, 30 ou 90 derniers jours (la période s'applique à toute la page) :

- **Série actuelle** et record : un jour compte dès une révision dans n'importe quel mode, avec minuit (heure locale) pour limite. Tant que la journée n'est pas finie, la série de la veille reste en cours : il suffit de réviser aujourd'hui pour la prolonger.
- **Objectif du jour** : nombre de cartes ou minutes, réglable dans Paramètres > Apprentissage (par défaut 20 cartes), avec une jauge.
- **Taux de réussite** : part des réponses notées autres que « Raté » (les cartes simplement consultées ne comptent pas).
- **Cartes étudiées** sur la période et temps de réponse.
- **Cartes étudiées par jour** : colonnes avec la ligne d'objectif, détail au survol (cartes, réponses, minutes) et tableau de données dépliable, lisible au clavier et par les lecteurs d'écran.
- **Répartition des cartes** par niveau (nouvelles, en cours, maîtrisées) et **progression de chaque set**.

Ailleurs dans l'application :

- l'**accueil** affiche aussi la série et l'objectif du jour ; les cartes de set (accueil et liste des sets) ont une barre de progression par niveau ;
- la page d'un set a une section **Progression** : répartition par niveau, taux de réussite, réponses des 30 derniers jours et **cartes les plus difficiles** (le plus d'échecs, puis la plus grande part d'échecs, puis le facteur de facilité le plus bas).

Une « carte étudiée » est une carte différente travaillée dans la journée, quel que soit le mode et le nombre de passages.

### Paramètres

| Section             | Réglages                                                                                           |
| ------------------- | -------------------------------------------------------------------------------------------------- |
| Apparence et langue | Thème clair, sombre ou automatique ; langue de l'interface (français seulement pour l'instant)     |
| Apprentissage       | Nouvelles cartes par jour, objectif quotidien, tolérance de correction (accents, fautes de frappe) |
| Audio               | Vitesse de lecture, voix par langue                                                                |
| Données             | Sauvegarde, export de toutes les cartes, restauration, état du stockage persistant                 |
| Application         | Installation sur l'appareil, état du mode hors ligne, version                                      |

Les réglages sont enregistrés dès qu'ils changent. Le thème et la langue sont propres à l'appareil (ils sont lus avant l'affichage) ; les autres font partie des sauvegardes.

### Installation et hors ligne

LexiCards est une application web progressive (PWA) :

- **Installation** : depuis Paramètres > Application (Chrome, Edge, Android), ou avec le menu du navigateur. Sur iPhone et iPad : bouton Partager, puis « Sur l'écran d'accueil ». L'application s'ouvre ensuite dans sa propre fenêtre.
- **Hors ligne** : dès la première visite, toute l'application est mise en cache (environ 1 Mo, écrans chargés à la demande compris). Elle fonctionne ensuite sans connexion, y compris après un redémarrage de l'appareil. Seules les images des cartes, chargées depuis leur lien, demandent une connexion.
- **Mises à jour** : quand une nouvelle version est publiée, un message propose de l'installer. Elle ne s'applique jamais d'elle-même, car le rechargement interromprait une session d'étude.
- Aucun rappel ni notification : ils sont prévus en version 2.

### Synthèse vocale

Un bouton **Écouter** prononce les termes, traductions et exemples dans les modes d'étude (sauf Associer), ainsi que les termes dans le détail d'un set. La lecture utilise la Web Speech API (`speechSynthesis`) : les voix sont celles du système ou du navigateur.

- **Choix de la voix** : celle choisie dans Paramètres > Audio pour la langue, sinon la plus adaptée. L'ordre de préférence est : même variante régionale que le set, puis voix installée sur l'appareil, puis variante courante (`en-GB`, `es-ES`, `pt-PT`, `de-DE`…), puis voix par défaut du système.
- **Vitesse** réglable de × 0,5 à × 1,5.
- **Aucune voix pour la langue** : un message l'explique, plutôt que de lire le mot avec l'accent d'une autre langue.
- **Réglages par langue** dans Paramètres > Audio, avec un bouton Tester qui prononce le nom de la langue dans cette langue (« español », « Deutsch »…).

**Installer des voix** : sous Windows, Paramètres > Heure et langue > Voix (ou installer le module de langue) ; sur macOS et iOS, Réglages > Accessibilité > Contenu énoncé > Voix ; sur Android, Paramètres > Synthèse vocale.

## Données et fiabilité

Les données sont stockées dans **IndexedDB** (base `lexicards`, via Dexie) et survivent au rechargement comme à la fermeture du navigateur.

| Table        | Contenu                                                              |
| ------------ | -------------------------------------------------------------------- |
| `sets`       | Sets de vocabulaire                                                  |
| `cards`      | Cartes, triées par `[setId+order]`                                   |
| `progress`   | Répétition espacée par carte (SM-2), absente pour une carte nouvelle |
| `reviewLogs` | Historique des révisions, conservé même après suppression d'un set   |
| `settings`   | Paramètres clé/valeur                                                |

Une progression contient l'intervalle, le facteur de facilité, le nombre de répétitions, la date due (`AAAA-MM-JJ`), les oublis, le niveau (`learning` ou `mastered`) et le jour d'introduction (`introducedOn`), qui sert à la limite de nouvelles cartes par jour.

Paramètres enregistrés dans `settings` : `srs.newCardsPerDay` (nouvelles cartes par jour), `answers.tolerance` (accents et fautes de frappe), `speech.rate` (vitesse de lecture), `speech.voices` (voix choisie par langue), `flashcards.options`, `write.options` et `test.options` (options des modes), `match.bestTimes` (meilleur temps par set, en millisecondes), `goal.daily` (objectif quotidien : `{ kind: "cards" | "minutes", target }`).

Dans l'historique, `mode` indique le mode d'étude et `result` vaut `again`, `hard`, `good` ou `easy` pour une réponse notée, `seen` pour une carte simplement consultée (Cartes mémoire). Un test enregistre une ligne par carte (juste : `good`, presque juste : `hard`, fausse : `again`) ; une partie d'Associer, une ligne `good` par paire trouvée. Seuls les modes Apprendre et Écrire modifient la répétition espacée.

Toutes les entités ont un `userId` (toujours `null` dans le MVP) pour préparer l'arrivée des comptes. Les évolutions de schéma passent par une nouvelle `version()` Dexie, sans modifier les précédentes : la version 2 (jalon 3) ajoute l'index `introducedOn` aux progressions. À la restauration d'une sauvegarde, une progression sans date due valide est écartée et son niveau est recalculé à partir de l'intervalle.

**À savoir**

- Les données sont propres à chaque navigateur et à chaque appareil. Pour passer de l'ordinateur au téléphone, il faut exporter puis restaurer une sauvegarde (la synchronisation est prévue en version 2).
- À l'enregistrement des premières données, l'application demande au navigateur un **stockage persistant**, pour qu'il n'efface pas les données en cas de manque d'espace. L'état de cette protection est affiché dans Paramètres > Données.
- **Safari (iOS et macOS)** peut effacer les données d'un site non utilisé pendant 7 jours. Ajouter l'application à l'écran d'accueil et faire des sauvegardes régulières évite cette perte.
- Le thème est un réglage propre à chaque appareil : il n'est pas inclus dans les sauvegardes.

## Déploiement

`npm run build` produit un site statique dans `dist/`, utilisable sur n'importe quel hébergeur (GitHub Pages, Netlify, Cloudflare Pages…) sans configuration serveur :

- les chemins des ressources sont relatifs (`base: './'`), donc le site fonctionne aussi dans un sous-dossier ;
- le routage utilise le hash (`/#/sets`), donc aucune réécriture d'URL n'est nécessaire.

Sur téléphone, l'application doit être servie en **HTTPS** pour pouvoir être installée et fonctionner hors ligne : les navigateurs n'activent les service workers que sur HTTPS et sur `localhost`. Le build contient le service worker (`sw.js`) et le manifeste (`manifest.webmanifest`). Les icônes sont générées une fois pour toutes dans `public/` (`npm run generate-icons` après un changement de logo).

## Architecture

```
src/
├─ app/          Routes, mises en page (navigation, plein écran d'étude), pages globales,
│                proposition de mise à jour
├─ domain/       Logique métier pure, sans React ni IndexedDB, entièrement testée
│                (modèle, cartes, doublons, aperçu d'import, langues, voix, cartes mémoire,
│                jours locaux, SM-2, session du jour, file du mode Apprendre, correction
│                des réponses, session Écrire, génération des tests, jeu Associer,
│                statistiques : activité, série, réussite, cartes difficiles, objectif)
├─ data/         Base Dexie, dépôts (sets, cartes, progression, historique, paramètres),
│                requêtes réactives
│  └─ import-export/  CSV, JSON, sauvegarde, décodage des fichiers
├─ features/     Un dossier par fonctionnalité : dashboard, sets, editor, import,
│                flashcards, learn, write, test, match, stats, settings
├─ components/   Composants d'interface réutilisables (boutons, champs, fenêtres…)
├─ hooks/        Hooks transverses : raccourcis clavier, gestes, contexte de synthèse vocale
├─ i18n/         Textes de l'interface (français), fonctions t() et tn() typées
├─ lib/          Utilitaires techniques (identifiants, téléchargement, notifications, thème,
│                accès à speechSynthesis, installation de l'application)
├─ styles/       Tailwind et jetons de couleur
└─ test/         Configuration, fabriques de données et rendu des routes pour les tests
e2e/             Parcours de bout en bout (Playwright)
public/          Logo et icônes de l'application installée
```

**Règles de dépendance** : `domain/` ne dépend de rien d'autre ; `data/` dépend de `domain/` ; `features/` assemble le tout. La logique métier (répétition espacée, comparaison des réponses, génération de tests) est donc testable sans navigateur.

Les écrans lisent les données avec `useLiveQuery` (Dexie) : ils se mettent à jour automatiquement après chaque écriture, y compris depuis un autre onglet. Exception : une session Apprendre part d'un instantané chargé au départ, pour que la file ne change pas à chaque réponse enregistrée. Les écrans secondaires (éditeur, import, paramètres, modes d'étude, statistiques) sont chargés à la demande pour alléger le premier affichage.

Les tests utilisent `fake-indexeddb` : ils passent par la vraie couche Dexie, sans simulacre.

### Choix techniques

| Couche     | Choix                                                                       |
| ---------- | --------------------------------------------------------------------------- |
| Langage    | TypeScript 6.0 en mode strict (+ `noUncheckedIndexedAccess`)                |
| Interface  | React 19, Vite 8                                                            |
| Style      | Tailwind CSS 4, jetons de couleur en variables CSS                          |
| Routage    | React Router 8 (routeur par hash)                                           |
| Données    | IndexedDB via Dexie 4 et `dexie-react-hooks`                                |
| État       | Zustand pour l'état d'interface ; données lues directement depuis IndexedDB |
| CSV        | PapaParse                                                                   |
| Listes     | `@tanstack/react-virtual` (listes de plus de 200 cartes)                    |
| Graphiques | Recharts (chargé seulement sur la page Statistiques)                        |
| Icônes     | lucide-react                                                                |
| PWA        | vite-plugin-pwa (Workbox) : manifeste, service worker, mise à jour proposée |
| Tests      | Vitest, Testing Library, jsdom, fake-indexeddb ; Playwright et axe-core     |
| Qualité    | ESLint 10 (typescript-eslint, react-hooks, jsx-a11y), Prettier, Husky       |

**Compromis assumés**

- **TypeScript 6.0 et non 7.0** : typescript-eslint ne prend pas encore en charge TypeScript 7.
- **ESLint 10 avec `eslint-plugin-jsx-a11y`** : le plugin n'annonce officiellement qu'ESLint 9, qui n'est plus maintenu. Une règle `overrides` dans `package.json` lève le conflit de dépendances. Le plugin n'utilise aucune API retirée d'ESLint 10.
- **Thème stocké dans `localStorage`** : un petit script dans `index.html` doit le lire de façon synchrone pour appliquer le bon thème avant l'affichage, sans flash.
- **Éditeur non virtualisé** : toutes les lignes sont rendues pour que `Tab` et `Entrée` passent naturellement d'une carte à l'autre. Mesuré avec 5 000 cartes : l'éditeur s'ouvre en 1,4 s sur ordinateur et chaque frappe prend environ 70 ms ; sur un téléphone de milieu de gamme (processeur 4 fois plus lent, simulé), l'ouverture prend environ 9 s et la frappe devient lente (environ 0,3 s par caractère). Il reste fluide sur téléphone jusqu'à environ 1 000 cartes (ouverture en 1,9 s, 60 ms par frappe). La liste du détail d'un set, elle, est virtualisée dès 200 cartes.
- **CSV exporté avec des virgules** (format documenté) et un BOM UTF-8. Excel en français ouvre ces fichiers dans une seule colonne lors d'un double-clic : utiliser plutôt Données > À partir d'un fichier texte/CSV. Les cellules qui ressemblent à une formule (`=`, `+`, `@`) sont préfixées d'une apostrophe, retirée à l'import.
- **Images par lien** : elles nécessitent une connexion et ne s'affichent pas hors ligne. Seuls les liens `http` et `https` sont acceptés. Elles sont chargées sans envoyer l'adresse de la page (`referrerpolicy="no-referrer"`).
- **Voix « en ligne »** : certains navigateurs, Chrome notamment, proposent des voix hébergées qui envoient le texte lu au service de leur éditeur. LexiCards privilégie toujours les voix installées sur l'appareil et signale les voix en ligne dans les réglages. Une voix en ligne n'est utilisée que si elle est la seule disponible pour la langue, ou si elle a été choisie.
- **SM-2 sans adaptation** : la note d'un rappel réussi (Difficile, Bien, Facile) ne change pas l'intervalle immédiat, seulement le facteur de facilité, donc les intervalles suivants. Pour une carte nouvelle, Raté et Bien donnent tous deux « demain » ; la carte ratée revient en plus en fin de session et repart ensuite à 1 jour au lieu de 6. Les boutons n'affichent donc pas d'aperçu d'intervalle, qui serait souvent identique pour les trois rappels réussis.
- **« Presque correct » vaut Difficile** dans la répétition espacée : la carte reste retenue, mais son facteur de facilité baisse. Dans un test, une réponse presque correcte compte comme juste et apparaît dans une liste à part.
- **Séparateurs `;` et `/`** : ils découpent toujours la réponse attendue en plusieurs formulations acceptées, comme le demande le cahier des charges. Une traduction qui contient une barre oblique (« 1/2 ») est donc découpée elle aussi ; la réponse complète reste acceptée.
- **Meilleurs temps d'Associer** : gardés dans les paramètres, ils ne sont pas effacés à la suppression d'un set (quelques octets).
- **Minutes de l'objectif** : elles additionnent le temps de réponse enregistré pour chaque carte (de l'affichage à la réponse, ou au retournement pour les cartes mémoire). Le temps passé à lire la correction ou les détails n'est pas compté : c'est une mesure prudente du temps d'étude.
- **Statistiques tirées de l'historique** : les révisions des cartes et des sets supprimés restent dans les totaux, la série et le taux de réussite. Les cartes supprimées n'apparaissent plus dans le classement des cartes difficiles.
- **Couleurs des niveaux** : une seule teinte, plus foncée avec la progression en thème clair et plus claire en thème sombre. La rampe a été vérifiée par calcul (ordre de luminosité, écarts visibles, contraste de la teinte la plus pâle ≥ 2:1 sur la surface). Les nombres sont toujours écrits à côté de la barre.
- **Mise à jour sur demande** plutôt qu'automatique : une nouvelle version publiée n'est utilisée qu'après un clic sur « Mettre à jour » (ou à la réouverture de l'application, une fois tous ses onglets fermés).
- **Langue de l'interface** : le réglage existe et le mécanisme est en place (dictionnaire typé, langue retenue sur l'appareil), mais seul le français est fourni.
- **Tests de bout en bout sur Edge uniquement** : Firefox et Safari ne sont pas pilotés automatiquement (Playwright devrait télécharger ses propres navigateurs). L'application n'utilise que des API standard, mais ces navigateurs doivent être vérifiés à la main.
- **Changement de jour** : les compteurs sont recalculés à chaque affichage ou modification des données. Une page laissée ouverte après minuit se met à jour à la navigation suivante.
- **Voix dépendantes de l'appareil** : un Windows en français n'a souvent que des voix françaises. L'anglais, l'espagnol ou l'allemand demandent alors d'installer des voix (voir [Synthèse vocale](#synthèse-vocale)). Les voix choisies sont incluses dans les sauvegardes ; si une voix n'existe pas sur un autre appareil, le choix automatique prend le relais.

### Thème et accessibilité

- Thème clair, sombre ou automatique (suit le système), appliqué par la classe `dark` sur `<html>`.
- Palette sarcelle originale ; tous les couples texte/fond respectent un contraste AA (≥ 4,5:1).
- Polices système uniquement : aucune police téléchargée.
- Animations neutralisées si l'utilisateur active « réduire les animations ».
- Lien « Aller au contenu », titres de page mis à jour (y compris dans les modes d'étude), cibles tactiles de 44 px minimum.
- Modes d'étude : la carte affichée puis sa réponse sont annoncées aux lecteurs d'écran. Dans le mode Apprendre, le focus passe du bouton « Afficher la réponse » aux boutons de note, puis revient ; dans le mode Écrire, du champ de réponse au bouton « Continuer ». Le mode Test utilise des groupes de boutons radio et des listes natives ; dans Associer, les tuiles sont des boutons et chaque tentative est annoncée.
- Fenêtres modales natives (`<dialog>`) : focus piégé, fermeture avec `Échap`. Les notifications sont annoncées aux lecteurs d'écran.
- Les champs de terme et de traduction portent l'attribut `lang` de leur langue (correcteur orthographique et lecteurs d'écran adaptés).
- **Audit automatique** (axe-core, règles WCAG 2.2 A et AA, contrastes et taille des cibles compris) : aucun défaut sur les 12 écrans et 9 états contrôlés, en thème clair et sombre, en format ordinateur et téléphone. Il est relancé par `npm run test:e2e`. Un outil automatique ne détecte qu'une partie des problèmes : l'application n'a pas été essayée avec un vrai lecteur d'écran (NVDA, VoiceOver, TalkBack).

### Textes et traductions

Tous les textes sont dans `src/i18n/fr.ts`. La fonction `t('nav.home')` est typée : une clé inexistante provoque une erreur de compilation. `tn('counts.cards', n)` gère le pluriel selon les règles de la langue. Une nouvelle langue doit fournir exactement les mêmes clés (type `Messages`).

## Performances

Mesures faites sur le build de production dans Edge, avec un set de **5 000 cartes**, sur un PC récent et avec un processeur ralenti 4 fois pour simuler un téléphone de milieu de gamme :

| Écran ou action (set de 5 000 cartes)   | PC récent | Téléphone simulé |
| --------------------------------------- | --------- | ---------------- |
| Accueil (chargement complet de la page) | 0,11 s    | 0,41 s           |
| Détail du set                           | 0,16 s    | 0,65 s           |
| Cartes mémoire                          | 0,07 s    | 0,23 s           |
| Apprendre (session du jour)             | 0,10 s    | 0,39 s           |
| Écrire                                  | 0,10 s    | 0,41 s           |
| Associer                                | 0,07 s    | 0,20 s           |
| Statistiques                            | 0,08 s    | 0,27 s           |
| Génération d'un test de 100 questions   | 0,06 s    | 0,34 s           |
| Carte suivante, réponse notée           | < 10 ms   | < 15 ms          |
| Éditeur : ouverture                     | 1,4 s     | 9 s              |
| Éditeur : frappe d'un caractère         | 70 ms     | 0,3 s            |

Le premier affichage reste donc bien sous les 2 s demandées, et les sessions d'étude restent fluides avec 5 000 cartes. Seul l'éditeur ralentit sur téléphone pour un set de cette taille (voir les compromis).

## Critères d'acceptation du MVP

| Critère                                                                           | État              | Vérification                                                                                                                                                                                                                                                               |
| --------------------------------------------------------------------------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Créer un set de 20 cartes en moins de 2 minutes avec l'éditeur rapide             | ✅                | Saisie entièrement au clavier (`Tab`, `Entrée`) ; parcours E2E `create-and-review`                                                                                                                                                                                         |
| Importer un CSV de 200 lignes avec prévisualisation et détection des doublons     | ✅                | Parcours E2E `import-and-practice` ; tests de l'aperçu d'import                                                                                                                                                                                                            |
| Les 5 modes d'étude fonctionnent sur ordinateur et sur mobile                     | ✅                | Parcours E2E en format ordinateur et téléphone (Pixel 7 tactile simulé) ; pas encore essayé sur un vrai téléphone                                                                                                                                                          |
| Une carte ratée revient plus tôt qu'une carte réussie, dates cohérentes avec SM-2 | ✅                | Tests unitaires de `domain/srs.ts` et de la session Apprendre                                                                                                                                                                                                              |
| Lecture audio en anglais, espagnol et allemand si les voix sont disponibles       | ✅ sous condition | Choix des voix et message « aucune voix » testés. Sur le PC de développement, seules des voix anglaises et françaises sont installées : l'espagnol et l'allemand demandent d'ajouter des voix (voir Synthèse vocale). Le son lui-même n'est pas vérifiable automatiquement |
| Les données survivent au rechargement et à la fermeture du navigateur             | ✅                | IndexedDB ; rechargement vérifié en E2E, en ligne et hors ligne                                                                                                                                                                                                            |
| Le tableau de bord affiche série, cartes dues du jour et progression par set      | ✅                | Tests de l'accueil et parcours E2E `create-and-review`                                                                                                                                                                                                                     |
| `npm run lint`, `npm run test` et `npm run build` passent sans erreur             | ✅                | Lancés à chaque jalon (et `npm run test:e2e`)                                                                                                                                                                                                                              |
| Le README explique l'installation, le lancement, les tests et l'architecture      | ✅                | Ce document                                                                                                                                                                                                                                                                |

## Feuille de route

- [x] **Jalon 0, socle** : outillage, structure, thème, routage
- [x] **Jalon 1, données** : modèle Dexie, gestion des sets et cartes, éditeur rapide, import/export
- [x] **Jalon 2, étude de base** : mode Cartes mémoire, synthèse vocale
- [x] **Jalon 3, répétition espacée** : module SM-2, mode Apprendre, session du jour
- [x] **Jalon 4, modes complémentaires** : Écrire, Test, Associer
- [x] **Jalon 5, suivi** : statistiques, objectifs, série de jours
- [x] **Jalon 6, finitions** : paramètres, accessibilité, PWA, tests de bout en bout

**Version 2** (hors MVP, non développée) : comptes et synchronisation entre appareils, enregistrement de sa propre prononciation, génération de cartes par IA, partage de sets par lien, rappels. L'architecture y est préparée : champ `userId` sur toutes les entités, accès aux données regroupé dans `data/`, textes externalisés.
