import { expect, test, type Locator, type Page } from '@playwright/test';
import { savedLevels } from './maker-storage';

interface Point {
  readonly x: number;
  readonly y: number;
}

const PORTRAIT_TABLET = { width: 820, height: 1180 };
const LANDSCAPE_TABLET = { width: 1180, height: 820 };
const SWIPE_STEPS = 12;

test.use({ hasTouch: true });

/**
 * A real finger swipe through the compositor: unlike synthetic DOM events,
 * it honours `touch-action`, which is what decides between scrolling and dragging.
 */
async function swipe(page: Page, from: Point, to: Point): Promise<void> {
  const session = await page.context().newCDPSession(page);
  const touch = (point: Point) => [{ x: Math.round(point.x), y: Math.round(point.y) }];

  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: touch(from) });
  for (let step = 1; step <= SWIPE_STEPS; step += 1) {
    const progress = step / SWIPE_STEPS;
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: touch({ x: from.x + (to.x - from.x) * progress, y: from.y + (to.y - from.y) * progress }),
    });
  }
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await session.detach();
}

async function centerOf(locator: Locator): Promise<Point> {
  const box = await locator.boundingBox();
  if (!box) {
    throw new Error('Element to touch is not visible.');
  }
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** How far the palette moved, whichever of its two scroll areas the layout uses. */
async function paletteScroll(page: Page): Promise<number> {
  return page.locator('.palette').evaluate((palette) => {
    const pieces = palette.querySelector('.palette__pieces');
    return palette.scrollTop + palette.scrollLeft + (pieces?.scrollTop ?? 0) + (pieces?.scrollLeft ?? 0);
  });
}

async function openEnemies(page: Page): Promise<Locator> {
  await page.goto('/jogos/pedro-maker/criar');
  await page.getByRole('tab', { name: 'Inimigos', exact: true }).click();
  const firstPiece = page.locator('.palette__pieces .piece').first();
  await expect(firstPiece).toBeVisible();
  return firstPiece;
}

/** Drags the slime from the palette onto the grid with a finger and checks it was saved in the level. */
async function expectDragToPlaceSlime(page: Page, levelName: string): Promise<void> {
  await page.goto('/jogos/pedro-maker/criar');
  await page.getByRole('textbox', { name: 'Nome da fase' }).fill(levelName);
  await page.getByRole('textbox', { name: 'Nome da fase' }).press('Tab');
  await page.getByRole('tab', { name: 'Inimigos', exact: true }).click();
  const grid = await centerOf(page.getByRole('application', { name: /Grade da fase/ }));
  const slime = await centerOf(page.getByRole('button', { name: 'Slime', exact: true }));

  await swipe(page, slime, grid);
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();

  await expect.poll(async () => (await savedLevels(page))
    .find((level) => level.name === levelName)?.objects.map((object) => object.type))
    .toEqual(expect.arrayContaining(['slime']));
}

test.describe('Maker palette on a portrait tablet', () => {
  test.use({ viewport: PORTRAIT_TABLET });

  test('a sideways swipe over the pieces scrolls the row', async ({ page }) => {
    const start = await centerOf(await openEnemies(page));

    await swipe(page, { x: start.x + 300, y: start.y }, start);

    await expect.poll(() => paletteScroll(page)).toBeGreaterThan(0);
  });

  test('dragging a piece up onto the grid still places it', async ({ page }) => {
    await expectDragToPlaceSlime(page, 'Tablet em Pé');
  });
});

test.describe('Maker palette on a landscape tablet', () => {
  test.use({ viewport: LANDSCAPE_TABLET });

  test('an upward swipe over the pieces scrolls the side column', async ({ page }) => {
    const start = await centerOf(await openEnemies(page));

    await swipe(page, { x: start.x, y: start.y + 300 }, start);

    await expect.poll(() => paletteScroll(page)).toBeGreaterThan(0);
  });

  test('dragging a piece sideways onto the grid still places it', async ({ page }) => {
    await expectDragToPlaceSlime(page, 'Tablet Deitado');
  });
});
