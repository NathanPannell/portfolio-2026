import { expect, test } from '@playwright/test';

for (const [label, id] of [
  ['AI Build Night', 'ai-build-night'],
  ['Offbooked', 'offbooked'],
  ['Parkdex', 'parkdex'],
  ['Play by the Sandbox', 'play-by-the-sandbox'],
] as const) {
  test(`the ${label} door jumps to its world`, async ({ page }) => {
    await page.goto('/');
    await page.locator('.door a', { hasText: label }).click();
    await expect(page).toHaveURL(new RegExp(`#${id}$`));
    await expect
      .poll(() => page.locator(`#${id}`).evaluate((e) => Math.abs(e.getBoundingClientRect().top)), {
        timeout: 10000,
      })
      .toBeLessThan(120);
  });
}

for (const id of ['offbooked', 'parkdex', 'play-by-the-sandbox']) {
  test(`arriving at #${id} lands on that world`, async ({ page }) => {
    await page.goto(`/#${id}`);
    await expect
      .poll(() => page.locator(`#${id}`).evaluate((e) => Math.abs(e.getBoundingClientRect().top)), {
        timeout: 10000,
      })
      .toBeLessThan(120);
  });
}

test('the header is the name, and nothing else', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.chrome')).toHaveText('Nathan Pannell');
  await expect(page.locator('[data-for], [data-audience]')).toHaveCount(0);
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

test('a closed scene keeps its links out of the tab order until it opens', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'Keyboard navigation is a desktop journey.');
  await page.goto('/');
  await page.locator('.rope').focus();
  await page.keyboard.press('Tab');
  await expect(page.locator('.pk-plant')).toBeFocused();
  await expect(page.locator('#offbooked')).toHaveAttribute('data-waiting', '');

  await page.locator('.rope').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#offbooked')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('.ticket')).toBeFocused();
});

test('reverse tabbing goes back up into the hero', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Keyboard navigation is a desktop journey.');
  await page.goto('/');
  await page.locator('.abn-key').focus();
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('[data-hero-toggle] button').last()).toBeFocused();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(5);
});

test('Plant! can be reached with the keyboard', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Keyboard navigation is a desktop journey.');
  await page.goto('/');
  await page.locator('.rope').focus();
  await page.keyboard.press('Tab');
  const plant = page.locator('.pk-plant');
  await expect(plant).toBeFocused();
  await expect(plant).toBeInViewport();
  await page.keyboard.press('Enter');
  await expect(page.locator('.pk-mark')).toHaveCount(1);
});

test('a scroll past a focused control is not pulled back', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Keyboard navigation is a desktop journey.');
  await page.goto('/');
  await page.locator('.abn-key').focus();
  await page.keyboard.press('End');
  await expect(page.locator('.contact__mail')).toBeInViewport({ timeout: 5000 });
  // Longer than a scroll has to be left alone before anything could move it.
  await page.waitForTimeout(2200);
  await expect(page.locator('.contact__mail')).toBeInViewport();
});

test('the keyboard can take Kip all the way down', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Keyboard navigation is a desktop journey.');
  test.setTimeout(30000);
  await page.goto('/');
  await page.locator('.pk-plant').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#parkdex')).toHaveAttribute('data-landed', '', { timeout: 12000 });
  await page.keyboard.press('Tab');
  await expect(page.locator('.pk-slide')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#parkdex')).toHaveAttribute('data-jumped', '', { timeout: 8000 });
  await page.keyboard.press('Tab');
  const link = page.locator('.pk-end a').first();
  await expect(link).toBeFocused();
  await expect(link).toBeInViewport();
});
