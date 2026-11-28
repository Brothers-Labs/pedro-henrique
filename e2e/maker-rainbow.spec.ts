import { expect, test } from '@playwright/test';
import { savedLevels } from './maker-storage';

test('Maker shows the tabs in rainbow order and saves the rainbow block and bridge', async ({ page }) => {
  // Two tabs, a save and the 3D level in a row: as long as the other editor-then-play tests.
  test.slow();
  await page.goto('/jogos/pedro-maker/criar');
  await expect(page.getByRole('tab').first()).toHaveAccessibleName(/Cogumelos/);
  await page.getByRole('textbox', { name: 'Nome da fase' }).fill('Fase do Arco-Íris');
  await page.getByRole('textbox', { name: 'Nome da fase' }).press('Tab');
  const grid = page.getByRole('application', { name: /Grade da fase/ });

  await page.getByRole('tab', { name: 'Terreno', exact: true }).click();
  const rainbowBlock = page.locator('.palette__pieces .piece').first();
  await expect(rainbowBlock).toHaveAccessibleName('Bloco Arco-Íris');
  await rainbowBlock.click();
  await expect(rainbowBlock).toHaveAttribute('aria-pressed', 'true');
  await grid.click({ position: { x: 208, y: 112 } });

  await page.getByRole('tab', { name: 'Plataformas', exact: true }).click();
  const rainbowBridge = page.getByRole('button', { name: 'Ponte Arco-Íris', exact: true });
  await rainbowBridge.click();
  await expect(rainbowBridge).toHaveAttribute('aria-pressed', 'true');
  await grid.click({ position: { x: 272, y: 112 } });

  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect.poll(async () => (await savedLevels(page))
    .find((level) => level.name === 'Fase do Arco-Íris')?.objects.map((object) => object.type))
    .toEqual(expect.arrayContaining(['rainbow-block', 'rainbow-bridge']));
  await page.locator('.palette').screenshot({ path: test.info().outputPath('rainbow-palette.png') });

  await page.getByRole('button', { name: 'Testar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pausar', exact: true })).toBeVisible({ timeout: 60_000 });
  await page.screenshot({ path: test.info().outputPath('rainbow-in-game.png') });
});
