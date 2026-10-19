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
    // `preload="metadata"` video stops downloading once it has the headers. The crawl in
    // links.spec.ts still checks that every video URL returns 200.
    if (request.resourceType() === 'media' && failure === 'net::ERR_ABORTED') return;
    errors.push(`requestfailed: ${request.url()} ${failure}`);
  });
  page.on('response', (response) => {
    if (response.status() >= 400) errors.push(`HTTP ${response.status()}: ${response.url()}`);
  });
  return errors;
}

for (const route of sitemapRoutes()) {
  test(`${route} renders without errors`, async ({ page }) => {
    const errors = collectErrors(page);
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(/Nathan Pannell/);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('main#main-content')).toBeVisible();
    await expect(page.locator('.site-header__name')).toHaveAttribute('href', '/');
    // Step through the page so every lazy image and video loads and is checked too.
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight / 2) {
        window.scrollTo(0, y);
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    });
    const pending = page.locator('img[loading="lazy"]');
    for (const image of await pending.all()) {
      if (!(await image.isVisible())) continue;
      await expect
        .poll(() => image.evaluate((element) => (element as HTMLImageElement).complete))
        .toBe(true);
    }
    await page.waitForLoadState('networkidle');
    expect(errors).toEqual([]);
  });
}

test('homepage shows every section', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#hero-title')).toBeVisible();
  for (const id of ['parkdex-title', 'projects-title', 'writing-title']) {
    const heading = page.locator(`#${id}`);
    await heading.scrollIntoViewIfNeeded();
    await expect(heading).toBeVisible();
  }
  await expect(page.locator('[data-polaroid]')).toHaveCount(3);
  await expect(page.locator('[data-essay-item]')).toHaveCount(3);
});

test('unknown routes serve the 404 page', async ({ page }) => {
  const response = await page.goto('/this-route-does-not-exist/');
  expect(response?.status()).toBe(404);
  await expect(page.locator('h1')).toHaveText('Lost the trail.');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
});
