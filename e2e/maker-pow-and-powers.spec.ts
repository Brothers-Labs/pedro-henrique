import { expect, type Page, test } from '@playwright/test';
import { savedLevels } from './maker-storage';

/** The two new blocks and the six new powers, each in its tab, and where they go on the grid. */
const NEW_PIECES = [
  { tab: 'Blocos', label: 'Bloco POW', x: 144 },
  { tab: 'Blocos', label: 'Bloco !', x: 176 },
  { tab: 'Cogumelos', label: 'Cogumelo de Voar', x: 208 },
  { tab: 'Cogumelos', label: 'Bota', x: 240 },
  { tab: 'Cogumelos', label: 'Chapéu de Voar', x: 272 },
  { tab: 'Cogumelos', label: 'Martelo Gigante', x: 304 },
  { tab: 'Cogumelos', label: 'Roupa de Pinguim', x: 336 },
  { tab: 'Cogumelos', label: 'Cogumelo Cereja', x: 368 },
] as const;

async function openTab(page: Page, tab: string): Promise<void> {
  await page.getByRole('tab', { name: tab, exact: true }).click();
}

test('Maker places the POW block, the ! block and the six new powers, saves them and plays the level', async ({ page }) => {
  // Eight pieces in two tabs, a save and the 3D level in a row: as long as the other editor-then-play tests.
  test.slow();
  await page.goto('/jogos/pedro-maker/criar');
  await page.getByRole('textbox', { name: 'Nome da fase' }).fill('Fase do POW');
  await page.getByRole('textbox', { name: 'Nome da fase' }).press('Tab');
  const grid = page.getByRole('application', { name: /Grade da fase/ });

  for (const { tab, label, x } of NEW_PIECES) {
    await openTab(page, tab);
    const piece = page.getByRole('button', { name: label, exact: true });
    await piece.click();
    await expect(piece).toHaveAttribute('aria-pressed', 'true');
    await grid.click({ position: { x, y: 112 } });
  }
  await page.screenshot({ path: test.info().outputPath('maker-pow-and-powers-editor.png') });

  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect.poll(async () => {
    const objects = (await savedLevels(page)).find((level) => level.name === 'Fase do POW')?.objects ?? [];

    return [
      ...objects.filter((object) => ['pow-block', 'exclamation-block'].includes(object.type)).map((object) => object.type),
      ...objects.filter((object) => object.type === 'power-up').map((object) => `power-up:${object.properties?.powerUp}`),
    ].sort();
  }).toEqual([
    'exclamation-block',
    'pow-block',
    'power-up:boot',
    'power-up:double-cherry',
    'power-up:hammer',
    'power-up:penguin-suit',
    'power-up:propeller-mushroom',
    'power-up:wing-cap',
  ]);

  await page.getByRole('button', { name: 'Testar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pausar', exact: true })).toBeVisible({ timeout: 60_000 });
  await page.screenshot({ path: test.info().outputPath('maker-pow-and-powers-playing.png') });
});
