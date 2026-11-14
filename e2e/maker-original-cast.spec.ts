import { expect, test } from '@playwright/test';
import { savedLevels } from './maker-storage';

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

test('Maker saves the raccoon leaf and the giga mushroom', async ({ page }) => {
  await page.goto('/jogos/pedro-maker/criar');
  await page.getByRole('textbox', { name: 'Nome da fase' }).fill('Fase do Guaxinim Gigante');
  await page.getByRole('textbox', { name: 'Nome da fase' }).press('Tab');
  const grid = page.getByRole('application', { name: /Grade da fase/ });
  await page.getByRole('tab', { name: 'Cogumelos', exact: true }).click();
  for (const [index, label] of ['Folha do Guaxinim', 'Giga Cogumelo'].entries()) {
    const piece = page.getByRole('button', { name: label, exact: true });
    await piece.click();
    await expect(piece).toHaveAttribute('aria-pressed', 'true');
    await grid.click({ position: { x: 144 + index * 32, y: 112 } });
  }
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect.poll(async () => (await savedLevels(page))
    .find((level) => level.name === 'Fase do Guaxinim Gigante')?.objects.map((object) => object.properties?.powerUp))
    .toEqual(expect.arrayContaining(['raccoon-leaf', 'giga-mushroom']));
  await page.screenshot({ path: test.info().outputPath('raccoon-giga-editor.png') });
});

test('Maker saves the turbo mushroom, the invisible grass and the castle portal in the Slime King castle', async ({ page }) => {
  await page.goto('/jogos/pedro-maker/criar');
  await page.getByRole('textbox', { name: 'Nome da fase' }).fill('Fase do Castelo do Rei Slime');
  await page.getByRole('textbox', { name: 'Nome da fase' }).press('Tab');
  await page.getByRole('combobox', { name: 'Tema da fase' }).selectOption('castelo-rei-slime');
  const grid = page.getByRole('application', { name: /Grade da fase/ });
  for (const [index, [tab, label]] of [['Cogumelos', 'Cogumelo Turbo'], ['Terreno', 'Grama Invisível'], ['Portais', 'Castelo final']].entries()) {
    await page.getByRole('tab', { name: tab, exact: true }).click();
    const piece = page.getByRole('button', { name: label, exact: true });
    await piece.click();
    await expect(piece).toHaveAttribute('aria-pressed', 'true');
    await grid.click({ position: { x: 144 + index * 32, y: 112 } });
  }
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect.poll(async () => {
    const level = (await savedLevels(page)).find((saved) => saved.name === 'Fase do Castelo do Rei Slime');
    return { theme: level?.theme, types: level?.objects.map((object) => object.properties?.powerUp ?? object.properties?.portalLook ?? object.type) };
  }).toEqual({ theme: 'castelo-rei-slime', types: expect.arrayContaining(['turbo-mushroom', 'invisible-grass', 'castle']) });
  await page.screenshot({ path: test.info().outputPath('slime-king-castle-editor.png') });
});

test('Maker saves the skeleton platform and the upside-down spring', async ({ page }) => {
  await page.goto('/jogos/pedro-maker/criar');
  await page.getByRole('textbox', { name: 'Nome da fase' }).fill('Fase dos Ossos');
  await page.getByRole('textbox', { name: 'Nome da fase' }).press('Tab');
  const grid = page.getByRole('application', { name: /Grade da fase/ });
  await page.getByRole('tab', { name: 'Plataformas', exact: true }).click();
  for (const [index, label] of ['Móvel Esqueleto', 'Mola de Cabeça pra Baixo'].entries()) {
    const piece = page.getByRole('button', { name: label, exact: true });
    await piece.click();
    await expect(piece).toHaveAttribute('aria-pressed', 'true');
    await grid.click({ position: { x: 144 + index * 128, y: 112 } });
  }
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect.poll(async () => (await savedLevels(page)).find((saved) => saved.name === 'Fase dos Ossos')?.objects.map((object) => object.type))
    .toEqual(expect.arrayContaining(['skeleton-platform', 'ceiling-spring']));
  await page.screenshot({ path: test.info().outputPath('skeleton-ceiling-spring-editor.png') });
});

test('Maker remembers Giuseppe as the chosen hero', async ({ page }) => {
  await page.goto('/jogos/pedro-maker/personagem');
  for (const name of ['Zeca Trovão', 'Tina Turbo', 'Bruno Bigorna', 'Ana Faísca', 'Caio Cometa', 'Nina Neblina', 'Otto Onda', 'Vavá Varapau', 'Rafa Rodopio', 'Duda Dínamo', 'Princesa Estrela', 'Princesa Jade', 'Princesa Coral']) {
    await expect(page.getByRole('button', { name: new RegExp(`^${name}\\b`) })).toBeVisible();
  }
  const giuseppe = page.getByRole('button', { name: /^Giuseppe\b/ });
  await giuseppe.click();
  await expect(giuseppe).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(page.getByRole('button', { name: /^Giuseppe\b/ })).toHaveAttribute('aria-pressed', 'true');
  await page.screenshot({ path: test.info().outputPath('original-heroes.png'), fullPage: true });
});

test('Maker builds a Halloween level with the new enemies and plays it', async ({ page }) => {
  await page.goto('/jogos/pedro-maker/criar');
  await page.getByRole('textbox', { name: 'Nome da fase' }).fill('Noite das Abóboras');
  await page.getByRole('textbox', { name: 'Nome da fase' }).press('Tab');
  await page.getByRole('combobox', { name: 'Tema da fase' }).selectOption('dia-das-bruxas');
  const grid = page.getByRole('application', { name: /Grade da fase/ });
  await page.getByRole('tab', { name: 'Inimigos', exact: true }).click();
  for (const [index, label] of ['Rei Cacto', 'Abóbora Viva', 'Bruxa'].entries()) {
    const piece = page.getByRole('button', { name: label, exact: true });
    await piece.click();
    await expect(piece).toHaveAttribute('aria-pressed', 'true');
    await grid.click({ position: { x: 208 + index * 96, y: 112 } });
  }
  await page.getByRole('tab', { name: 'Decoração', exact: true }).click();
  await page.getByRole('button', { name: 'Abóbora', exact: true }).click();
  await grid.click({ position: { x: 176, y: 208 } });
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect.poll(async () => {
    const level = (await savedLevels(page)).find((saved) => saved.name === 'Noite das Abóboras');
    return { theme: level?.theme, types: level?.objects.map((object) => object.type) };
  }).toEqual({ theme: 'dia-das-bruxas', types: expect.arrayContaining(['king-cactus', 'living-pumpkin', 'witch', 'pumpkin']) });
  await page.screenshot({ path: test.info().outputPath('halloween-editor.png') });
  await page.getByRole('button', { name: 'Testar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pausar', exact: true })).toBeVisible({ timeout: 60_000 });
  await page.screenshot({ path: test.info().outputPath('halloween-in-game.png') });
});

test('Maker builds the Cactus King castle with the desert mountain and plays it', async ({ page }) => {
  await page.goto('/jogos/pedro-maker/criar');
  await page.getByRole('textbox', { name: 'Nome da fase' }).fill('Castelo de Espinhos');
  await page.getByRole('textbox', { name: 'Nome da fase' }).press('Tab');
  await page.getByRole('combobox', { name: 'Tema da fase' }).selectOption('castelo-rei-cacto');
  const grid = page.getByRole('application', { name: /Grade da fase/ });
  await page.getByRole('tab', { name: 'Terreno', exact: true }).click();
  const mountain = page.getByRole('button', { name: 'Montanha do Deserto', exact: true });
  await mountain.click();
  await expect(mountain).toHaveAttribute('aria-pressed', 'true');
  await grid.click({ position: { x: 176, y: 208 } });
  await page.getByRole('tab', { name: 'Inimigos', exact: true }).click();
  await page.getByRole('button', { name: 'Rei Cacto', exact: true }).click();
  await grid.click({ position: { x: 304, y: 112 } });
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect.poll(async () => {
    const level = (await savedLevels(page)).find((saved) => saved.name === 'Castelo de Espinhos');
    return { theme: level?.theme, types: level?.objects.map((object) => object.type) };
  }).toEqual({ theme: 'castelo-rei-cacto', types: expect.arrayContaining(['desert-mountain', 'king-cactus']) });
  await page.screenshot({ path: test.info().outputPath('cactus-king-castle-editor.png') });
  await page.getByRole('button', { name: 'Testar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pausar', exact: true })).toBeVisible({ timeout: 60_000 });
  await page.screenshot({ path: test.info().outputPath('cactus-king-castle-in-game.png') });
});

test('Maker places doors C to F without a Power-ups tab and switches the game screen to NES', async ({ page }) => {
  test.slow();
  await page.goto('/jogos/pedro-maker/criar');
  await page.getByRole('textbox', { name: 'Nome da fase' }).fill('Fase das Portas');
  await page.getByRole('textbox', { name: 'Nome da fase' }).press('Tab');
  await expect(page.getByRole('tab', { name: 'Power-ups', exact: true })).toHaveCount(0);
  const grid = page.getByRole('application', { name: /Grade da fase/ });
  await page.getByRole('tab', { name: 'Portais', exact: true }).click();
  for (const [index, letter] of ['C', 'D', 'E', 'F'].entries()) {
    const piece = page.getByRole('button', { name: `Porta ${letter}`, exact: true });
    await piece.click();
    await expect(piece).toHaveAttribute('aria-pressed', 'true');
    await grid.click({ position: { x: 208 + index * 32, y: 112 } });
  }
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect.poll(async () => (await savedLevels(page))
    .find((level) => level.name === 'Fase das Portas')?.objects
    .filter((object) => object.type === 'door').map((object) => object.properties?.pair).sort())
    .toEqual(['C', 'D', 'E', 'F']);
  await page.getByRole('button', { name: 'Testar', exact: true }).click();
  await page.getByRole('button', { name: 'Pausar', exact: true }).click({ timeout: 60_000 });
  await page.getByRole('button', { name: /Configurações/ }).click();
  const nes = page.getByRole('radio', { name: 'NES', exact: true });
  await nes.click();
  await expect(nes).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('app-maker-game-host canvas')).toHaveCSS('image-rendering', 'pixelated');
  await page.screenshot({ path: test.info().outputPath('nes-screen-paused.png') });
});
