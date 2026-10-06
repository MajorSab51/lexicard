import { expect, type Page } from '@playwright/test';

/** Crée un set en collant une liste « terme;traduction » dans l'écran d'import. */
export async function importPastedSet(
  page: Page,
  {
    title,
    lines,
    sourceLang = 'Espagnol',
  }: { title: string; lines: string[]; sourceLang?: string },
) {
  await page.goto('./#/import');
  await page.getByRole('radio', { name: 'Coller du texte' }).click();
  await page.getByLabel('Texte à importer').fill(lines.join('\n'));
  await page.getByRole('button', { name: 'Analyser' }).click();
  await page.getByLabel('Titre du nouveau set').fill(title);
  await page.getByLabel('Langue des termes').selectOption({ label: sourceLang });
  await page.getByLabel('Langue des traductions').selectOption({ label: 'Français' });
  await page.getByRole('button', { name: /^Importer \d+ cartes?$/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
}

/** Ouvre un mode d'étude depuis la page du set affichée. */
export async function openMode(page: Page, mode: string) {
  await page.getByRole('link', { name: mode, exact: true }).click();
}
