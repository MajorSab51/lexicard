import { expect, test } from '@playwright/test';
import { openMode } from './helpers';

/** 20 cartes saisies au clavier dans l'éditeur rapide. */
const WORDS: [string, string][] = [
  ['house', 'maison'],
  ['door', 'porte'],
  ['window', 'fenêtre'],
  ['kitchen', 'cuisine'],
  ['bedroom', 'chambre'],
  ['garden', 'jardin'],
  ['roof', 'toit'],
  ['wall', 'mur'],
  ['floor', 'sol'],
  ['stairs', 'escalier'],
  ['table', 'table'],
  ['chair', 'chaise'],
  ['bed', 'lit'],
  ['lamp', 'lampe'],
  ['mirror', 'miroir'],
  ['shelf', 'étagère'],
  ['sink', 'évier'],
  ['oven', 'four'],
  ['key', 'clé'],
  ['garage', 'garage'],
];

test('créer un set de 20 cartes au clavier, le réviser et retrouver sa progression', async ({
  page,
}) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Aucun set pour le moment' })).toBeVisible();
  await page.getByRole('link', { name: 'Créer un set' }).first().click();

  // Éditeur rapide : Tab passe à la traduction, Entrée ajoute la carte suivante.
  await page.getByLabel('Titre', { exact: true }).fill('Anglais : la maison');
  await page.getByLabel('Langue des termes').selectOption({ label: 'Anglais' });
  await page.getByLabel('Langue des traductions').selectOption({ label: 'Français' });
  await page
    .getByLabel(/^Terme/)
    .first()
    .click();
  for (const [index, [term, translation]] of WORDS.entries()) {
    await page.keyboard.type(term);
    await page.keyboard.press('Tab');
    await page.keyboard.type(translation);
    if (index < WORDS.length - 1) await page.keyboard.press('Enter');
  }
  await expect(page.getByLabel(/^Terme/)).toHaveCount(20);
  await expect(page.getByLabel(/^Terme/).last()).toHaveValue('garage');
  await page.getByRole('button', { name: 'Enregistrer' }).last().click();

  await expect(page.getByRole('heading', { level: 1, name: 'Anglais : la maison' })).toBeVisible();

  // Cartes mémoire : retourner puis passer à la carte suivante.
  await openMode(page, 'Cartes mémoire');
  await expect(page.getByText('Carte 1 sur 20')).toBeVisible();
  await page.getByRole('button', { name: 'Retourner la carte' }).click();
  await expect(page.getByText('Verso : maison')).toBeAttached();
  await page.getByRole('button', { name: 'Suivante' }).click();
  await expect(page.getByText('Carte 2 sur 20')).toBeVisible();
  await page.getByRole('link', { name: 'Quitter la session' }).click();

  // Apprendre : 10 nouvelles cartes par jour ; la première, ratée, revient en fin de session.
  await openMode(page, 'Apprendre');
  let answers = 0;
  const finished = page.getByRole('heading', { name: 'Session terminée !' });
  while (!(await finished.isVisible())) {
    await page.getByRole('button', { name: 'Afficher la réponse' }).click();
    await page.getByRole('button', { name: answers === 0 ? 'Raté' : 'Bien' }).click();
    answers += 1;
    expect(answers).toBeLessThanOrEqual(11);
  }
  expect(answers).toBe(11);
  await expect(page.getByText('10 cartes étudiées.')).toBeVisible();

  // L'accueil reflète la session, y compris après un rechargement.
  await page.goto('./');
  const today = page.getByRole('region', { name: 'Révision du jour' });
  const tile = (label: string) =>
    today.locator('div', { has: page.getByText(label, { exact: true }) }).last();
  const checkDashboard = async () => {
    await expect(tile('Nouvelles aujourd’hui')).toContainText('0');
    await expect(tile('Série')).toContainText('1 jour');
    await expect(tile('Objectif du jour')).toContainText('10 sur 20 cartes');
  };
  await checkDashboard();
  await page.reload();
  await checkDashboard();
  await expect(page.getByRole('link', { name: /Anglais : la maison/ })).toBeVisible();
});
