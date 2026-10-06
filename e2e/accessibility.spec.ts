import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { importPastedSet } from './helpers';

/** Écrans contrôlés, avec un élément qui signale la fin du chargement. */
const SCREENS: { name: string; path: string; ready: (page: Page) => Promise<void> }[] = [
  { name: 'accueil', path: '', ready: heading('Révision du jour') },
  { name: 'sets', path: 'sets', ready: heading('Mes sets') },
  { name: 'détail du set', path: 'SET', ready: heading('Animaux') },
  { name: 'éditeur', path: 'SET/edit', ready: heading('Modifier le set') },
  { name: 'import', path: 'import', ready: heading('Importer des cartes') },
  { name: 'statistiques', path: 'stats', ready: heading('Cartes étudiées par jour') },
  { name: 'paramètres', path: 'settings', ready: heading('Paramètres') },
  { name: 'cartes mémoire', path: 'SET/flashcards', ready: text('Carte 1 sur 6') },
  { name: 'apprendre', path: 'SET/learn', ready: button('Afficher la réponse') },
  { name: 'écrire', path: 'SET/write', ready: button('Je ne sais pas') },
  { name: 'test', path: 'SET/test', ready: button('Commencer le test') },
  { name: 'associer', path: 'SET/match', ready: button('Commencer') },
];

function heading(name: string) {
  return async (page: Page) => {
    await expect(page.getByRole('heading', { name }).first()).toBeVisible();
  };
}
function text(value: string) {
  return async (page: Page) => {
    await expect(page.getByText(value)).toBeVisible();
  };
}
function button(name: string) {
  return async (page: Page) => {
    await expect(page.getByRole('button', { name, exact: true })).toBeVisible();
  };
}

/** Règles WCAG 2.2 niveaux A et AA (dont les contrastes et la taille des cibles). */
async function violations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  return results.violations.map(({ id, help, nodes }) => ({
    id,
    help,
    targets: nodes.map((node) => node.target.join(' ')),
  }));
}

for (const colorScheme of ['light', 'dark'] as const) {
  test(`aucun défaut d’accessibilité détecté, thème ${colorScheme === 'light' ? 'clair' : 'sombre'}`, async ({
    page,
  }) => {
    test.slow();
    await page.emulateMedia({ colorScheme });
    await importPastedSet(page, {
      title: 'Animaux',
      lines: [
        'gato;chat',
        'perro;chien',
        'pájaro;oiseau',
        'caballo;cheval',
        'pez;poisson',
        'vaca;vache',
      ],
    });
    const setPath = new URL(page.url()).hash.replace(/^#\//, '');

    const report: Record<string, Awaited<ReturnType<typeof violations>>> = {};
    const audit = async (name: string) => {
      const found = await violations(page);
      if (found.length > 0) report[name] = found;
    };
    const open = (path: string) => page.goto(`./#/${path.replace('SET', setPath)}`);

    for (const screen of SCREENS) {
      await open(screen.path);
      await screen.ready(page);
      await audit(screen.name);
    }

    // États qui n'apparaissent qu'après une action.
    await open('import');
    await page.getByRole('radio', { name: 'Coller du texte' }).click();
    await page.getByLabel('Texte à importer').fill('gato;chat\nleón;lion\nsin traducción;');
    await page.getByRole('button', { name: 'Analyser' }).click();
    await expect(page.getByRole('list', { name: 'État' })).toBeVisible();
    await audit('aperçu d’import');

    await open('SET/learn');
    await page.getByRole('button', { name: 'Afficher la réponse' }).click();
    await expect(page.getByRole('group', { name: 'Évalue ta réponse' })).toBeVisible();
    await audit('apprendre : réponse affichée');

    await open('SET/write');
    await page.getByRole('button', { name: 'Je ne sais pas' }).click();
    await expect(page.getByRole('button', { name: 'Continuer' })).toBeVisible();
    await audit('écrire : correction');

    await open('SET/test');
    await page.getByRole('button', { name: 'Commencer le test' }).click();
    await expect(page.getByRole('group', { name: 'Question 1', exact: true })).toBeVisible();
    await audit('test : questions');
    await page.getByRole('button', { name: 'Terminer le test' }).click();
    await expect(page.getByRole('dialog', { name: 'Terminer le test ?' })).toBeVisible();
    await audit('test : confirmation');
    await page.getByRole('dialog').getByRole('button', { name: 'Terminer' }).click();
    await expect(page.getByRole('heading', { name: 'Résultat du test' })).toBeVisible();
    await audit('test : résultats');

    await open('SET/match');
    await page.getByRole('button', { name: 'Commencer' }).click();
    await page
      .getByRole('group', { name: 'Tuiles à associer' })
      .getByRole('button')
      .first()
      .click();
    await audit('associer : partie');

    await open('SET');
    await page.getByRole('button', { name: 'Supprimer' }).first().click();
    await expect(page.getByRole('dialog', { name: 'Supprimer ce set ?' })).toBeVisible();
    await audit('suppression : confirmation');

    expect(report).toEqual({});
  });
}
