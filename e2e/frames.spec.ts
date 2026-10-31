import { expect, test, type Page } from '@playwright/test';

const scrollY = (page: Page) => page.evaluate(() => window.scrollY);
const topOf = (page: Page, selector: string) =>
  page
    .locator(selector)
    .evaluate((element) => Math.round(element.getBoundingClientRect().top + window.scrollY));

const jumpTo = (page: Page, top: number) =>
  page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), top);

const settlesAt = (page: Page, top: number) =>
  expect.poll(() => scrollY(page).then(Math.round), { timeout: 5000 }).toBe(top);

test.describe('the guide', () => {
  test.skip(({ isMobile }) => isMobile, 'The touch journey has its own test.');

  test('a little scroll is guided into the next frame, and back', async ({ page }) => {
    await page.goto('/');
    await page.mouse.move(700, 450);
    await page.mouse.wheel(0, 120);
    await settlesAt(page, await topOf(page, '.abn-cover'));
    await page.mouse.wheel(0, 120);
    await settlesAt(page, await topOf(page, '.abn-room'));
    await page.mouse.wheel(0, -120);
    await settlesAt(page, await topOf(page, '.abn-cover'));
  });

  test('the wheel can pass straight through every frame without clicking', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/');
    await page.mouse.move(700, 450);
    const bottom = await page.evaluate(() => document.body.scrollHeight - window.innerHeight);
    for (let turn = 0; turn < 40 && (await scrollY(page)) < bottom - 4; turn += 1) {
      await page.mouse.wheel(0, 700);
      await page.waitForTimeout(40);
    }
    await expect.poll(() => scrollY(page)).toBeGreaterThan(bottom - 4);
    await expect(page.locator('.contact__mail')).toBeInViewport();
  });

  test('the keyboard can pass through every frame', async ({ page }) => {
    await page.goto('/');
    const top = await topOf(page, '.abn-cover');
    await page.keyboard.press('PageDown');
    await settlesAt(page, top);
    await page.keyboard.press('ArrowDown');
    await settlesAt(page, await topOf(page, '.abn-room'));
    await page.keyboard.press('End');
    await expect(page.locator('.contact__mail')).toBeInViewport({ timeout: 5000 });
    await page.keyboard.press('Home');
    await settlesAt(page, 0);
  });

  test('a scroll that was not the visitor’s is left where it stopped', async ({ page }) => {
    await page.goto('/');
    const top = (await topOf(page, '.abn-room')) + 200;
    await jumpTo(page, top);
    await page.waitForTimeout(600);
    expect(await scrollY(page)).toBe(top);
  });

  test('the index and footer scroll freely', async ({ page }) => {
    await page.goto('/');
    const top = await topOf(page, '#go');
    await jumpTo(page, top + 40);
    await page.mouse.move(700, 450);
    await page.mouse.wheel(0, 100);
    await page.waitForTimeout(700);
    expect(await scrollY(page)).toBe(top + 140);
  });

  test('a link used while the guide is travelling wins', async ({ page }) => {
    await page.goto('/');
    await page.mouse.move(700, 450);
    await page.mouse.wheel(0, 120);
    await expect.poll(() => scrollY(page)).toBeGreaterThan(200);
    await page.locator('.chrome__name').click();
    await settlesAt(page, 0);
    await page.waitForTimeout(700);
    expect(await scrollY(page)).toBe(0);
  });

  test('a key that moved nothing does not guide the next scroll', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Home');
    await page.waitForTimeout(500);
    const top = (await topOf(page, '.abn-room')) + 200;
    await jumpTo(page, top);
    await page.waitForTimeout(700);
    expect(await scrollY(page)).toBe(top);
  });

  test('zooming with the wheel is left alone', async ({ page }) => {
    await page.goto('/');
    await jumpTo(page, 300);
    await page.mouse.move(700, 450);
    await page.keyboard.down('Control');
    await page.mouse.wheel(0, 40);
    await page.keyboard.up('Control');
    await page.waitForTimeout(100);
    const landed = await scrollY(page);
    await page.waitForTimeout(500);
    expect(await scrollY(page)).toBe(landed);
  });

  test('tabbing into a frame lines the whole frame up', async ({ page }) => {
    await page.goto('/');
    await page.locator('.abn-show__recap').focus();
    await page.keyboard.press('Tab');
    await expect(page.locator('.rope')).toBeFocused();
    await settlesAt(page, await topOf(page, '#offbooked'));
  });
});

test('a small swipe is guided into the next frame', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Touch is a phone journey.');
  await page.goto('/');
  const client = await page.context().newCDPSession(page);
  const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', y: number) =>
    client.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: type === 'touchEnd' ? [] : [{ x: 200, y }],
    });
  await touch('touchStart', 500);
  for (let step = 1; step <= 5; step += 1) await touch('touchMove', 500 - step * 30);
  await touch('touchEnd', 350);
  await settlesAt(page, await topOf(page, '.abn-cover'));
});

const heroCount = 5;

test('the toggle swaps the hero, and the choice can be linked to', async ({ page }) => {
  test.setTimeout(60000);
  await page.goto('/');
  const toggle = page.locator('[data-hero-toggle]');
  await expect(toggle).toBeVisible();
  const buttons = toggle.locator('button');
  await expect(buttons).toHaveCount(heroCount);
  await expect(buttons.nth(1)).toHaveAttribute('aria-pressed', 'true');
  const seen = new Set<string>();
  for (let option = 1; option <= heroCount; option += 1) {
    await buttons.nth(option - 1).click();
    await expect(page).toHaveURL(new RegExp(`\\?hero=${option}$`));
    await expect(buttons.nth(option - 1)).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('h1')).toHaveCount(1);
    seen.add((await page.locator('[data-hero-slot]').getAttribute('data-hero-shown')) ?? '');
  }
  expect(seen.size).toBe(heroCount);

  await page.goto('/?hero=4');
  await expect(page.locator('[data-badge]')).toBeVisible();
  await expect(buttons.nth(3)).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(page.locator('[data-badge]')).toBeVisible();
});

test.describe('each hero, standing still', () => {
  test.use({ reducedMotion: 'reduce' });

  for (let option = 1; option <= heroCount; option += 1) {
    test(`hero ${option} says who and what, and fits every size`, async ({ page }) => {
      test.setTimeout(60000);
      for (const [width, height] of [
        [320, 640],
        [390, 844],
        [844, 390],
        [768, 1024],
        [1024, 768],
        [1440, 900],
        [1920, 1080],
      ] as const) {
        const size = `hero ${option} at ${width}x${height}`;
        await page.setViewportSize({ width, height });
        await page.goto(`/?hero=${option}`);
        await expect(page.locator('h1')).toHaveCount(1);
        await expect(page.locator('h1')).toContainText('Nathan Pannell');
        await expect(page.locator('h1')).toContainText('real people');
        const worlds = page.locator('[data-hero-slot] a[href^="#"]');
        await expect(worlds).toHaveCount(4);
        await expect(page.locator('.hero__next')).toBeInViewport({ ratio: 1 });
        // Each link's middle can be reached: nothing sits on top of it, and it is on screen.
        for (const world of await worlds.all()) {
          await expect
            .poll(
              () =>
                world.evaluate((element) => {
                  const { left, right, top, bottom } = element.getBoundingClientRect();
                  const hit = document.elementFromPoint((left + right) / 2, (top + bottom) / 2);
                  return left >= 0 && right <= window.innerWidth + 1 && element.contains(hit);
                }),
              size,
            )
            .toBe(true);
        }
        // No line of type runs off the side of the screen.
        const clipped = await page.locator('[data-hero-slot]').evaluate((slot) =>
          [...slot.querySelectorAll<HTMLElement>('*')]
            .filter(
              (element) =>
                !element.closest('.sr-only') &&
                [...element.childNodes].some((node) => node.nodeType === Node.TEXT_NODE),
            )
            .filter((element) => {
              const { left, right } = element.getBoundingClientRect();
              return element.textContent?.trim() && (left < -1 || right > window.innerWidth + 1);
            })
            .map((element) => element.textContent?.trim().slice(0, 30)),
        );
        expect(clipped, size).toEqual([]);
      }
    });
  }
});

test('a choice that does not exist falls back to the default', async ({ page }) => {
  await page.goto('/?hero=9');
  await expect(page.locator('.doors')).toBeVisible();
});

test('the toggle only exists on staging and local builds', async ({ page, baseURL }) => {
  // Serve this build from the production address.
  await page.route('https://www.nathanpannell.com/**', async (route) => {
    const { pathname, search } = new URL(route.request().url());
    const response = await route.fetch({ url: `${baseURL}${pathname}${search}` });
    await route.fulfill({ response });
  });
  await page.goto('https://www.nathanpannell.com/?hero=3');
  await expect(page.locator('.doors')).toBeVisible();
  await expect(page.locator('[data-hero-toggle]')).toBeHidden();
});

test('the name badge swings when dragged, and settles', async ({ page, isMobile }) => {
  test.skip(isMobile, 'The drag uses the mouse; touch shares its pointer events.');
  await page.goto('/?hero=4');
  const badge = page.locator('[data-badge]');
  const angle = () =>
    badge.evaluate((element) => Number(/rotate\((.+)deg\)/.exec(element.style.transform)?.[1]));
  await expect.poll(() => angle().then(Math.abs), { timeout: 12000 }).toBeLessThan(1);
  const box = await page.locator('.badge__name').boundingBox();
  if (!box) throw new Error('No badge name');
  await page.mouse.move(box.x + 40, box.y + 10);
  await page.mouse.down();
  await page.mouse.move(box.x + 240, box.y + 10, { steps: 6 });
  expect(Math.abs(await angle())).toBeGreaterThan(5);
  await page.mouse.up();
  await expect.poll(() => angle().then(Math.abs), { timeout: 12000 }).toBeLessThan(1);
});

test('the sentence rewrites itself through the four worlds', async ({ page }) => {
  await page.goto('/?hero=3');
  const clause = page.locator('[data-clause]');
  await expect(clause).toHaveText('things for real people.');
  await expect(clause).toHaveText('a night for builders.', { timeout: 6000 });
  await expect(page.locator('[data-clause-of][data-current]')).toHaveText('AI Build Night');
});

test('the board flaps to its final words', async ({ page }) => {
  await page.goto('/?hero=5');
  const flaps = page.locator('.board__line--name .flap');
  const name = () => flaps.evaluateAll((cells) => cells.map((c) => c.textContent).join(''));
  await expect.poll(name, { timeout: 4000 }).toBe('NATHANPANNELL');
});

test('a door works the second time too', async ({ page }) => {
  await page.goto('/');
  const door = page.locator('.door a').nth(2);
  await door.click();
  await expect(page).toHaveURL(/#parkdex$/);
  await settlesAt(page, await topOf(page, '#parkdex'));
  await jumpTo(page, 0);
  await door.click();
  await settlesAt(page, await topOf(page, '#parkdex'));
});

test('pressing the hero already showing leaves it running', async ({ page }) => {
  await page.goto('/?hero=3');
  const clause = page.locator('[data-clause]');
  await expect(clause).toHaveText('a night for builders.', { timeout: 6000 });
  await page.locator('[data-hero-pick="sentence"]').click();
  await expect(clause).toHaveText('rehearsals for casts.', { timeout: 6000 });
});

test('a door swings open before the page moves on', async ({ page, isMobile }) => {
  await page.goto('/');
  const door = page.locator('.door').nth(2);
  await door.locator('a').click();
  if (!isMobile) await expect(door).toHaveAttribute('data-opening', '');
  await expect(page).toHaveURL(/#parkdex$/);
  await expect(door).not.toHaveAttribute('data-opening', '');
});
