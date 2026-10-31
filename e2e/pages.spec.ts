import { expect, test, type Page } from '@playwright/test';
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

const horizontalOverflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

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
  const open = () =>
    page
      .locator('.ob-reveal')
      .evaluate((element) => Number(getComputedStyle(element).getPropertyValue('--p')));
  await page.locator('.ob-reveal').evaluate((element) => {
    window.scrollTo({
      top: element.getBoundingClientRect().top + window.scrollY,
      behavior: 'instant',
    });
  });
  await expect.poll(open).toBeLessThan(0.05);
  await page.locator('.ob-reveal').evaluate((element) => {
    const top = element.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({
      top: top + element.getBoundingClientRect().height - window.innerHeight,
      behavior: 'instant',
    });
  });
  await expect.poll(open).toBeGreaterThan(0.95);
  await expect(page.locator('.ticket')).toBeInViewport();
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

test('a toy can be picked up and thrown', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Playwright mouse dragging is a desktop journey.');
  await page.goto('/');
  const yard = page.locator('[data-yard]');
  await yard.scrollIntoViewIfNeeded();
  const toy = page.locator('[data-toy]').first();
  await expect
    .poll(async () => {
      const box = await toy.boundingBox();
      const yardBox = await yard.boundingBox();
      return box && yardBox ? box.y - yardBox.y : 0;
    })
    .toBeGreaterThan(100);
  const box = await toy.boundingBox();
  if (!box) throw new Error('The toy has no box');
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 160, startY - 120, { steps: 8 });
  const held = await toy.boundingBox();
  expect(held?.x ?? 0).toBeGreaterThan(box.x + 100);
  await page.mouse.up();
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

test('no width scrolls sideways', async ({ page }) => {
  for (const width of [320, 390, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/');
    await walkThePage(page);
    expect(await horizontalOverflow(page), `${width}px`).toBeLessThanOrEqual(0);
  }
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
    await expect(page.locator('.abn-room__copy li').first()).toBeVisible();
    await expect(page.locator('.abn-room__copy li').last()).toBeVisible();
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
  });
});

test('unknown routes serve the 404 page', async ({ page }) => {
  const response = await page.goto('/this-route-does-not-exist/');
  expect(response?.status()).toBe(404);
  await expect(page.locator('h1')).toHaveText('Nobody here.');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
});
