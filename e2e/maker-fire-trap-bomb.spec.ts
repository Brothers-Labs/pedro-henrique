import { expect, type Page, test } from '@playwright/test';
import { savedLevels } from './maker-storage';

/** As peças novas, cada uma na sua aba, e onde ficam na grade. */
const NEW_PIECES = [
  { tab: 'Blocos', label: 'Armadilha de Fogo', x: 144 },
  // A prensa larga ocupa também a casa de cada lado: fica longe das outras peças.
  { tab: 'Blocos', label: 'Prensa Esmagadora Larga', x: 208 },
  { tab: 'Inimigos', label: 'Bomb-omb', x: 272 },
  { tab: 'Cogumelos', label: 'Cogumelo 1UP', x: 304 },
  { tab: 'Cogumelos', label: 'Flor de Bolha', x: 336 },
] as const;

/** As peças que saíram do editor, com a aba onde ficavam. */
const RETIRED_PIECES = [
  { tab: 'Itens', label: 'Coração' },
  { tab: 'Blocos', label: 'Surpresa ❤️' },
  { tab: 'Cogumelos', label: 'Cogumelo Vida' },
  { tab: 'Cogumelos', label: 'Surpresa Cogumelo Vida' },
] as const;

async function openTab(page: Page, tab: string): Promise<void> {
  await page.getByRole('tab', { name: tab, exact: true }).click();
}

test('Maker places the fire trap, the wide crusher, the Bomb-omb, the 1UP mushroom and the bubble flower, without the retired pieces', async ({ page }) => {
  await page.goto('/jogos/pedro-maker/criar');
  await page.getByRole('textbox', { name: 'Nome da fase' }).fill('Fase da Bomb-omb');
  await page.getByRole('textbox', { name: 'Nome da fase' }).press('Tab');
  const grid = page.getByRole('application', { name: /Grade da fase/ });

  for (const { tab, label } of RETIRED_PIECES) {
    await openTab(page, tab);
    await expect(page.getByRole('button', { name: label, exact: true })).toHaveCount(0);
  }

  for (const { tab, label, x } of NEW_PIECES) {
    await openTab(page, tab);
    const piece = page.getByRole('button', { name: label, exact: true });
    await piece.click();
    await expect(piece).toHaveAttribute('aria-pressed', 'true');
    await grid.click({ position: { x, y: 112 } });
  }
  await page.screenshot({ path: test.info().outputPath('maker-fire-trap-bomb-editor.png') });

  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect.poll(async () => {
    const objects = (await savedLevels(page)).find((level) => level.name === 'Fase da Bomb-omb')?.objects ?? [];

    return [
      ...objects.filter((object) => ['fire-trap', 'wide-crusher', 'walking-bomb'].includes(object.type)).map((object) => object.type),
      ...objects.filter((object) => object.type === 'power-up').map((object) => `power-up:${object.properties?.powerUp}`),
    ].sort();
  }).toEqual(['fire-trap', 'power-up:bubble-flower', 'power-up:extra-life-mushroom', 'walking-bomb', 'wide-crusher']);

  await page.getByRole('button', { name: 'Testar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pausar', exact: true })).toBeVisible({ timeout: 60_000 });
  await page.screenshot({ path: test.info().outputPath('maker-fire-trap-bomb-playing.png') });
});
