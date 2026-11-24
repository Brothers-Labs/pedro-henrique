import { expect, test } from '@playwright/test';
import { savedLevels } from './maker-storage';

test('Maker empties every surprise and fills them with coins, crystals or mushrooms from the buttons', async ({ page }) => {
  await page.goto('/jogos/pedro-maker/criar');
  await page.getByRole('textbox', { name: 'Nome da fase' }).fill('Fase das Surpresas');
  await page.getByRole('textbox', { name: 'Nome da fase' }).press('Tab');
  const grid = page.getByRole('application', { name: /Grade da fase/ });

  await page.getByRole('tab', { name: 'Blocos', exact: true }).click();
  for (const [label, x] of [['Surpresa', 176], ['Surpresa 💎', 240], ['Surpresa Vazia', 304]] as const) {
    const piece = page.getByRole('button', { name: label, exact: true });
    await piece.click();
    await expect(piece).toHaveAttribute('aria-pressed', 'true');
    await grid.click({ position: { x, y: 112 } });
  }

  await page.getByRole('button', { name: 'Selecionar', exact: true }).click();
  await grid.click({ position: { x: 176, y: 112 } });
  const own = page.getByRole('group', { name: 'O que sai do bloco' });
  await expect(own.getByRole('button', { name: 'Moedas', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await own.getByRole('button', { name: 'Cogumelo', exact: true }).click();
  await expect(own.getByRole('button', { name: 'Cogumelo', exact: true })).toHaveAttribute('aria-pressed', 'true');

  const all = page.getByRole('group', { name: 'Todas as surpresas da fase' });
  await all.getByRole('button', { name: 'Cristais', exact: true }).click();
  await expect(page.getByText('As 3 surpresas da fase agora têm cristais!')).toBeVisible();
  await expect(own.getByRole('button', { name: 'Cristal', exact: true })).toHaveAttribute('aria-pressed', 'true');

  await all.getByRole('button', { name: 'Tirar tudo', exact: true }).click();
  await expect(own.getByRole('button', { name: 'Vazia', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.screenshot({ path: test.info().outputPath('maker-surprises-editor.png') });

  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect.poll(async () => (await savedLevels(page))
    .find((level) => level.name === 'Fase das Surpresas')?.objects
    .filter((object) => object.type === 'surprise')
    .map((object) => object.properties?.contents))
    .toEqual(['empty', 'empty', 'empty']);

  await page.getByRole('button', { name: 'Testar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pausar', exact: true })).toBeVisible({ timeout: 60_000 });
  await page.screenshot({ path: test.info().outputPath('maker-surprises-playing.png') });
});
