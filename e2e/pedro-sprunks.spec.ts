import { expect, test } from '@playwright/test';

test('Sprunks puts characters on stage, plays their action and keeps custom characters', async ({ page }) => {
  await page.goto('/jogos/pedro-sprunks');
  const stage = page.getByRole('region', { name: 'Palco da banda' });

  const pipoca = page.getByRole('button', { name: /^Pipoca \(/ });
  await pipoca.click();
  await expect(pipoca).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('Pipoca entrou na banda!')).toBeVisible();

  const bolao = page.getByRole('button', { name: /^Bolão \(/ });
  await bolao.click();
  await stage.getByRole('button', { name: 'Bolão: fazer a ação especial' }).click();
  await expect(stage.locator('app-sprunk-figure[data-action="lunge"]')).toHaveCount(1);

  await page.getByRole('button', { name: 'Criar meus personagens' }).click();
  await page.getByRole('textbox', { name: 'Nome' }).fill('Trovão');
  await page.getByRole('button', { name: 'Coroa' }).click();
  await page.getByRole('button', { name: 'Criar boneco' }).click();
  await expect(stage.getByText('Trovão')).toBeVisible();

  await page.reload();
  await expect(page.getByRole('button', { name: /^Trovão \(/ })).toBeVisible();

  await page.getByRole('button', { name: 'Banda surpresa' }).click();
  await expect(stage.getByRole('button', { name: /fazer a ação especial/ })).toHaveCount(7);
  await page.screenshot({ path: test.info().outputPath('pedro-sprunks.png'), fullPage: true });
});
