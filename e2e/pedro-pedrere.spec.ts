import { expect, test } from '@playwright/test';

/** Tamanho de um bloco no editor do modo maker, em pixels. */
const EDITOR_CELL = 36;

test('Pedrerê keeps the outfit, saves a maker level and plays it', async ({ page }) => {
  await page.goto('/jogos/pedro-pedrere');
  await expect(page.getByRole('heading', { name: /PEDRO\s*PEDRERÊ/ })).toBeVisible();

  await page.getByRole('link', { name: 'Personagem', exact: true }).click();
  await page.getByRole('button', { name: 'Azul' }).click();
  await page.getByRole('button', { name: 'Coroa' }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Azul' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('img', { name: /camisa azul, calça jeans e coroa/ })).toBeVisible();

  await page.goto('/jogos/pedro-pedrere/maker');
  await page.getByRole('textbox', { name: 'Nome' }).fill('Fase do teste');
  await page.getByRole('button', { name: 'Moeda' }).click();
  await page.locator('canvas.maker__canvas').click({
    position: { x: 10 * EDITOR_CELL + EDITOR_CELL / 2, y: 9 * EDITOR_CELL + EDITOR_CELL / 2 },
  });
  await page.getByRole('button', { name: 'Salvar e jogar' }).click();

  await expect(page).toHaveURL(/\/jogos\/pedro-pedrere\/aventuras\/minha-/);
  await expect(page.getByRole('img', { name: /Fase Fase do teste/ })).toBeVisible();
  await expect(page.getByRole('list', { name: 'Painel da partida' }).getByText('0/1')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Pausado' })).toBeVisible();
  await page.getByRole('button', { name: 'Sair' }).click();

  await expect(page).toHaveURL(/\/jogos\/pedro-pedrere\/aventuras$/);
  await expect(page.getByRole('region', { name: 'Minhas fases' }).getByText('Fase do teste')).toBeVisible();

  await page.goto('/jogos/pedro-pedrere/corrida');
  await expect(page.getByRole('img', { name: /Corrida/ })).toBeVisible();
  await expect(page.getByRole('list', { name: 'Painel da partida' }).getByText('Posição:')).toBeAttached();
  await page.screenshot({ path: test.info().outputPath('pedro-pedrere.png'), fullPage: true });
});
