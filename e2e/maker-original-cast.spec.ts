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
  for (const name of ['Zeca Trovão', 'Tina Turbo', 'Bruno Bigorna', 'Ana Faísca', 'Caio Cometa', 'Nina Neblina', 'Otto Onda', 'Vavá Varapau', 'Rafa Rodopio', 'Duda Dínamo', 'Princesa Estrela', 'Princesa Jade', 'Princesa Coral', 'Princesa Peach', 'Princesa Daisy']) {
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

test('Maker saves the coin multipliers from the Items tab and plays a level with them', async ({ page }) => {
  test.slow();
  await page.goto('/jogos/pedro-maker/criar');
  await page.getByRole('textbox', { name: 'Nome da fase' }).fill('Fase das Moedas Mágicas');
  await page.getByRole('textbox', { name: 'Nome da fase' }).press('Tab');
  const grid = page.getByRole('application', { name: /Grade da fase/ });
  await page.getByRole('tab', { name: 'Itens', exact: true }).click();
  for (const [index, label] of ['Moeda ×2', 'Moeda ×4', 'Moeda ×1000', 'Moeda ×9999'].entries()) {
    const piece = page.getByRole('button', { name: label, exact: true });
    await piece.click();
    await expect(piece).toHaveAttribute('aria-pressed', 'true');
    await grid.click({ position: { x: 208 + index * 32, y: 112 } });
  }
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect.poll(async () => (await savedLevels(page))
    .find((level) => level.name === 'Fase das Moedas Mágicas')?.objects
    .flatMap((object) => (object.properties?.powerUp ? [object.properties.powerUp] : [])).sort())
    .toEqual(['coin-x1000', 'coin-x2', 'coin-x4', 'coin-x9999']);
  await page.screenshot({ path: test.info().outputPath('coin-multipliers-editor.png') });
  await page.getByRole('button', { name: 'Testar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pausar', exact: true })).toBeVisible({ timeout: 60_000 });
  await page.screenshot({ path: test.info().outputPath('coin-multipliers-playing.png') });
});

test('Maker saves the magnet, tall, reverse and shrink mushrooms and plays a level with them', async ({ page }) => {
  test.slow();
  await page.goto('/jogos/pedro-maker/criar');
  await page.getByRole('textbox', { name: 'Nome da fase' }).fill('Fase dos Cogumelos Novos');
  await page.getByRole('textbox', { name: 'Nome da fase' }).press('Tab');
  const grid = page.getByRole('application', { name: /Grade da fase/ });
  await page.getByRole('tab', { name: 'Cogumelos', exact: true }).click();
  for (const [index, label] of ['Cogumelo Ímã', 'Cogumelo Alto', 'Cogumelo Reverso', 'Cogumelo de Encolher'].entries()) {
    const piece = page.getByRole('button', { name: label, exact: true });
    await piece.click();
    await expect(piece).toHaveAttribute('aria-pressed', 'true');
    await grid.click({ position: { x: 208 + index * 32, y: 112 } });
  }
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect.poll(async () => (await savedLevels(page))
    .find((level) => level.name === 'Fase dos Cogumelos Novos')?.objects
    .flatMap((object) => (object.properties?.powerUp ? [object.properties.powerUp] : [])).sort())
    .toEqual(['magnet-mushroom', 'mini-mushroom', 'reverse-mushroom', 'tall-mushroom']);
  await page.screenshot({ path: test.info().outputPath('new-mushrooms-editor.png') });
  await page.getByRole('button', { name: 'Testar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pausar', exact: true })).toBeVisible({ timeout: 60_000 });
  await page.screenshot({ path: test.info().outputPath('new-mushrooms-playing.png') });
});

test('Maker saves warp pipes, a talking flower and a fire bar and plays the level', async ({ page }) => {
  test.slow();
  await page.goto('/jogos/pedro-maker/criar');
  await page.getByRole('textbox', { name: 'Nome da fase' }).fill('Fase do Cano');
  await page.getByRole('textbox', { name: 'Nome da fase' }).press('Tab');
  const grid = page.getByRole('application', { name: /Grade da fase/ });
  const place = async (tab: string, label: string, x: number): Promise<void> => {
    await page.getByRole('tab', { name: tab, exact: true }).click();
    const piece = page.getByRole('button', { name: label, exact: true });
    await piece.click();
    await expect(piece).toHaveAttribute('aria-pressed', 'true');
    await grid.click({ position: { x, y: 112 } });
  };
  await place('Portais', 'Cano C', 208);
  await place('Portais', 'Cano C', 400);
  await place('Decoração', 'Flor Falante', 272);
  await place('Blocos', 'Bastão de Fogo Comprido', 336);
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect.poll(async () => (await savedLevels(page))
    .find((level) => level.name === 'Fase do Cano')?.objects
    .flatMap((object) => (['warp-pipe', 'talking-flower', 'fire-bar'].includes(object.type)
      ? [`${object.type}:${object.properties?.pair ?? object.properties?.text ?? object.properties?.range ?? ''}`]
      : [])).sort())
    .toEqual(['fire-bar:6', 'talking-flower:Oi! Boa sorte na fase!', 'warp-pipe:C', 'warp-pipe:C']);
  await page.screenshot({ path: test.info().outputPath('pipe-flower-firebar-editor.png') });
  await page.getByRole('button', { name: 'Testar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pausar', exact: true })).toBeVisible({ timeout: 60_000 });
  await page.screenshot({ path: test.info().outputPath('pipe-flower-firebar-playing.png') });
});

test('Maker saves a P switch and the level screen chosen in the Screens tab, and plays in it', async ({ page }) => {
  test.slow();
  await page.goto('/jogos/pedro-maker/criar');
  await page.getByRole('textbox', { name: 'Nome da fase' }).fill('Fase do Botão P');
  await page.getByRole('textbox', { name: 'Nome da fase' }).press('Tab');
  const grid = page.getByRole('application', { name: /Grade da fase/ });
  await page.getByRole('tab', { name: 'Blocos', exact: true }).click();
  for (const [index, label] of ['Botão P', 'Quebrável', 'Quebrável'].entries()) {
    const piece = page.getByRole('button', { name: label, exact: true });
    await piece.click();
    await expect(piece).toHaveAttribute('aria-pressed', 'true');
    await grid.click({ position: { x: 208 + index * 32, y: 112 } });
  }
  await page.getByRole('tab', { name: 'Telas', exact: true }).click();
  const anyone = page.getByRole('button', { name: 'Quem joga escolhe', exact: true });
  await expect(anyone).toHaveAttribute('aria-pressed', 'true');
  for (const label of ['NES', 'SNES', 'Nintendo 64', '3D', '4K']) {
    await expect(page.getByRole('button', { name: label, exact: true })).toBeVisible();
  }
  const hd = page.getByRole('button', { name: 'HD', exact: true });
  await hd.click();
  await expect(hd).toHaveAttribute('aria-pressed', 'true');
  await expect(anyone).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect.poll(async () => {
    const level = (await savedLevels(page)).find((candidate) => candidate.name === 'Fase do Botão P');
    return level && `${level.screen}:${level.objects.filter((object) => object.type === 'p-switch' || object.type === 'brick').length}`;
  }).toBe('hd:3');
  await page.screenshot({ path: test.info().outputPath('p-switch-screens-editor.png') });
  await page.getByRole('button', { name: 'Testar', exact: true }).click();
  await page.getByRole('button', { name: 'Pausar', exact: true }).click({ timeout: 60_000 });
  await page.getByRole('button', { name: /Configurações/ }).click();
  await expect(page.getByRole('radio', { name: 'HD', exact: true })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByRole('radio', { name: '4K', exact: true })).toHaveAttribute('aria-checked', 'false');
  await page.screenshot({ path: test.info().outputPath('p-switch-screens-paused.png') });
});

test('Maker saves the key, the locked door, the chain, the lever and the Giant Coin, and plays the level', async ({ page }) => {
  test.slow();
  await page.goto('/jogos/pedro-maker/criar');
  await page.getByRole('textbox', { name: 'Nome da fase' }).fill('Fase da Chave');
  await page.getByRole('textbox', { name: 'Nome da fase' }).press('Tab');
  const grid = page.getByRole('application', { name: /Grade da fase/ });
  const pieces = [
    ['Itens', 'Chave'],
    ['Itens', 'Moeda Gigantesca'],
    ['Blocos', 'Alavanca'],
    ['Blocos', 'Corrente'],
    ['Portais', 'Porta com Chave'],
  ] as const;
  for (const [index, [tab, label]] of pieces.entries()) {
    await page.getByRole('tab', { name: tab, exact: true }).click();
    const piece = page.getByRole('button', { name: label, exact: true });
    await piece.click();
    await expect(piece).toHaveAttribute('aria-pressed', 'true');
    await grid.click({ position: { x: 208 + index * 64, y: 112 } });
  }
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect.poll(async () => (await savedLevels(page))
    .find((level) => level.name === 'Fase da Chave')?.objects.map((object) => object.type))
    .toEqual(expect.arrayContaining(['key', 'mega-coin', 'lever', 'chain', 'locked-door']));
  await page.screenshot({ path: test.info().outputPath('locks-editor.png') });
  await page.getByRole('button', { name: 'Testar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pausar', exact: true })).toBeVisible({ timeout: 60_000 });
  await page.screenshot({ path: test.info().outputPath('locks-in-game.png') });
});

test('Maker has a Flags tab with the checkpoint and the Goal Flag, and plays a level that ends on the flag', async ({ page }) => {
  test.slow();
  await page.goto('/jogos/pedro-maker/criar');
  await page.getByRole('textbox', { name: 'Nome da fase' }).fill('Fase da Bandeira');
  await page.getByRole('textbox', { name: 'Nome da fase' }).press('Tab');
  await expect(page.getByRole('tab', { name: 'Checkpoints', exact: true })).toHaveCount(0);
  const grid = page.getByRole('application', { name: /Grade da fase/ });
  await page.getByRole('tab', { name: 'Bandeiras', exact: true }).click();
  for (const [index, label] of ['Checkpoint', 'Bandeira Final'].entries()) {
    const piece = page.getByRole('button', { name: label, exact: true });
    await piece.click();
    await expect(piece).toHaveAttribute('aria-pressed', 'true');
    await grid.click({ position: { x: 208 + index * 96, y: 112 } });
  }
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect.poll(async () => {
    const level = (await savedLevels(page)).find((candidate) => candidate.name === 'Fase da Bandeira');
    const portals = level?.objects.filter((object) => object.type === 'portal') ?? [];
    return level && `${portals.length}:${portals[0]?.properties?.portalLook}:${level.objects.some((object) => object.type === 'checkpoint')}`;
  }).toBe('1:flag:true');
  await page.screenshot({ path: test.info().outputPath('goal-flag-editor.png') });
  await page.getByRole('button', { name: 'Testar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pausar', exact: true })).toBeVisible({ timeout: 60_000 });
  await page.screenshot({ path: test.info().outputPath('goal-flag-in-game.png') });
});

test('Maker saves the Crushing Press, the Climbing Chain and the lever, and plays the level', async ({ page }) => {
  test.slow();
  await page.goto('/jogos/pedro-maker/criar');
  await page.getByRole('textbox', { name: 'Nome da fase' }).fill('Fase da Prensa');
  await page.getByRole('textbox', { name: 'Nome da fase' }).press('Tab');
  const grid = page.getByRole('application', { name: /Grade da fase/ });
  const pieces = ['Prensa Esmagadora', 'Corrente de Subir', 'Alavanca'] as const;
  await page.getByRole('tab', { name: 'Blocos', exact: true }).click();
  for (const [index, label] of pieces.entries()) {
    const piece = page.getByRole('button', { name: label, exact: true });
    await piece.click();
    await expect(piece).toHaveAttribute('aria-pressed', 'true');
    await grid.click({ position: { x: 208 + index * 64, y: 112 } });
  }
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect.poll(async () => (await savedLevels(page))
    .find((level) => level.name === 'Fase da Prensa')?.objects.map((object) => object.type))
    .toEqual(expect.arrayContaining(['crusher', 'climb-chain', 'lever']));
  await page.screenshot({ path: test.info().outputPath('crusher-editor.png') });
  await page.getByRole('button', { name: 'Testar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pausar', exact: true })).toBeVisible({ timeout: 60_000 });
  await page.screenshot({ path: test.info().outputPath('crusher-in-game.png') });
});
