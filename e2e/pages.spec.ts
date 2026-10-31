import { expect, test, type Locator, type Page } from '@playwright/test';
import { sitemapRoutes } from './routes';

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  page.on('requestfailed', (request) => {
    const failure = request.failure()?.errorText ?? '';
    // A paused loop stops downloading once it leaves the screen. The crawl in links.spec.ts still
    // checks that every video URL returns 200.
    if (request.resourceType() === 'media' && failure === 'net::ERR_ABORTED') return;
    errors.push(`requestfailed: ${request.url()} ${failure}`);
  });
  page.on('response', (response) => {
    if (response.status() >= 400) errors.push(`HTTP ${response.status()}: ${response.url()}`);
  });
  return errors;
}

const walkThePage = (page: Page) =>
  page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight / 2) {
      window.scrollTo({ top: y, behavior: 'instant' });
      await new Promise((resolve) => setTimeout(resolve, 40));
    }
  });

// html and body clip sideways scrolling, which would hide any overflow from scrollWidth, so this
// lifts the clip first. Pinned stages clip their own artwork on purpose and keep doing so.
const horizontalOverflow = (page: Page) =>
  page.evaluate(() => {
    const style = document.createElement('style');
    style.textContent = 'html, body { overflow-x: visible !important; }';
    document.head.append(style);
    const overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
    style.remove();
    return overflow;
  });

// Text and links must sit fully on screen wherever they are not deliberately moving.
const clippedText = (page: Page) =>
  page.evaluate(() =>
    [
      ...document.querySelectorAll<HTMLElement>(
        'main h1, main h2, main h3, main h4, main p, main a',
      ),
    ]
      .filter(
        (element) =>
          !element.closest('[aria-hidden="true"], .pk-strip, .rules__stage, .tape, .marquee') &&
          element.getClientRects().length > 0,
      )
      .filter((element) => {
        const { left, right } = element.getBoundingClientRect();
        return left < -1 || right > document.documentElement.clientWidth + 1;
      })
      .map((element) => element.textContent?.trim().slice(0, 40)),
  );

const opacityOf = (locator: Locator) =>
  locator.evaluate((element) => {
    let opacity = 1;
    for (let node: Element | null = element; node; node = node.parentElement) {
      opacity *= Number(getComputedStyle(node).opacity);
    }
    return opacity;
  });

for (const route of sitemapRoutes()) {
  test(`${route} renders without errors`, async ({ page }) => {
    const errors = collectErrors(page);
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(/Nathan Pannell/);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('main#main-content')).toBeVisible();
    await expect(page.locator('.chrome__name')).toHaveAttribute('href', '#top');
    // Step through the page so every lazy image and video loads and is checked too.
    await walkThePage(page);
    const pending = page.locator('img');
    for (const image of await pending.all()) {
      await image.evaluate((element) => {
        (element as HTMLImageElement).loading = 'eager';
      });
      await expect
        .poll(() => image.evaluate((element) => (element as HTMLImageElement).complete))
        .toBe(true);
      const width = await image.evaluate((element) => (element as HTMLImageElement).naturalWidth);
      expect(width).toBeGreaterThan(0);
    }
    expect(errors).toEqual([]);
  });
}

test('every world has its heading and its links', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  for (const id of ['abn-title', 'sb-title', 'ob-title', 'pk-title', 'go-title']) {
    await expect(page.locator(`#${id}`)).toHaveCount(1);
  }
  const hrefs = await page
    .locator('a[href^="http"]')
    .evaluateAll((links) => links.map((link) => link.getAttribute('href') ?? ''));
  for (const url of [
    'https://aibuildnight.ca/',
    'https://www.playbythesandbox.ca/',
    'https://offbooked.com/',
    'https://parkdex.app/',
    'https://web.parkdex.app/',
    'https://play.google.com/store/apps/details?id=app.parkdex',
  ]) {
    expect(hrefs).toContain(url);
  }
  await expect(page.locator('a[href^="mailto:"]')).toHaveCount(1);
});

test('the crowd draws into the hero', async ({ page }) => {
  await page.goto('/');
  await expect
    .poll(() =>
      page.locator('[data-crowd]').evaluate((canvas) => {
        const element = canvas as HTMLCanvasElement;
        const context = element.getContext('2d');
        if (!context) return 0;
        const { data } = context.getImageData(0, 0, element.width, element.height);
        let lit = 0;
        for (let i = 3; i < data.length; i += 4) if ((data[i] ?? 0) > 0) lit += 1;
        return lit;
      }),
    )
    .toBeGreaterThan(1000);
});

test('scrolling opens the curtains on the Offbooked collage', async ({ page }) => {
  await page.goto('/');
  const drape = page.locator('.drape--left');
  const covered = () =>
    drape.evaluate((element) => element.getBoundingClientRect().width / window.innerWidth);
  const reveal = page.locator('.ob-reveal');
  await reveal.evaluate((element) => {
    window.scrollTo({
      top: element.getBoundingClientRect().top + window.scrollY,
      behavior: 'instant',
    });
  });
  await expect.poll(covered).toBeGreaterThan(0.45);
  await reveal.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    window.scrollTo({
      top: rect.top + window.scrollY + rect.height - window.innerHeight,
      behavior: 'instant',
    });
  });
  await expect.poll(covered).toBeLessThan(0.05);
  await expect(page.locator('.ticket')).toBeInViewport();
});

test('the hero block stops blinking once it starts to grow', async ({ page }) => {
  await page.goto('/');
  const block = page.locator('[data-block]');
  const blinking = () => block.evaluate((element) => element.getAnimations().length);
  await expect.poll(blinking).toBe(1);
  await page.locator('[data-hero]').evaluate((element) => {
    const { height } = element.getBoundingClientRect();
    window.scrollTo({ top: (height - window.innerHeight) * 0.9, behavior: 'instant' });
  });
  await expect.poll(blinking).toBe(0);
});

test('the Offbooked close button is clickable edge to edge', async ({ page }) => {
  await page.goto('/');
  const link = page.locator('.ob-run__close a');
  await link.scrollIntoViewIfNeeded();
  const misses = await link.evaluate((element) => {
    const box = element.getBoundingClientRect();
    // The pill has round ends, so sample along its straight edges and its middle.
    const inset = box.height / 2;
    const points = [
      [box.left + inset, box.top + 2],
      [box.right - inset, box.top + 2],
      [box.left + box.width / 2, box.top + box.height / 2],
      [box.left + inset, box.bottom - 2],
      [box.right - inset, box.bottom - 2],
    ] as const;
    return points.filter(([x, y]) => !element.contains(document.elementFromPoint(x, y))).length;
  });
  expect(misses).toBe(0);
});

test('the Parkdex level pans sideways, scores, and plants flags', async ({ page }) => {
  await page.goto('/');
  const track = page.locator('[data-level]');
  await track.evaluate((element) => {
    window.scrollTo({
      top: element.getBoundingClientRect().top + window.scrollY,
      behavior: 'instant',
    });
  });
  await expect(page.locator('#pk-title')).toBeInViewport();
  await page.locator('[data-plant]').click();
  await expect(page.locator('[data-score]')).toHaveText('6');
  await expect(page.locator('.pk-mark')).toHaveCount(1);
  await track.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    window.scrollTo({
      top: rect.top + window.scrollY + rect.height - window.innerHeight,
      behavior: 'instant',
    });
  });
  await expect(page.locator('.pk-end h3')).toBeInViewport();
  await expect(page.locator('[data-score]')).toHaveText('54');
  // The button steps aside so it can't sit on top of the links.
  await expect(page.locator('[data-plant]')).toBeHidden();
});

const settledToy = async (page: Page) => {
  const yard = page.locator('[data-yard]');
  await yard.scrollIntoViewIfNeeded();
  const toy = page.locator('[data-toy]').first();
  await expect
    .poll(async () => {
      const first = await toy.boundingBox();
      await page.waitForTimeout(150);
      const second = await toy.boundingBox();
      return first && second && Math.abs(first.y - second.y) < 0.5 && second.y > 0;
    })
    .toBe(true);
  const box = await toy.boundingBox();
  if (!box) throw new Error('The toy has no box');
  return { toy, box };
};

test('a toy can be picked up and thrown', async ({ page, isMobile }) => {
  test.skip(isMobile, 'The next test throws one by touch.');
  await page.goto('/');
  const { toy, box } = await settledToy(page);
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 160, startY - 120, { steps: 8 });
  const held = await toy.boundingBox();
  expect(held?.x ?? 0).toBeGreaterThan(box.x + 100);
  await page.mouse.move(startX + 260, startY - 200, { steps: 3 });
  await page.mouse.up();
  // It keeps travelling after it leaves the hand, then lands.
  await expect.poll(async () => (await toy.boundingBox())?.x ?? 0).toBeGreaterThan(box.x + 280);
  await expect.poll(async () => (await toy.boundingBox())?.y ?? 0).toBeGreaterThan(box.y - 12);
});

test('a finger can drag a toy, and swiping elsewhere still scrolls', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Touch is a phone journey.');
  await page.goto('/');
  const { toy, box } = await settledToy(page);
  const client = await page.context().newCDPSession(page);
  const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', x: number, y: number) =>
    client.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: type === 'touchEnd' ? [] : [{ x, y }],
    });
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  const before = await page.evaluate(() => window.scrollY);
  await touch('touchStart', x, y);
  await touch('touchMove', x + 40, y - 30);
  await touch('touchMove', x + 80, y - 60);
  const held = await toy.boundingBox();
  await touch('touchEnd', x + 80, y - 60);
  expect(held?.x ?? 0).toBeGreaterThan(box.x + 50);
  expect(await page.evaluate(() => window.scrollY)).toBe(before);

  const hero = 40;
  await touch('touchStart', 200, 500 + hero);
  for (let step = 1; step <= 6; step += 1) await touch('touchMove', 200, 500 + hero - step * 40);
  await touch('touchEnd', 200, 260);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before + 100);
});

test('hovering or focusing an index row fills it with its image', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Touch has its own test.');
  await page.goto('/');
  const row = page.locator('[data-wash]').first();
  const fill = () =>
    row.evaluate((element) => Number(getComputedStyle(element, '::before').opacity));
  await row.scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  await expect.poll(fill).toBe(0);
  await row.hover();
  await expect.poll(fill).toBe(1);
  await page.mouse.move(0, 0);
  await expect.poll(fill).toBe(0);
  await row.locator('a').focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await expect.poll(fill).toBe(1);
});

test('on touch, the row nearest the middle of the screen fills', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Desktop uses hover.');
  await page.goto('/');
  const rows = page.locator('[data-wash]');
  await rows.nth(1).evaluate((element) => {
    const rect = element.getBoundingClientRect();
    window.scrollTo({
      top: rect.top + window.scrollY - window.innerHeight / 2 + rect.height / 2,
      behavior: 'instant',
    });
  });
  await expect(rows.nth(1)).toHaveAttribute('data-active');
  await expect(page.locator('[data-wash][data-active]')).toHaveCount(1);
  const opacity = await rows
    .nth(1)
    .evaluate((element) => Number(getComputedStyle(element, '::before').opacity));
  expect(opacity).toBeGreaterThan(0);
});

test('no width scrolls sideways or cuts text off', async ({ page }) => {
  for (const width of [320, 390, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/');
    await walkThePage(page);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    expect(await horizontalOverflow(page), `${width}px`).toBeLessThanOrEqual(0);
    expect(await clippedText(page), `${width}px`).toEqual([]);
  }
});

test('the tenets fit on short laptop screens', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 650 });
  await page.goto('/');
  const note = page.locator('.abn-tenets__note');
  await expect
    .poll(() =>
      note.evaluate((element) => {
        const stage = element.parentElement as HTMLElement;
        return stage.scrollHeight - stage.clientHeight;
      }),
    )
    .toBeLessThanOrEqual(0);
});

test('a phone on its side keeps the room drawing and clear Parkdex links', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto('/');
  const plan = await page.locator('.abn-room__plan').evaluate((e) => e.clientWidth);
  expect(plan).toBeGreaterThan(200);
  await expect(page.locator('.pk-plant')).toBeHidden();
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('shows a still, complete page', async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto('/');
    expect(await page.locator('.hero__stage').evaluate((e) => getComputedStyle(e).position)).toBe(
      'relative',
    );
    await expect(page.locator('.drape')).toHaveCount(2);
    await expect(page.locator('.drape').first()).toBeHidden();
    await expect(page.locator('.pk-plant')).toBeHidden();
    // The side-scroller becomes a plain stack, and nothing is left waiting for a scroll position.
    expect(await page.locator('.pk-strip').evaluate((e) => getComputedStyle(e).display)).toBe(
      'grid',
    );
    await expect(page.locator('.pk-end h3')).toBeVisible();
    for (const step of await page.locator('.abn-room__copy li').all()) {
      expect(await opacityOf(step)).toBe(1);
    }
    const animations = await page.evaluate(() =>
      document
        .getAnimations()
        .filter(
          (animation) =>
            animation.playState === 'running' &&
            animation.effect?.getTiming().iterations === Infinity,
        )
        .map((animation) => (animation as CSSAnimation).animationName),
    );
    expect(animations).toEqual([]);
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 800 });
      expect(await horizontalOverflow(page), `${width}px`).toBeLessThanOrEqual(0);
      expect(await clippedText(page), `${width}px`).toEqual([]);
    }
    expect(errors).toEqual([]);
  });
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('every world and link is still there', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('.hero__fallback')).toBeVisible();
    await expect(page.locator('a[href="https://offbooked.com/"]').first()).toBeAttached();
    await page.locator('.wash-list').scrollIntoViewIfNeeded();
    await expect(page.locator('.wash-list li').first()).toBeVisible();
    for (const step of await page.locator('.abn-room__copy li').all()) {
      expect(await opacityOf(step)).toBe(1);
    }
    // Nothing is parked out of reach in a strip that only scripts can pan.
    for (const link of await page.locator('.pk-end a').all()) {
      const box = await link.boundingBox();
      expect((box?.x ?? 9999) + (box?.width ?? 0)).toBeLessThanOrEqual(
        page.viewportSize()?.width ?? 0,
      );
    }
    await expect(page.locator('.drape').first()).toBeHidden();
  });
});

test('unknown routes serve the 404 page', async ({ page }) => {
  const response = await page.goto('/this-route-does-not-exist/');
  expect(response?.status()).toBe(404);
  await expect(page.locator('h1')).toHaveText('Nobody here.');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
});
