import { expect, test } from '@playwright/test';
import { savedLevels } from './maker-storage';

const POWER_SURPRISE_LABELS = [
  'Surpresa Super Cogumelo',
  'Surpresa Flor de Fogo',
  'Surpresa Super Estrela',
  'Surpresa Cogumelo Vida',
  'Surpresa Flor de Gelo',
  'Surpresa Cogumelo Gato',
  'Surpresa Folha do Guaxinim',
  'Surpresa Giga Cogumelo',
  'Surpresa Cogumelo Turbo',
  'Surpresa Cogumelo Troca-Personagem',
  'Surpresa Cogumelo Ímã',
  'Surpresa Cogumelo Alto',
  'Surpresa Cogumelo de Encolher',
  'Surpresa Cogumelo Pedrerê',
] as const;

test('Maker offers a surprise block for every power in the Mushrooms tab, saves them and plays the level', async ({ page }) => {
  await page.goto('/jogos/pedro-maker/criar');
  await page.getByRole('textbox', { name: 'Nome da fase' }).fill('Fase dos Poderes');
  await page.getByRole('textbox', { name: 'Nome da fase' }).press('Tab');
  const grid = page.getByRole('application', { name: /Grade da fase/ });

  await page.getByRole('tab', { name: 'Cogumelos', exact: true }).click();
  for (const label of POWER_SURPRISE_LABELS) {
    await expect(page.getByRole('button', { name: label, exact: true })).toBeVisible();
  }

  for (const [label, x] of [['Surpresa Flor de Fogo', 176], ['Surpresa Cogumelo Pedrerê', 240]] as const) {
    const piece = page.getByRole('button', { name: label, exact: true });
    await piece.click();
    await expect(piece).toHaveAttribute('aria-pressed', 'true');
    await grid.click({ position: { x, y: 112 } });
  }
  await page.screenshot({ path: test.info().outputPath('maker-power-surprises-editor.png') });

  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect.poll(async () => (await savedLevels(page))
    .find((level) => level.name === 'Fase dos Poderes')?.objects
    .filter((object) => object.type === 'surprise')
    .map((object) => `${object.properties?.contents}:${object.properties?.powerUp}`)
    .sort())
    .toEqual(['power-up:fire-flower', 'power-up:pedrere-mushroom']);

  await page.getByRole('button', { name: 'Testar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pausar', exact: true })).toBeVisible({ timeout: 60_000 });
  await page.screenshot({ path: test.info().outputPath('maker-power-surprises-playing.png') });
});
