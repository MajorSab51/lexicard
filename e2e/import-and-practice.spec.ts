import { expect, test, type Locator, type Page } from '@playwright/test';
import { openMode } from './helpers';

/**
 * 200 lignes : 196 cartes « palabra N ; mot N », 3 doublons et 1 ligne incomplète.
 * Le numéro commun permet de retrouver la bonne réponse dans chaque mode.
 */
function vocabularyCsv(): string {
  const lines = ['terme;traduction'];
  for (let n = 1; n <= 196; n += 1) lines.push(`palabra ${n};mot ${n}`);
  lines.push('palabra 1;mot 1', 'Palabra 2;mot 2', 'palabra 3 ;mot 3', 'sin traducción;');
  return lines.join('\n');
}

const NUMBERED = /(palabra|mot) (\d+)/;

/** Numéro et langue du premier mot numéroté d'un texte. */
function parseWord(text: string): { word: string; n: string } {
  const match = NUMBERED.exec(text);
  if (!match?.[1] || !match[2]) throw new Error(`Aucun mot numéroté dans « ${text} »`);
  return { word: match[1], n: match[2] };
}

const counterpart = (text: string) => {
  const { word, n } = parseWord(text);
  return `${word === 'palabra' ? 'mot' : 'palabra'} ${n}`;
};

/** Répond juste à une question du test, quel que soit son type. */
async function answerQuestion(question: Locator) {
  const text = await question.innerText();
  const textbox = question.getByRole('textbox');
  const selects = question.getByRole('combobox');

  if ((await textbox.count()) > 0) {
    await textbox.fill(counterpart(text));
  } else if ((await selects.count()) > 0) {
    for (const select of await selects.all()) {
      const label = await select.evaluate((element) => {
        const { labels } = element as HTMLSelectElement;
        return labels[0]?.textContent ?? '';
      });
      await select.selectOption({ label: counterpart(label) });
    }
  } else if ((await question.getByRole('radio', { name: 'Vrai' }).count()) > 0) {
    const [prompt, proposed] = [...text.matchAll(new RegExp(NUMBERED, 'g'))].map((m) => m[2]);
    await question.getByRole('radio', { name: prompt === proposed ? 'Vrai' : 'Faux' }).check();
  } else {
    await question.getByRole('radio', { name: counterpart(text), exact: true }).check();
  }
}

async function promptedWord(page: Page): Promise<string> {
  const prompt = page.getByText(/^(palabra|mot) \d+$/).first();
  return (await prompt.innerText()).trim();
}

test('importer un CSV de 200 lignes puis s’entraîner avec Écrire, Test et Associer', async ({
  page,
}) => {
  // Import : aperçu, détection des doublons et des lignes incomplètes.
  await page.goto('./#/import');
  await page.getByLabel('Fichier CSV ou JSON').setInputFiles({
    name: 'vocabulaire.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(vocabularyCsv(), 'utf8'),
  });
  const statuses = page.getByRole('list', { name: 'État' });
  await expect(statuses).toContainText('Nouvelle : 196');
  await expect(statuses).toContainText('Doublon dans le fichier : 3');
  await expect(statuses).toContainText('Incomplète : 1');
  await page.getByLabel('Titre du nouveau set').fill('Espagnol : import');
  await page.getByLabel('Langue des termes').selectOption({ label: 'Espagnol' });
  await page.getByLabel('Langue des traductions').selectOption({ label: 'Français' });
  await page.getByRole('button', { name: 'Importer 196 cartes' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Espagnol : import' })).toBeVisible();
  await expect(page.getByText('196 cartes').first()).toBeVisible();

  // Écrire : une bonne réponse, puis « Je ne sais pas ».
  await openMode(page, 'Écrire');
  await page.getByLabel('Ta réponse en français').fill(counterpart(await promptedWord(page)));
  await page.getByRole('button', { name: 'Valider' }).click();
  await expect(page.getByRole('heading', { name: 'Correct !' })).toBeVisible();
  await page.getByRole('button', { name: 'Continuer' }).click();
  await page.getByRole('button', { name: 'Je ne sais pas' }).click();
  await expect(page.getByRole('heading', { name: 'Faux' })).toBeVisible();
  await page.getByRole('link', { name: 'Quitter la session' }).click();

  // Test : 8 questions de tous les types, toutes justes.
  await openMode(page, 'Test');
  await page.getByLabel('Nombre de questions').fill('8');
  await page.getByRole('button', { name: 'Commencer le test' }).click();
  const questions = page.getByRole('group', { name: /^Question \d+$/ });
  await expect(questions.first()).toBeVisible();
  for (const question of await questions.all()) await answerQuestion(question);
  await page.getByRole('button', { name: 'Terminer le test' }).click();
  await expect(page.getByRole('heading', { name: 'Résultat du test' })).toBeVisible();
  await expect(page.getByText('Aucune erreur, bravo !')).toBeVisible();
  await page.getByRole('link', { name: 'Quitter la session' }).click();

  // Associer : 6 paires retrouvées grâce à leur numéro.
  await openMode(page, 'Associer');
  await page.getByRole('button', { name: 'Commencer' }).click();
  const board = page.getByRole('group', { name: 'Tuiles à associer' });
  const names = await board.getByRole('button').allInnerTexts();
  expect(names).toHaveLength(12);
  for (const name of names.filter((text) => text.startsWith('palabra'))) {
    await board.getByRole('button', { name, exact: true }).click();
    await board.getByRole('button', { name: counterpart(name), exact: true }).click();
  }
  await expect(page.getByRole('heading', { name: 'Terminé !' })).toBeVisible();
  await expect(page.getByText('Nouveau record !')).toBeVisible();
});
