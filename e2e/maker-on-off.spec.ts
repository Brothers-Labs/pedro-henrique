import { expect, test } from '@playwright/test';
import { savedLevels } from './maker-storage';

test('Maker places the ON/OFF block with red and blue blocks, saves them and plays the level', async ({ page }) => {
  await page.goto('/jogos/pedro-maker/criar');
  await page.getByRole('textbox', { name: 'Nome da fase' }).fill('Fase do ON/OFF');
  await page.getByRole('textbox', { name: 'Nome da fase' }).press('Tab');
  const grid = page.getByRole('application', { name: /Grade da fase/ });

  await page.getByRole('tab', { name: 'Blocos', exact: true }).click();
  for (const [label, x] of [['Bloco ON/OFF', 176], ['Bloco Vermelho', 240], ['Bloco Azul', 304]] as const) {
    const piece = page.getByRole('button', { name: label, exact: true });
    await piece.click();
    await expect(piece).toHaveAttribute('aria-pressed', 'true');
    await grid.click({ position: { x, y: 112 } });
  }
  await page.screenshot({ path: test.info().outputPath('maker-on-off-editor.png') });

  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect.poll(async () => (await savedLevels(page))
    .find((level) => level.name === 'Fase do ON/OFF')?.objects
    .map((object) => object.type)
    .filter((type) => ['on-off-switch', 'red-block', 'blue-block'].includes(type))
    .sort())
    .toEqual(['blue-block', 'on-off-switch', 'red-block']);

  await page.getByRole('button', { name: 'Testar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pausar', exact: true })).toBeVisible({ timeout: 60_000 });
  await page.screenshot({ path: test.info().outputPath('maker-on-off-playing.png') });
});
