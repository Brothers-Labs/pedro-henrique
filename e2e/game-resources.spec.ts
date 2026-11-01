import { expect, test, type Page } from '@playwright/test';

interface SavedLevel {
  readonly id: string;
  readonly name: string;
  readonly objects: readonly { readonly type: string }[];
}

interface SavedWorld {
  readonly name: string;
  readonly mode: string;
  readonly state: {
    readonly inventory: readonly ({ readonly item: string } | null)[];
    readonly containers: readonly { readonly slots: readonly unknown[] }[];
  } | null;
}

/** Read saved data after real UI actions, without changing game state through test hooks. */
async function savedRecords<T>(page: Page, store: string): Promise<T[]> {
  return page.evaluate((name) => new Promise<T[]>((resolve, reject) => {
    const opening = indexedDB.open('pedro-henrique-site');
    opening.onerror = () => reject(opening.error);
    opening.onsuccess = () => {
      const database = opening.result;
      const request = database.transaction(name).objectStore(name).getAll();
      request.onsuccess = () => { database.close(); resolve(request.result); };
      request.onerror = () => { database.close(); reject(request.error); };
    };
  }), store);
}

test('Maker saves the cannon and every new giant coin, and remembers Wario', async ({ page }) => {
  await page.goto('/jogos/pedro-maker/criar');
  await page.getByRole('textbox', { name: 'Nome da fase' }).fill('Recursos do Pedro');
  await page.getByRole('textbox', { name: 'Nome da fase' }).press('Tab');
  const grid = page.getByRole('application', { name: /Grade da fase/ });
  await page.getByRole('tab', { name: 'Blocos', exact: true }).click();
  await page.getByRole('button', { name: 'Canhão', exact: true }).click();
  await grid.click({ position: { x: 112, y: 112 } });
  await page.getByRole('tab', { name: 'Itens', exact: true }).click();
  for (const [index, value] of [25, 100, 250, 500, 1000, 2500, 5000, 10000, 50000].entries()) {
    const coin = page.getByRole('button', { name: `Moeda Gigante ${value}`, exact: true });
    await coin.click();
    await expect(coin).toHaveAttribute('aria-pressed', 'true');
    await grid.click({ position: { x: 144 + index * 32, y: 112 } });
  }
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  const types = ['cannon', 'coin-25', 'coin-100', 'coin-250', 'coin-500', 'coin-1000', 'coin-2500', 'coin-5000', 'coin-10000', 'coin-50000'];
  await expect.poll(async () => {
    const records = await savedRecords<SavedLevel>(page, 'maker-levels');
    return records.find((record) => record.name === 'Recursos do Pedro')?.objects
      .map((object: { type: string }) => object.type);
  }).toEqual(expect.arrayContaining(types));
  await page.goto('/jogos/pedro-maker/personagem');
  const wario = page.getByRole('button', { name: /^Wario\b/ });
  await wario.click();
  await expect(wario).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(page.getByRole('button', { name: /^Wario\b/ })).toHaveAttribute('aria-pressed', 'true');
  await page.screenshot({ path: test.info().outputPath('wario-selected.png'), fullPage: true });
  const savedLevel = (await savedRecords<SavedLevel>(page, 'maker-levels'))
    .find((record) => record.name === 'Recursos do Pedro');
  if (!savedLevel) throw new Error('The Maker level was not saved');
  await page.goto(`/jogos/pedro-maker/criar/${encodeURIComponent(savedLevel.id)}`);
  await expect(page.getByRole('textbox', { name: 'Nome da fase' })).toHaveValue('Recursos do Pedro');
  await page.getByRole('button', { name: 'Testar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pausar', exact: true })).toBeVisible({ timeout: 60_000 });
  await page.screenshot({ path: test.info().outputPath('wario-in-game.png') });
});

for (const mode of ['Normal', 'Infinito']) {
  test(`Craft creates, saves and reopens a ${mode} world`, async ({ page }) => {
    await page.goto('/jogos/pedro-craft');
    await page.getByRole('textbox', { name: 'Nome do mundo' }).fill(`Mundo ${mode}`);
    const radio = page.getByRole('radio', { name: new RegExp(`^${mode}\\b`) });
    await radio.click();
    await expect(radio).toHaveAttribute('aria-checked', 'true');
    await page.getByRole('button', { name: 'Criar mundo' }).click();
    await expect(page.getByRole('button', { name: 'Pausar', exact: true })).toBeVisible({ timeout: 60_000 });
    await page.getByRole('button', { name: 'Pausar', exact: true }).click();
    await page.getByRole('button', { name: 'Sair do mundo' }).click();
    const card = page.locator('li.world').filter({ has: page.getByRole('heading', { name: `Mundo ${mode}`, exact: true }) });
    await expect(card).toContainText(mode);
    await expect.poll(async () => (await savedRecords<SavedWorld>(page, 'craft-worlds'))
      .find((record) => record.name === `Mundo ${mode}`)?.state).toBeTruthy();
    const saves = await savedRecords<SavedWorld>(page, 'craft-worlds');
    const save = saves.find((record) => record.name === `Mundo ${mode}`);
    if (!save?.state) throw new Error('The world did not persist its playable state');
    expect(save.mode).toBe(mode === 'Normal' ? 'adventure' : 'infinite');
    expect(save.state).toBeTruthy();
    if (mode === 'Infinito') {
      expect(save.state.inventory.some((slot) => slot?.item.includes('gold'))).toBe(true);
      expect(save.state.containers.some((chest) => chest.slots.length === 54)).toBe(true);
    }
    await page.reload();
    await card.getByRole('link', { name: 'Jogar', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Pausar', exact: true })).toBeVisible({ timeout: 60_000 });
    await expect(page.locator('.bar__title')).toHaveText(`Mundo ${mode}`);
    await page.screenshot({ path: test.info().outputPath(`craft-${mode}.png`) });
  });
}
