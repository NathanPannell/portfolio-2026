import { expect, test, type Page } from '@playwright/test';

// How long a scroll is left alone before the page frames itself. Matches frames.ts.
const IDLE = 1500;

const scrollY = (page: Page) => page.evaluate(() => window.scrollY);
const topOf = (page: Page, selector: string) =>
  page
    .locator(selector)
    .evaluate((element) => Math.round(element.getBoundingClientRect().top + window.scrollY));

const jumpTo = (page: Page, top: number) =>
  page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), top);

const settlesAt = (page: Page, top: number) =>
  expect.poll(() => scrollY(page).then(Math.round), { timeout: 10000 }).toBe(top);

// Lets the page start framing itself, and hands back where it had got to.
const glideUnderway = async (page: Page, from: number) => {
  await expect.poll(() => scrollY(page), { timeout: 6000 }).not.toBe(from);
  return scrollY(page);
};

test.describe('scrolling', () => {
  test.skip(({ isMobile }) => isMobile, 'The touch journey has its own test.');

  test('the page stays exactly where the wheel left it for a moment', async ({ page }) => {
    await page.goto('/');
    await page.mouse.move(700, 450);
    await page.mouse.wheel(0, 120);
    await expect.poll(() => scrollY(page)).toBe(120);
    await page.waitForTimeout(IDLE - 400);
    expect(await scrollY(page)).toBe(120);
  });

  test('left alone, it eases to frame the nearest screen', async ({ page }) => {
    await page.goto('/');
    await page.mouse.move(700, 450);
    await page.mouse.wheel(0, 120);
    await settlesAt(page, 0);
    await page.mouse.wheel(0, 620);
    await settlesAt(page, await topOf(page, '.abn-cover'));
  });

  test('the wheel stops a settle at once', async ({ page }) => {
    await page.goto('/');
    await page.mouse.move(700, 450);
    await page.mouse.wheel(0, 300);
    await expect.poll(() => scrollY(page)).toBe(300);
    const underway = await glideUnderway(page, 300);
    expect(underway).toBeLessThan(300);
    await page.mouse.wheel(0, 200);
    await page.waitForTimeout(120);
    const after = await scrollY(page);
    expect(after).toBeGreaterThan(underway);
    // No more glide: it stays with the visitor, until it has been left alone again.
    await page.waitForTimeout(500);
    expect(await scrollY(page)).toBe(after);
  });

  test('a key stops a settle at once', async ({ page }) => {
    await page.goto('/');
    await page.mouse.move(700, 450);
    await page.mouse.wheel(0, 300);
    await expect.poll(() => scrollY(page)).toBe(300);
    await glideUnderway(page, 300);
    await page.keyboard.press('Shift');
    const held = await scrollY(page);
    await page.waitForTimeout(500);
    expect(await scrollY(page)).toBe(held);
    expect(held).toBeGreaterThan(0);
  });

  test('a key during the wait means there is no settle', async ({ page }) => {
    await page.goto('/');
    await page.mouse.move(700, 450);
    await page.mouse.wheel(0, 300);
    await expect.poll(() => scrollY(page)).toBe(300);
    await page.waitForTimeout(500);
    await page.keyboard.press('Shift');
    await page.waitForTimeout(IDLE + 500);
    expect(await scrollY(page)).toBe(300);
  });

  test('a stray sideways wheel leaves a waiting settle waiting', async ({ page }) => {
    await page.goto('/');
    await page.mouse.move(700, 450);
    await page.mouse.wheel(0, 120);
    await expect.poll(() => scrollY(page)).toBe(120);
    await page.waitForTimeout(400);
    await page.mouse.wheel(30, 0);
    await settlesAt(page, 0);
  });

  test('a press stops a settle at once', async ({ page }) => {
    await page.goto('/');
    await page.mouse.move(700, 450);
    await page.mouse.wheel(0, 300);
    await expect.poll(() => scrollY(page)).toBe(300);
    await glideUnderway(page, 300);
    // Away from the links, because this press is only taking hold of the page.
    await page.mouse.move(1000, 10);
    await page.mouse.down();
    await page.mouse.up();
    const held = await scrollY(page);
    await page.waitForTimeout(500);
    expect(await scrollY(page)).toBe(held);
  });

  test('a fling goes straight past every closed screen', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/');
    await page.mouse.move(700, 450);
    const bottom = await page.evaluate(() => document.body.scrollHeight - window.innerHeight);
    let last = -1;
    for (let turn = 0; turn < 40 && (await scrollY(page)) < bottom - 4; turn += 1) {
      await page.mouse.wheel(0, 700);
      await page.waitForTimeout(40);
      const y = await scrollY(page);
      expect(y).toBeGreaterThanOrEqual(last);
      last = y;
    }
    await expect.poll(() => scrollY(page)).toBeGreaterThan(bottom - 4);
    await expect(page.locator('.contact__mail')).toBeInViewport();
    await expect(page.locator('[data-waiting]')).toHaveCount(4);
  });

  test('the keyboard can pass through every screen', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('PageDown');
    await settlesAt(page, await topOf(page, '.abn-cover'));
    await page.keyboard.press('End');
    await settlesAt(
      page,
      await page.evaluate(() => document.body.scrollHeight - window.innerHeight),
    );
    await expect(page.locator('.contact__mail')).toBeInViewport();
    await page.keyboard.press('Home');
    await settlesAt(page, 0);
  });

  test('a scroll that was not the visitor’s is left where it stopped', async ({ page }) => {
    await page.goto('/');
    const top = (await topOf(page, '#offbooked')) + 200;
    await jumpTo(page, top);
    await page.waitForTimeout(IDLE + 500);
    expect(await scrollY(page)).toBe(top);
  });

  test('the index and footer scroll freely', async ({ page }) => {
    await page.goto('/');
    const top = await topOf(page, '#go');
    await jumpTo(page, top + 40);
    await page.mouse.move(700, 450);
    await page.mouse.wheel(0, 100);
    await page.waitForTimeout(IDLE + 500);
    expect(await scrollY(page)).toBe(top + 140);
  });

  test('inside a zone taller than the screen, nothing moves the page', async ({ page }) => {
    test.setTimeout(30000);
    await page.goto('/');
    await jumpTo(page, await topOf(page, '#parkdex'));
    await page.locator('.pk-plant').click();
    await expect(page.locator('#parkdex')).toHaveAttribute('data-landed', '', { timeout: 12000 });
    const start = await scrollY(page);
    await page.mouse.move(700, 100);
    await page.mouse.wheel(0, 340);
    await expect.poll(() => scrollY(page)).toBe(start + 340);
    await page.waitForTimeout(IDLE + 500);
    expect(await scrollY(page)).toBe(start + 340);
  });

  test('a link used while the page is settling wins', async ({ page }) => {
    await page.goto('/');
    await page.mouse.move(700, 450);
    await page.mouse.wheel(0, 620);
    await expect.poll(() => scrollY(page)).toBe(620);
    await glideUnderway(page, 620);
    await page.locator('.chrome__name').click();
    await settlesAt(page, 0);
    await page.waitForTimeout(IDLE + 300);
    expect(await scrollY(page)).toBe(0);
  });

  test('a key that moved nothing does not settle the next scroll', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Home');
    await page.waitForTimeout(500);
    const top = (await topOf(page, '#offbooked')) + 200;
    await jumpTo(page, top);
    await page.waitForTimeout(IDLE + 300);
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
    await page.waitForTimeout(IDLE + 300);
    expect(await scrollY(page)).toBe(landed);
  });

  test('tabbing into a screen lines the whole screen up', async ({ page }) => {
    await page.goto('/');
    await page.locator('.abn-key').focus();
    await page.keyboard.press('Tab');
    await expect(page.locator('.rope')).toBeFocused();
    await settlesAt(page, await topOf(page, '#offbooked'));
  });

  test('pressing a control part way up the screen brings its scene into view', async ({ page }) => {
    await page.goto('/');
    const top = await topOf(page, '#offbooked');
    await jumpTo(page, top - 120);
    await page.locator('.rope').click();
    await settlesAt(page, top);
  });
});

test.describe('on touch', () => {
  test.skip(({ isMobile }) => !isMobile, 'Touch is a phone journey.');
  test.skip(({ browserName }) => browserName !== 'chromium', 'Real touch input needs Chromium.');

  const finger = async (page: Page) => {
    const client = await page.context().newCDPSession(page);
    return (type: 'touchStart' | 'touchMove' | 'touchEnd', y: number) =>
      client.send('Input.dispatchTouchEvent', {
        type,
        touchPoints: type === 'touchEnd' ? [] : [{ x: 200, y }],
      });
  };

  const swipe = async (
    touch: Awaited<ReturnType<typeof finger>>,
    from: number,
    by: number,
    steps = 5,
  ) => {
    await touch('touchStart', from);
    for (let step = 1; step <= steps; step += 1) {
      await touch('touchMove', from - (step * by) / steps);
    }
    await touch('touchEnd', from - by);
  };

  test('a small swipe stays put for a moment, then eases to the nearest screen', async ({
    page,
  }) => {
    await page.goto('/');
    const touch = await finger(page);
    await swipe(touch, 600, 160);
    await expect.poll(() => scrollY(page)).toBeGreaterThan(60);
    const left = await scrollY(page);
    await page.waitForTimeout(IDLE - 500);
    expect(Math.abs((await scrollY(page)) - left)).toBeLessThan(2);
    await settlesAt(page, 0);
  });

  test('a finger held on the page holds off the settle', async ({ page }) => {
    await page.goto('/');
    const touch = await finger(page);
    await touch('touchStart', 600);
    for (let step = 1; step <= 5; step += 1) await touch('touchMove', 600 - step * 40);
    await expect.poll(() => scrollY(page)).toBeGreaterThan(60);
    const held = await scrollY(page);
    await page.waitForTimeout(IDLE + 600);
    expect(await scrollY(page)).toBe(held);
    await touch('touchEnd', 400);
    await settlesAt(page, 0);
  });

  test('a touch stops a settle at once', async ({ page }) => {
    await page.goto('/');
    const touch = await finger(page);
    await swipe(touch, 600, 200);
    await expect.poll(() => scrollY(page)).toBeGreaterThan(60);
    const left = await scrollY(page);
    await glideUnderway(page, left);
    await touch('touchStart', 600);
    const held = await scrollY(page);
    await page.waitForTimeout(500);
    expect(await scrollY(page)).toBe(held);
    await touch('touchEnd', 600);
  });

  test('a run of swipes goes past closed screens without being caught', async ({ page }) => {
    test.setTimeout(30000);
    await page.goto('/');
    const touch = await finger(page);
    const target = await topOf(page, '#parkdex');
    for (let turn = 0; turn < 12 && (await scrollY(page)) < target; turn += 1) {
      await swipe(touch, 760, 640, 6);
      await page.waitForTimeout(60);
    }
    expect(await scrollY(page)).toBeGreaterThanOrEqual(target);
    await expect(page.locator('[data-waiting]')).toHaveCount(4);
  });
});

const heroCount = 8;

test('the toggle swaps the hero, and the choice can be linked to', async ({ page }) => {
  test.setTimeout(60000);
  await page.goto('/');
  const toggle = page.locator('[data-hero-toggle]');
  await expect(toggle).toBeVisible();
  const buttons = toggle.locator('button');
  await expect(buttons).toHaveCount(heroCount);
  await expect(buttons.nth(0)).toHaveAttribute('aria-pressed', 'true');
  const seen = new Set<string>();
  // The default is showing, so it comes last.
  for (const option of [2, 3, 4, 5, 6, 7, 8, 1]) {
    await buttons.nth(option - 1).click();
    await expect(page).toHaveURL(new RegExp(`\\?hero=${option}$`));
    await expect(buttons.nth(option - 1)).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('h1')).toHaveCount(1);
    seen.add((await page.locator('[data-hero-slot]').getAttribute('data-hero-shown')) ?? '');
  }
  expect(seen.size).toBe(heroCount);

  await page.goto('/?hero=2');
  await expect(page.locator('[data-badge]')).toBeVisible();
  await expect(buttons.nth(1)).toHaveAttribute('aria-pressed', 'true');
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
        await expect(page.locator('[data-hero-toggle]')).toBeInViewport({ ratio: 1 });
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
        // No line of type runs off the side of the screen, or off the bottom of it.
        const clipped = await page.locator('[data-hero-slot]').evaluate((slot) =>
          [...slot.querySelectorAll<HTMLElement>('*')]
            .filter(
              (element) =>
                !element.closest('.sr-only') &&
                [...element.childNodes].some((node) => node.nodeType === Node.TEXT_NODE),
            )
            .filter((element) => {
              const { left, right, bottom } = element.getBoundingClientRect();
              return (
                element.textContent?.trim() &&
                (left < -1 || right > window.innerWidth + 1 || bottom > window.innerHeight + 1)
              );
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
  test.setTimeout(75000);
  await page.goto('/?hero=2');
  const badge = page.locator('[data-badge]');
  const angle = () =>
    badge.evaluate((element) => Number(/rotate\((.+)deg\)/.exec(element.style.transform)?.[1]));
  await expect.poll(() => angle().then(Math.abs), { timeout: 30000 }).toBeLessThan(1);
  const box = await page.locator('.badge__name').boundingBox();
  if (!box) throw new Error('No badge name');
  await page.mouse.move(box.x + 40, box.y + 10);
  await page.mouse.down();
  await page.mouse.move(box.x + 240, box.y + 10, { steps: 6 });
  expect(Math.abs(await angle())).toBeGreaterThan(5);
  await page.mouse.up();
  await expect.poll(() => angle().then(Math.abs), { timeout: 30000 }).toBeLessThan(1);
});

test('the board flaps to its final words', async ({ page }) => {
  await page.goto('/?hero=3');
  const flaps = page.locator('.board__line--name .flap');
  const name = () => flaps.evaluateAll((cells) => cells.map((c) => c.textContent).join(''));
  await expect.poll(name, { timeout: 4000 }).toBe('NATHANPANNELL');
});

test('the elevator counts down the floors, then the page goes', async ({ page }) => {
  await page.goto('/?hero=4');
  const floor = page.locator('[data-lift-floor]');
  await expect(floor).toHaveText('G');
  await page.locator('[data-floor="B3"]').click();
  await expect(page.locator('[data-floor="B3"]')).toHaveAttribute('data-pressed', '');
  await expect(floor).toHaveText('B3');
  await expect(page).toHaveURL(/#parkdex$/);
});

test('a card flips over, then the page goes', async ({ page, isMobile }) => {
  await page.goto('/?hero=5');
  const card = page.locator('.card').nth(1);
  await card.locator('a').click();
  if (!isMobile) await expect(card).toHaveAttribute('data-opening', '');
  await expect(page).toHaveURL(/#offbooked$/);
});

test('the channels change by themselves, and the dial takes over', async ({ page, isMobile }) => {
  await page.goto('/?hero=8');
  const shown = page.locator('[data-picture][data-on]');
  await expect(shown).toHaveCount(1);
  const pictures = page.locator('[data-picture]');
  await expect(pictures.nth(0)).toHaveAttribute('data-on', '');
  await expect(pictures.nth(1)).toHaveAttribute('data-on', '', { timeout: 6000 });
  if (isMobile) return;
  await page.locator('[data-channel]').nth(3).hover();
  await expect(pictures.nth(3)).toHaveAttribute('data-on', '');
  await page.waitForTimeout(4600);
  await expect(pictures.nth(3)).toHaveAttribute('data-on', '');
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
  await page.goto('/?hero=8');
  const pictures = page.locator('[data-picture]');
  await expect(pictures.nth(1)).toHaveAttribute('data-on', '', { timeout: 6000 });
  await page.locator('[data-hero-pick="channels"]').click();
  await expect(pictures.nth(2)).toHaveAttribute('data-on', '', { timeout: 6000 });
});

test('a door swings open before the page moves on', async ({ page, isMobile }) => {
  await page.goto('/');
  const door = page.locator('.door').nth(2);
  await door.locator('a').click();
  if (!isMobile) await expect(door).toHaveAttribute('data-opening', '');
  await expect(page).toHaveURL(/#parkdex$/);
  await expect(door).not.toHaveAttribute('data-opening', '');
});
