import { expect, test } from '@playwright/test';

for (const [label, id] of [
  ['Builders', 'ai-build-night'],
  ['Creators', 'play-by-the-sandbox'],
  ['Casts', 'offbooked'],
  ['Rivals', 'parkdex'],
] as const) {
  test(`the ${label} chip jumps to its world`, async ({ page }) => {
    await page.goto('/');
    await page.locator('.hero__chips a', { hasText: label }).click();
    await expect(page).toHaveURL(new RegExp(`#${id}$`));
    await expect
      .poll(() => page.locator(`#${id}`).evaluate((e) => Math.abs(e.getBoundingClientRect().top)))
      .toBeLessThan(120);
  });
}

test('the audience label follows the scroll', async ({ page }) => {
  await page.goto('/');
  const label = page.locator('[data-for]');
  await expect(label).toHaveText('real people');
  await page.locator('#offbooked').evaluate((element) => {
    window.scrollTo({
      top: element.getBoundingClientRect().top + window.scrollY,
      behavior: 'instant',
    });
  });
  await expect(label).toHaveText('casts');
});

test('the name returns to the top', async ({ page }) => {
  await page.goto('/#go');
  await page.locator('.chrome__name').click();
  await expect(page).toHaveURL(/#top$/);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(10);
});

test('the 404 page links back into the site', async ({ page }) => {
  await page.goto('/missing-page/');
  await page.locator('.not-found a').click();
  await expect(page).toHaveURL('/');
  await expect(page.locator('h1')).toBeVisible();
});

test('the skip link moves keyboard focus past the header', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Keyboard navigation is a desktop journey.');
  await page.goto('/');
  await page.keyboard.press('Tab');
  const skip = page.locator('a[href="#main-content"]');
  await expect(skip).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#main-content$/);
  // The next Tab lands inside the main content, not on the header link.
  await page.keyboard.press('Tab');
  await expect(page.locator('#main-content :focus')).toHaveCount(1);
});

test('tabbing into the curtain lands on an open stage', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Keyboard navigation is a desktop journey.');
  await page.goto('/');
  await page.locator('.sb__cta').focus();
  await page.keyboard.press('Tab');
  const ticket = page.locator('.ticket');
  await expect(ticket).toBeFocused();
  await expect(ticket).toBeInViewport();
  const onTop = await ticket.evaluate((element) => {
    const { left, top, width, height } = element.getBoundingClientRect();
    return element.contains(document.elementFromPoint(left + width / 2, top + height / 2));
  });
  expect(onTop).toBe(true);
});

test('reverse tabbing into the hero shows its chips', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Keyboard navigation is a desktop journey.');
  await page.goto('/');
  await page.locator('.abn-site__cta').focus();
  await page.keyboard.press('Shift+Tab');
  const chip = page.locator('.hero__chips a').last();
  await expect(chip).toBeFocused();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(5);
});

test('Plant! can be reached with the keyboard', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Keyboard navigation is a desktop journey.');
  await page.goto('/');
  await page.locator('.ob-run__close a').focus();
  await page.keyboard.press('Tab');
  const plant = page.locator('[data-plant]');
  await expect(plant).toBeFocused();
  await expect(plant).toBeInViewport();
  await page.keyboard.press('Enter');
  await expect(page.locator('.pk-mark')).toHaveCount(1);
});

test('tabbing to a Parkdex link brings it on screen', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Keyboard navigation is a desktop journey.');
  await page.goto('/');
  const link = page.locator('.pk-end a').first();
  await link.focus();
  await expect(link).toBeInViewport();
});
