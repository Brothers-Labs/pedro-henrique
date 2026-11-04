import { expect, test } from '@playwright/test';

interface SavedLevel {
  readonly id: string;
  readonly name: string;
  readonly objects: readonly { readonly type: string; readonly properties?: { readonly powerUp?: string } }[];
}

/** Read saved levels after real UI actions, without changing game state through test hooks. */
async function savedLevels(page: import('@playwright/test').Page): Promise<SavedLevel[]> {
  return page.evaluate(() => new Promise<SavedLevel[]>((resolve, reject) => {
    const opening = indexedDB.open('pedro-henrique-site');
    opening.onerror = () => reject(opening.error);
    opening.onsuccess = () => {
      const database = opening.result;
      const request = database.transaction('maker-levels').objectStore('maker-levels').getAll();
      request.onsuccess = () => { database.close(); resolve(request.result as SavedLevel[]); };
      request.onerror = () => { database.close(); reject(request.error); };
    };
  }));
}

test('Maker saves the chained iron ball and plays a level with it', async ({ page }) => {
  await page.goto('/jogos/pedro-maker/criar');
  await page.getByRole('textbox', { name: 'Nome da fase' }).fill('Fase do Bolão');
  await page.getByRole('textbox', { name: 'Nome da fase' }).press('Tab');
  const grid = page.getByRole('application', { name: /Grade da fase/ });
  await page.getByRole('tab', { name: 'Inimigos', exact: true }).click();
  const ironBall = page.getByRole('button', { name: 'Bolão na Corrente', exact: true });
  await ironBall.click();
  await expect(ironBall).toHaveAttribute('aria-pressed', 'true');
  await grid.click({ position: { x: 208, y: 112 } });
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect.poll(async () => (await savedLevels(page))
    .find((level) => level.name === 'Fase do Bolão')?.objects.map((object) => object.type))
    .toEqual(expect.arrayContaining(['iron-ball']));
  await page.getByRole('button', { name: 'Testar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pausar', exact: true })).toBeVisible({ timeout: 60_000 });
  await page.screenshot({ path: test.info().outputPath('iron-ball-in-game.png') });
});

test('Maker saves both fish enemies placed from the editor', async ({ page }) => {
  await page.goto('/jogos/pedro-maker/criar');
  await page.getByRole('textbox', { name: 'Nome da fase' }).fill('Fase dos Peixes');
  await page.getByRole('textbox', { name: 'Nome da fase' }).press('Tab');
  const grid = page.getByRole('application', { name: /Grade da fase/ });
  await page.getByRole('tab', { name: 'Inimigos', exact: true }).click();
  for (const [label, x] of [['Peixe Nadador', 208], ['Peixe Saltador', 272]] as const) {
    const piece = page.getByRole('button', { name: label, exact: true });
    await piece.click();
    await expect(piece).toHaveAttribute('aria-pressed', 'true');
    await grid.click({ position: { x, y: 112 } });
  }
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect.poll(async () => (await savedLevels(page))
    .find((level) => level.name === 'Fase dos Peixes')?.objects.map((object) => object.type))
    .toEqual(expect.arrayContaining(['fish', 'jumping-fish']));
  await page.screenshot({ path: test.info().outputPath('fish-enemies-editor.png') });
});

test('Maker saves the cat and leaf mushrooms and the new giant coins', async ({ page }) => {
  await page.goto('/jogos/pedro-maker/criar');
  await page.getByRole('textbox', { name: 'Nome da fase' }).fill('Fase dos Cogumelos');
  await page.getByRole('textbox', { name: 'Nome da fase' }).press('Tab');
  const grid = page.getByRole('application', { name: /Grade da fase/ });
  const place = async (label: string, x: number): Promise<void> => {
    const piece = page.getByRole('button', { name: label, exact: true });
    await piece.click();
    await expect(piece).toHaveAttribute('aria-pressed', 'true');
    await grid.click({ position: { x, y: 112 } });
  };
  await page.getByRole('tab', { name: 'Cogumelos', exact: true }).click();
  await place('Cogumelo Gato', 144);
  await place('Cogumelo Folha', 176);
  await page.getByRole('tab', { name: 'Itens', exact: true }).click();
  for (const [index, label] of ['5', '25k', '100k', '250k', '500k', '1M'].entries()) {
    await place(`Moeda Gigante ${label}`, 208 + index * 32);
  }
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect.poll(async () => {
    const level = (await savedLevels(page)).find((saved) => saved.name === 'Fase dos Cogumelos');
    return level?.objects.map((object) => object.type === 'power-up' ? object.properties?.powerUp : object.type);
  }).toEqual(expect.arrayContaining([
    'cat-mushroom', 'leaf-mushroom', 'coin-5', 'coin-25000', 'coin-100000', 'coin-250000', 'coin-500000', 'coin-1000000',
  ]));
  await page.screenshot({ path: test.info().outputPath('cat-leaf-mushrooms-editor.png') });
});

test('Maker remembers Giuseppe as the chosen hero', async ({ page }) => {
  await page.goto('/jogos/pedro-maker/personagem');
  for (const name of ['Zeca Trovão', 'Tina Turbo', 'Bruno Bigorna', 'Ana Faísca', 'Caio Cometa', 'Nina Neblina', 'Otto Onda', 'Vavá Varapau', 'Rafa Rodopio', 'Duda Dínamo']) {
    await expect(page.getByRole('button', { name: new RegExp(`^${name}\\b`) })).toBeVisible();
  }
  const giuseppe = page.getByRole('button', { name: /^Giuseppe\b/ });
  await giuseppe.click();
  await expect(giuseppe).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(page.getByRole('button', { name: /^Giuseppe\b/ })).toHaveAttribute('aria-pressed', 'true');
  await page.screenshot({ path: test.info().outputPath('original-heroes.png'), fullPage: true });
});
