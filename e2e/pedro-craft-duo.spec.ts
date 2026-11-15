import { expect, test, type Page } from '@playwright/test';

interface SavedWorld {
  readonly name: string;
  readonly state: {
    readonly partner?: { readonly inventory: readonly unknown[] };
  } | null;
}

/** Read saved worlds after real UI actions, without changing game state through test hooks. */
async function savedWorlds(page: Page): Promise<SavedWorld[]> {
  return page.evaluate(() => new Promise<SavedWorld[]>((resolve, reject) => {
    const opening = indexedDB.open('pedro-henrique-site');
    opening.onerror = () => reject(opening.error);
    opening.onsuccess = () => {
      const database = opening.result;
      const request = database.transaction('craft-worlds').objectStore('craft-worlds').getAll();
      request.onsuccess = () => { database.close(); resolve(request.result as SavedWorld[]); };
      request.onerror = () => { database.close(); reject(request.error); };
    };
  }));
}

test('Craft splits the screen for two players with Maker heroes and saves player two', async ({ page }) => {
  test.slow();
  await page.goto('/jogos/pedro-craft');
  const duo = page.getByRole('radio', { name: /^2 jogadores\b/ });
  await duo.click();
  await expect(duo).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('combobox', { name: /^Personagem do Jogador 1/ }).selectOption({ label: 'Mario' });
  await page.getByRole('combobox', { name: /^Personagem do Jogador 2/ }).selectOption({ label: 'Princesa Peach' });
  await page.screenshot({ path: test.info().outputPath('craft-duo-home.png'), fullPage: true });

  await page.getByRole('textbox', { name: 'Nome do mundo' }).fill('Mundo da Dupla');
  await page.getByRole('radio', { name: /^Criativo\b/ }).click();
  await page.getByRole('button', { name: 'Criar mundo' }).click();
  await expect(page.getByRole('button', { name: 'Pausar', exact: true })).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole('group', { name: 'Jogador 1' })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Jogador 2' })).toBeVisible();
  await page.screenshot({ path: test.info().outputPath('craft-duo-playing.png') });

  // A mochila do Criativo traz os bonecos dos heróis do Pedro Maker.
  await page.getByRole('button', { name: 'Abrir a mochila' }).click();
  await expect(page.getByText('Todos os itens: toque para pegar')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Pegar Boneco Mario', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Pegar Meio bloco de diamante', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Pegar Bloco de netherite', exact: true })).toBeVisible();
  await page.screenshot({ path: test.info().outputPath('craft-duo-creative.png') });
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'Pausar', exact: true }).click();
  await page.getByRole('button', { name: 'Sair do mundo' }).click();
  await expect.poll(async () => (await savedWorlds(page)).find((world) => world.name === 'Mundo da Dupla')?.state?.partner)
    .toBeTruthy();
});
