import { expect, test } from '@playwright/test';

test('a project card opens its page and the header returns home', async ({ page }) => {
  await page.goto('/');
  const card = page.locator('[data-polaroid]').first();
  const href = (await card.getAttribute('href')) ?? '';
  expect(href).toMatch(/^\/[\w-]+\/$/);
  const title = (await card.locator('strong').textContent())?.trim() ?? '';

  await card.scrollIntoViewIfNeeded();
  await card.click();
  await expect(page).toHaveURL(href);
  await expect(page.locator('h1')).toContainText(title);

  await page.locator('.site-header__name').click();
  await expect(page).toHaveURL('/');
  await expect(page.locator('#hero-title')).toBeVisible();
});

test('a writing entry opens its article', async ({ page }) => {
  await page.goto('/');
  const link = page.locator('[data-essay-item] a').first();
  const href = (await link.getAttribute('href')) ?? '';
  const title = (await link.locator('.essay-list__title').textContent())?.trim() ?? '';

  await link.scrollIntoViewIfNeeded();
  await link.click();
  await expect(page).toHaveURL(href);
  await expect(page.locator('h1')).toContainText(title);
});

test('the archived projects list opens and links to project pages', async ({ page }) => {
  await page.goto('/');
  const archive = page.locator('.project-deck-archive');
  await archive.locator('summary').scrollIntoViewIfNeeded();
  await archive.locator('summary').click();
  const item = archive.locator('.project-deck-archive__item').first();
  await expect(item).toBeVisible();
  const href = (await item.getAttribute('href')) ?? '';
  await item.click();
  await expect(page).toHaveURL(href);
  await expect(page.locator('h1')).toBeVisible();
});

test('the 404 page links back into the site', async ({ page }) => {
  await page.goto('/missing-page/');
  await page.locator('.not-found__actions a', { hasText: 'Parkdex' }).click();
  await expect(page).toHaveURL('/parkdex/');
  await expect(page.locator('h1')).toBeVisible();
});

test('the skip link moves keyboard focus past the header', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Keyboard navigation is a desktop journey.');
  await page.goto('/parkdex/');
  await page.keyboard.press('Tab');
  const skip = page.locator('a[href="#main-content"]');
  await expect(skip).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#main-content$/);
  // The next Tab lands inside the main content, not on the header links.
  await page.keyboard.press('Tab');
  await expect(page.locator('#main-content :focus')).toHaveCount(1);
});
