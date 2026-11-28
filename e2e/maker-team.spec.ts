import { expect, test } from '@playwright/test';
import { savedLevels } from './maker-storage';

test('Maker picks three players like Craft, sorts the editor tabs and pieces, and plays the balloons level as a team', async ({ page }) => {
  test.slow();
  await page.goto('/jogos/pedro-maker');

  const trio = page.getByRole('radio', { name: /^3 jogadores\b/ });
  await trio.click();
  await expect(trio).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByRole('radio', { name: /^1 jogador\b/ })).toHaveAttribute('aria-checked', 'false');
  await page.getByRole('combobox', { name: /^Personagem do Jogador 2/ }).selectOption({ label: 'Mario' });
  await page.getByRole('combobox', { name: /^Personagem do Jogador 3/ }).selectOption({ label: 'Princesa Peach' });
  await page.getByRole('heading', { name: /Quem vai jogar\?/ }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: test.info().outputPath('maker-team-home.png') });

  await page.goto('/jogos/pedro-maker/criar');
  await expect(page.getByRole('tab')).toHaveText([
    /Cogumelos/, /Blocos/, /Terreno/, /Itens/, /Decoração/, /Portais/, /Plataformas/, /Inimigos/, /Bandeiras/, /Telas/,
  ]);
  await page.getByRole('tab', { name: 'Inimigos', exact: true }).click();
  await expect(page.locator('.palette__pieces .piece').first()).toHaveAccessibleName('Peixe Saltador');

  await page.getByRole('textbox', { name: 'Nome da fase' }).fill('Fase da Turma');
  await page.getByRole('textbox', { name: 'Nome da fase' }).press('Tab');
  await page.getByRole('tab', { name: 'Decoração', exact: true }).click();
  const balloons = page.getByRole('button', { name: 'Balões', exact: true });
  await balloons.click();
  await expect(balloons).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('application', { name: /Grade da fase/ }).click({ position: { x: 176, y: 112 } });
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect.poll(async () => (await savedLevels(page))
    .find((level) => level.name === 'Fase da Turma')?.objects.map((object) => object.type))
    .toEqual(expect.arrayContaining(['balloons']));

  await page.getByRole('button', { name: 'Testar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pausar', exact: true })).toBeVisible({ timeout: 60_000 });
  for (const tag of ['J1', 'J2', 'J3']) {
    await expect(page.getByText(tag, { exact: true })).toBeVisible();
  }
  await page.screenshot({ path: test.info().outputPath('maker-team-playing.png') });
});
