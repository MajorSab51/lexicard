import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { importPastedSet, openMode } from './helpers';

test('après une première visite, l’application fonctionne hors ligne et se sauvegarde', async ({
  page,
  context,
}) => {
  await page.goto('./');
  // Le service worker n'est actif qu'une fois toute l'application mise en cache.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  const manifest = (await (await page.request.get('./manifest.webmanifest')).json()) as {
    name: string;
    display: string;
    icons: { purpose?: string }[];
  };
  expect(manifest).toMatchObject({ name: 'LexiCards', display: 'standalone' });
  expect(manifest.icons.some((icon) => icon.purpose === 'maskable')).toBe(true);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Aucun set pour le moment' })).toBeVisible();

  // Sans connexion : créer un set, l'étudier, ouvrir les écrans chargés à la demande.
  await importPastedSet(page, {
    title: 'Hors ligne',
    lines: ['gato;chat', 'perro;chien', 'pájaro;oiseau'],
  });
  await openMode(page, 'Cartes mémoire');
  await expect(page.getByText('Carte 1 sur 3')).toBeVisible();
  await page.getByRole('link', { name: 'Quitter la session' }).click();

  await page.getByRole('link', { name: 'Statistiques' }).click();
  await expect(page.getByRole('heading', { name: 'Cartes étudiées par jour' })).toBeVisible();
  await page.getByRole('link', { name: 'Paramètres' }).click();
  await expect(page.getByRole('region', { name: 'Application' })).toContainText(
    'Disponible : l’application fonctionne sans connexion.',
  );

  // Les données survivent au rechargement, même hors ligne.
  await page.reload();
  await page.getByRole('link', { name: 'Sets' }).click();
  await expect(page.getByRole('link', { name: /Hors ligne/ })).toBeVisible();

  // Sauvegarde complète en un clic.
  await page.getByRole('link', { name: 'Paramètres' }).click();
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Télécharger une sauvegarde' }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toMatch(/\.json$/);
  const backup = JSON.parse(await readFile(await download.path(), 'utf8')) as {
    data: { sets: { title: string }[]; cards: unknown[] };
  };
  expect(backup.data.sets.map((set) => set.title)).toEqual(['Hors ligne']);
  expect(backup.data.cards).toHaveLength(3);
});
