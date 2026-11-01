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
          !element.closest('[aria-hidden="true"], [inert]') && element.getClientRects().length > 0,
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
  for (const id of ['abn-title', 'ob-title', 'pk-title', 'sb-title', 'go-title']) {
    await expect(page.locator(`#${id}`)).toHaveCount(1);
  }
  const hrefs = await page
    .locator('a[href^="http"]')
    .evaluateAll((links) => links.map((link) => link.getAttribute('href') ?? ''));
  for (const url of [
    'https://aibuildnight.ca/',
    'https://aibuildnight.ca/pages/past-nights',
    'https://www.playbythesandbox.ca/',
    'https://offbooked.com/',
    'https://parkdex.app/',
    'https://play.google.com/store/apps/details?id=app.parkdex',
  ]) {
    expect(hrefs).toContain(url);
  }
  expect(hrefs).not.toContain('https://web.parkdex.app/');
  await expect(page.locator('a[href^="mailto:"]')).toHaveCount(1);
});

const jumpTo = (page: Page, selector: string) =>
  page.locator(selector).evaluate((element) => {
    const top = element.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top, behavior: 'instant' });
  });

// Points across a link, kept off its corners and the ticket's notches.
const uncoveredPoints = (locator: Locator) =>
  locator.evaluate((element) => {
    const { left, top, width, height } = element.getBoundingClientRect();
    const points = [0.2, 0.5, 0.8].flatMap((x) =>
      [0.25, 0.5, 0.75].map((y) => [left + width * x, top + height * y] as const),
    );
    return points.filter(([x, y]) => element.contains(document.elementFromPoint(x, y))).length;
  });

const moments = [
  { name: 'AI Build Night', scene: '.abn-cover', control: '.abn-key', inside: '.abn-show__cta' },
  { name: 'Offbooked', scene: '#offbooked', control: '.rope', inside: '.ticket' },
  { name: 'Parkdex', scene: '#parkdex', control: '.pk-plant', inside: '[data-stop] h3' },
  { name: 'Play by the Sandbox', scene: '.sb-open', control: '.sb-box__open', inside: '.sb__cta' },
] as const;

const useControl = async (page: Page, scene: string, control: string) => {
  await jumpTo(page, scene);
  await expect(page.locator(control)).toBeVisible();
  await page.locator(control).click();
  await expect(page.locator(scene)).toHaveAttribute('data-open', '');
};

const landKip = async (page: Page) => {
  await useControl(page, '#parkdex', '.pk-plant');
  await expect(page.locator('#parkdex')).toHaveAttribute('data-landed', '', { timeout: 12000 });
};

for (const { name, scene, control, inside } of moments) {
  test(`${name} waits to be opened, and opens by hand`, async ({ page }) => {
    await page.goto('/');
    await jumpTo(page, scene);
    await expect(page.locator(scene)).toHaveAttribute('data-waiting', '');
    await expect(page.locator(control)).toHaveAttribute('aria-expanded', 'false');
    await page.locator(control).click();
    await expect(page.locator(scene)).toHaveAttribute('data-open', '');
    await expect(page.locator(scene)).not.toHaveAttribute('data-waiting', '');
    await expect(page.locator(control)).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator(inside).first()).toBeInViewport({ timeout: 8000 });
    await expect(page.locator(control)).toBeHidden({ timeout: 4000 });
  });

  test(`${name} opens by keyboard`, async ({ page, isMobile }) => {
    test.skip(isMobile, 'Keyboard navigation is a desktop journey.');
    await page.goto('/');
    await jumpTo(page, scene);
    await page.locator(control).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator(scene)).toHaveAttribute('data-open', '');
    await expect(page.locator(scene)).toBeFocused();
  });

  test(`${name} is one full screen until it is opened`, async ({ page }) => {
    await page.goto('/');
    const fills = await page.locator(scene).evaluate((element) => {
      const hero = document.querySelector<HTMLElement>('.hero')?.offsetHeight;
      return element.getBoundingClientRect().height === hero;
    });
    expect(fills).toBe(true);
  });
}

test('nothing but the visitor opens a scene', async ({ page }) => {
  test.setTimeout(30000);
  await page.goto('/');
  for (const { scene } of moments) await jumpTo(page, scene);
  await jumpTo(page, '#offbooked');
  await page.waitForTimeout(6500);
  await page.evaluate(() => window.scrollTo({ top: 99999, behavior: 'instant' }));
  await page.waitForTimeout(300);
  for (const { scene } of moments) {
    await expect(page.locator(scene)).toHaveAttribute('data-waiting', '');
  }
  await page.reload();
  await expect(page.locator('[data-waiting]')).toHaveCount(4);
});

test('the keyboard goes from one closed scene to the next', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Keyboard navigation is a desktop journey.');
  await page.goto('/');
  await page.locator('.abn-key').focus();
  for (const control of ['.rope', '.pk-plant', '.sb-box__open']) {
    await page.keyboard.press('Tab');
    await expect(page.locator(control)).toBeFocused();
  }
  await expect(page.locator('[data-waiting]')).toHaveCount(4);
});

test('clicking a closed scene away from its control leaves it closed', async ({ page }) => {
  await page.goto('/');
  await jumpTo(page, '#offbooked');
  await page.mouse.click(120, 200);
  await page.waitForTimeout(200);
  await expect(page.locator('#offbooked')).toHaveAttribute('data-waiting', '');
});

test('pulling the rope far enough opens the curtains before it is let go', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'The drag uses the mouse; touch shares its pointer events.');
  await page.goto('/');
  await jumpTo(page, '#offbooked');
  const scene = page.locator('#offbooked');
  const tassel = await page.locator('.rope__tassel').boundingBox();
  if (!tassel) throw new Error('The rope has no tassel');
  const x = tassel.x + tassel.width / 2;
  const y = tassel.y + tassel.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + 20, { steps: 4 });
  await expect(page.locator('.rope')).toHaveCSS('--pull', '20px');
  await expect(scene).toHaveAttribute('data-waiting', '');
  await page.mouse.move(x, y + 90, { steps: 6 });
  await expect(scene).toHaveAttribute('data-open', '');
  await page.mouse.up();
});

test('the curtains open, then the ad lands piece by piece on a clock', async ({ page }) => {
  await page.goto('/');
  await jumpTo(page, '#offbooked');
  const drape = page.locator('.drape--left');
  const covered = () =>
    drape.evaluate((element) => element.getBoundingClientRect().width / window.innerWidth);
  await expect.poll(covered).toBeGreaterThan(0.45);
  await expect(page.locator('.ticket')).toHaveCSS('opacity', '0');
  const scrollY = await page.evaluate(() => window.scrollY);
  await page.locator('.rope').click();
  await expect.poll(covered).toBeLessThan(0.05);
  await expect(page.locator('.ticket')).toHaveCSS('opacity', '1', { timeout: 12000 });
  await expect(page.locator('.ticket')).toBeInViewport();
  // Nothing about this needed the page to move.
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollY);
});

test('the opened Offbooked screen keeps only the title, the waveform and one phone', async ({
  page,
}) => {
  await page.goto('/');
  await useControl(page, '#offbooked', '.rope');
  await expect(page.locator('.ticket')).toHaveCSS('opacity', '1', { timeout: 12000 });
  await expect(page.locator('.handset')).toHaveCount(1);
  await expect(page.locator('.handset img')).toHaveCount(1);
  await expect(page.locator('.handset')).toBeInViewport({ ratio: 0.98 });
  await expect(page.locator('.voices')).toBeInViewport();
  await expect
    .poll(() => page.locator('.beam--left').evaluate((e) => Number(getComputedStyle(e).opacity)))
    .toBeGreaterThan(0.5);
  await expect(page.locator('.stamp, .marquee, .script, .slab, .tape, .bubble')).toHaveCount(0);
});

test('the Offbooked ad does not follow the pointer', async ({ page, isMobile }) => {
  test.skip(isMobile, 'There is no pointer to follow.');
  await page.goto('/');
  await useControl(page, '#offbooked', '.rope');
  const phone = page.locator('.handset');
  await expect(page.locator('.ticket')).toHaveCSS('opacity', '1', { timeout: 12000 });
  await page.mouse.move(100, 100);
  await page.waitForTimeout(100);
  const before = await phone.boundingBox();
  await page.mouse.move(1200, 700, { steps: 4 });
  await page.waitForTimeout(100);
  expect(await phone.boundingBox()).toEqual(before);
});

test('the Offbooked loops rest off screen', async ({ page }) => {
  await page.goto('/');
  await useControl(page, '#offbooked', '.rope');
  const voices = page.locator('.voices');
  const running = () =>
    voices.evaluate((element) =>
      element
        .getAnimations({ subtree: true })
        .some((animation) => animation.playState === 'running'),
    );
  await expect.poll(running).toBe(true);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await expect(page.locator('#offbooked')).toHaveAttribute('data-resting', '');
  await expect.poll(running).toBe(false);
});

test('the ticket carries the details of the show', async ({ page }) => {
  await page.goto('/');
  const ticket = page.locator('.ticket');
  await expect(ticket).toHaveAttribute('href', 'https://offbooked.com/');
  for (const detail of [
    'Admit the whole cast',
    'Free in public beta. Cast never pay.',
    'One link. No account needed.',
    'Any phone, tablet or laptop.',
    'Casts in British Columbia and Nova Scotia.',
    'Places, everyone.',
    'offbooked.com',
  ]) {
    await expect(ticket).toContainText(detail);
  }
});

test('the Offbooked ticket can be clicked once it lands', async ({ page }) => {
  await page.goto('/');
  await useControl(page, '#offbooked', '.rope');
  const ticket = page.locator('.ticket');
  await expect(ticket).toHaveCSS('opacity', '1', { timeout: 12000 });
  await expect.poll(() => uncoveredPoints(ticket)).toBe(9);
});

const everySize = [
  [320, 640],
  [390, 844],
  [568, 320],
  [667, 375],
  [760, 760],
  [844, 390],
  [860, 860],
  [1024, 768],
  [1440, 900],
  [1920, 1080],
] as const;

test('the finished ad keeps its headline and ticket clear at every size', async ({ page }) => {
  test.setTimeout(120000);
  for (const [width, height] of everySize) {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    await useControl(page, '#offbooked', '.rope');
    const title = page.locator('#ob-title');
    await expect(page.locator('.ticket')).toHaveCSS('opacity', '1', { timeout: 12000 });
    const edges = await title.evaluate((element) => {
      const { left, right, top, bottom } = element.getBoundingClientRect();
      return { left, top, right: window.innerWidth - right, bottom: window.innerHeight - bottom };
    });
    for (const [edge, gap] of Object.entries(edges)) {
      expect(gap, `${edge} at ${width}x${height}`).toBeGreaterThanOrEqual(-1);
    }
    await expect
      .poll(() =>
        title.evaluate((element) => {
          const { left, top, width: wide, height: tall } = element.getBoundingClientRect();
          const hit = document.elementFromPoint(left + wide * 0.3, top + tall * 0.5);
          return element.contains(hit);
        }),
      )
      .toBe(true);
    await expect.poll(() => uncoveredPoints(page.locator('.ticket'))).toBe(9);
    await expect(page.locator('.ticket')).toBeInViewport({ ratio: 1 });
    // The one phone stays clear of the words on both sides of it.
    const phone = await page.locator('.handset').boundingBox();
    const stub = await page.locator('.ticket').boundingBox();
    const words = await title.locator('> *').last().boundingBox();
    const beside = (phone?.x ?? 0) >= (stub?.x ?? 0) + (stub?.width ?? 0) - 1;
    if (!beside) {
      expect(phone?.y ?? 0, `${width}x${height}`).toBeGreaterThanOrEqual(
        (words?.y ?? 0) + (words?.height ?? 0) - 12,
      );
      expect((phone?.y ?? 0) + (phone?.height ?? 0), `${width}x${height}`).toBeLessThanOrEqual(
        (stub?.y ?? 0) + 12,
      );
    }
    // Sampling a point isn't enough: the ticket has to sit wholly below the headline's last line.
    const lastLine = await title.locator('> *').last().boundingBox();
    const ticket = await page.locator('.ticket').boundingBox();
    expect(ticket?.y ?? 0, `${width}x${height}`).toBeGreaterThanOrEqual(
      (lastLine?.y ?? 9999) + (lastLine?.height ?? 0) - 1,
    );
    expect(await horizontalOverflow(page), `${width}x${height}`).toBeLessThanOrEqual(0);
  }
});

test('the live site is the biggest thing in the AI Build Night frame', async ({
  page,
  isMobile,
}) => {
  await page.goto('/');
  const shown = page.locator('.abn-browser__view');
  await useControl(page, '.abn-cover', '.abn-key');
  await expect(shown).toBeInViewport({ ratio: 1, timeout: 4000 });
  const box = await shown.boundingBox();
  const width = page.viewportSize()?.width ?? 0;
  expect(box?.width ?? 0).toBeGreaterThan(width * (isMobile ? 0.8 : 0.5));
  // All of the strip is loaded, ready for when it scrolls into the window.
  for (const image of await page.locator('.abn-strip img').all()) {
    await expect
      .poll(() => image.evaluate((element) => (element as HTMLImageElement).naturalWidth))
      .toBeGreaterThan(0);
  }
  // And it reads its way down the page by itself.
  const strip = page.locator('.abn-strip--desktop');
  const before = await strip.evaluate((element) => getComputedStyle(element).transform);
  await expect
    .poll(() => strip.evaluate((element) => getComputedStyle(element).transform), {
      timeout: 8000,
    })
    .not.toBe(before);
});

test('the live site opens out of the cursor', async ({ page }) => {
  await page.goto('/');
  await jumpTo(page, '.abn-cover');
  const cta = page.locator('.abn-show__cta');
  await expect.poll(() => uncoveredPoints(cta)).toBe(0);
  await page.locator('.abn-key').click();
  await expect.poll(() => uncoveredPoints(cta)).toBeGreaterThanOrEqual(8);
});

test('Enter opens onto one screen, with the north star lines in it', async ({ page }) => {
  await page.goto('/');
  await useControl(page, '.abn-cover', '.abn-key');
  await expect(page.locator('.abn-stars')).toContainText(
    'The next unicorn can come from Vancouver Island.',
  );
  await expect(page.locator('.abn-stars')).toContainText('We share what we learn.');
  await expect(page.locator('.abn-stars')).toBeInViewport({ ratio: 1, timeout: 4000 });
  await expect(page.locator('.abn-room, .abn-tenets, [data-room]')).toHaveCount(0);
});

const noWebAudio = "Playwright's WebKit build has no Web Audio.";

// Counts what the page asks Web Audio for, without needing to hear it.
const listenForThocc = (page: Page) =>
  page.addInitScript(() => {
    const heard = { contexts: 0, tones: 0, noises: 0 };
    Object.assign(window, { heard });
    const Real = window.AudioContext;
    window.AudioContext = class extends Real {
      constructor() {
        super();
        heard.contexts += 1;
      }

      override createOscillator() {
        heard.tones += 1;
        return super.createOscillator();
      }

      override createBufferSource() {
        heard.noises += 1;
        return super.createBufferSource();
      }
    };
  });

const heard = (page: Page) =>
  page.evaluate(
    () =>
      (window as unknown as { heard: { contexts: number; tones: number; noises: number } }).heard,
  );

test('the Enter key thoccs when pressed, and is silent until then', async ({
  page,
  isMobile,
  browserName,
}) => {
  test.skip(browserName === 'webkit', noWebAudio);
  await listenForThocc(page);
  const errors = collectErrors(page);
  await page.goto('/');
  await jumpTo(page, '.abn-cover');
  await page.waitForTimeout(300);
  expect(await heard(page)).toEqual({ contexts: 0, tones: 0, noises: 0 });
  // A tap on a phone, which is the path iOS needs: only the lift counts as a gesture for audio.
  if (isMobile) await page.locator('.abn-key').tap();
  else await page.locator('.abn-key').click();
  await expect.poll(() => heard(page).then(({ tones }) => tones)).toBe(2);
  expect((await heard(page)).contexts).toBe(1);
  expect(errors).toEqual([]);
});

test('the Enter key thoccs from the keyboard too', async ({ page, isMobile, browserName }) => {
  test.skip(browserName === 'webkit', noWebAudio);
  test.skip(isMobile, 'Keyboard navigation is a desktop journey.');
  await listenForThocc(page);
  await page.goto('/');
  await page.locator('.abn-key').focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => heard(page).then(({ tones }) => tones)).toBe(2);
});

test('a mouse press dragged off the key leaves the keyboard its thocc', async ({
  page,
  isMobile,
  browserName,
}) => {
  test.skip(browserName === 'webkit', noWebAudio);
  test.skip(isMobile, 'This is a mouse and keyboard journey.');
  await listenForThocc(page);
  await page.goto('/');
  await jumpTo(page, '.abn-cover');
  const key = await page.locator('.abn-key').boundingBox();
  if (!key) throw new Error('No key');
  await page.mouse.move(key.x + key.width / 2, key.y + key.height / 2);
  await page.mouse.down();
  await page.mouse.move(40, 40);
  await page.mouse.up();
  await expect(page.locator('.abn-cover')).toHaveAttribute('data-waiting', '');
  await expect.poll(() => heard(page).then(({ tones }) => tones)).toBe(2);
  await page.locator('.abn-key').focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => heard(page).then(({ tones }) => tones)).toBe(4);
});

test('each scene sounds when it is opened, and only then', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', noWebAudio);
  test.setTimeout(30000);
  await listenForThocc(page);
  const errors = collectErrors(page);
  await page.goto('/');
  await page.evaluate(() => window.scrollTo({ top: 99999, behavior: 'instant' }));
  await page.waitForTimeout(300);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  expect(await heard(page)).toEqual({ contexts: 0, tones: 0, noises: 0 });

  const louder = async (open: () => Promise<unknown>) => {
    const before = await heard(page);
    await open();
    await expect
      .poll(() => heard(page).then(({ tones, noises }) => tones + noises))
      .toBeGreaterThan(before.tones + before.noises);
  };
  await louder(() => useControl(page, '#offbooked', '.rope'));
  await louder(() => useControl(page, '#parkdex', '.pk-plant'));
  await expect(page.locator('#parkdex')).toHaveAttribute('data-landed', '', { timeout: 12000 });
  await louder(() => page.locator('.pk-slide').click());
  await expect(page.locator('#parkdex')).toHaveAttribute('data-jumped', '', { timeout: 8000 });
  await louder(() => useControl(page, '.sb-open', '.sb-box__open'));
  expect((await heard(page)).contexts).toBe(1);
  expect(errors).toEqual([]);
});

test('reaching the park by scrolling makes no sound of its own', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', noWebAudio);
  test.setTimeout(30000);
  await listenForThocc(page);
  await page.goto('/');
  await landKip(page);
  const before = await heard(page);
  await page.evaluate(() => window.scrollBy({ top: window.innerHeight, behavior: 'instant' }));
  await expect(page.locator('#parkdex')).toHaveAttribute('data-jumped', '', { timeout: 6000 });
  expect(await heard(page)).toEqual(before);
});

test('a page with no sound still opens', async ({ page }) => {
  await page.addInitScript(() => {
    window.AudioContext = class {
      constructor() {
        throw new Error('No audio here');
      }
    } as unknown as typeof AudioContext;
  });
  await page.goto('/');
  await useControl(page, '.abn-cover', '.abn-key');
  await useControl(page, '#offbooked', '.rope');
  await useControl(page, '#parkdex', '.pk-plant');
  await useControl(page, '.sb-open', '.sb-box__open');
});

test('Plant! sends Kip down the vine to the four stops', async ({ page }) => {
  await page.goto('/');
  await jumpTo(page, '#parkdex');
  await expect(page.locator('#pk-title')).toBeInViewport();
  await expect(page.locator('[data-stop]').first()).toBeHidden();
  await expect(page.locator('.pk-ground')).toBeHidden();
  const scrollY = await page.evaluate(() => window.scrollY);

  await page.locator('.pk-plant').click();
  await expect(page.locator('.pk-mark')).toHaveCount(1);

  // Kip follows the vine's curve on the way down, on a clock, while the page stays put.
  const spots = new Set<number>();
  const rider = page.locator('[data-rider]');
  await expect(page.locator('#parkdex')).toHaveAttribute('data-riding', '');
  const screenWidth = page.viewportSize()?.width ?? 0;
  for (let sample = 0; sample < 8; sample += 1) {
    const box = await rider.boundingBox();
    spots.add(Math.round(box?.x ?? 0));
    // On screen the whole way down.
    expect(box?.x ?? -999).toBeGreaterThanOrEqual(-8);
    expect((box?.x ?? 0) + (box?.width ?? 9999)).toBeLessThanOrEqual(screenWidth + 8);
    await page.waitForTimeout(180);
  }
  expect(spots.size).toBeGreaterThan(2);

  await expect(page.locator('#parkdex')).toHaveAttribute('data-landed', '', { timeout: 12000 });
  for (const stop of await page.locator('[data-stop] img').all()) {
    await expect(stop).toBeInViewport();
  }
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollY);
  // The owner cut these.
  await expect(page.locator('.pk-pole, .pk-score, [data-score], .pk-points')).toHaveCount(0);
});

const groundTop = (page: Page) =>
  page.locator('.pk-ground').evaluate((element) => {
    return Math.round(element.getBoundingClientRect().top + window.scrollY);
  });

test('the second button slides Kip down to the parks and off the end of the vine', async ({
  page,
}) => {
  test.setTimeout(30000);
  await page.goto('/');
  await landKip(page);
  const trip = page.locator('#parkdex');
  const diver = page.locator('[data-diver]');
  await expect(page.locator('.pk-end__kip')).toBeHidden();
  await page.locator('.pk-slide').click();
  await expect(trip).toHaveAttribute('data-diving', '');
  await expect(page.locator('.pk-slide')).toBeHidden();

  // The page comes along, and Kip stays on screen the whole way.
  const height = page.viewportSize()?.height ?? 0;
  for (let sample = 0; sample < 5; sample += 1) {
    await page.waitForTimeout(250);
    if (!(await diver.isVisible())) break;
    const box = await diver.boundingBox();
    expect(box?.y ?? 9999).toBeLessThan(height);
    // It starts just above the top of the screen, and then stays on it.
    if (sample > 0) expect(box?.y ?? -9999).toBeGreaterThan(-(box?.height ?? 0));
  }
  await expect(trip).toHaveAttribute('data-jumped', '', { timeout: 8000 });
  await expect(diver).toBeHidden();
  await expect(page.locator('.pk-end__kip')).toBeInViewport();
  await expect
    .poll(() => page.evaluate(() => Math.round(window.scrollY)))
    .toBe(await groundTop(page));
  const links = page.locator('.pk-end__links a');
  await expect(links).toHaveCount(2);
  await expect(page.locator('.pk-end h3')).toHaveText('1,000+ parks. Which one’s yours?');
});

test('pressing Plant! part way off the screen still leaves the second button', async ({ page }) => {
  test.setTimeout(30000);
  await page.goto('/');
  const height = await page.evaluate(() => window.innerHeight);
  await jumpTo(page, '#parkdex');
  await page.evaluate((by) => window.scrollBy({ top: by, behavior: 'instant' }), height * 0.3);
  await page.locator('.pk-plant').evaluate((button) => (button as HTMLElement).click());
  await expect(page.locator('#parkdex')).toHaveAttribute('data-landed', '', { timeout: 12000 });
  await expect(page.locator('.pk-slide')).toBeVisible();
  await expect(page.locator('#parkdex')).not.toHaveAttribute('data-jumped', '');
});

test('scrolling down to the parks by hand still gets the jump', async ({ page }) => {
  test.setTimeout(30000);
  await page.goto('/');
  await landKip(page);
  await page.evaluate(() => window.scrollBy({ top: window.innerHeight, behavior: 'instant' }));
  await expect(page.locator('#parkdex')).toHaveAttribute('data-jumped', '', { timeout: 6000 });
  await expect(page.locator('.pk-end__kip')).toBeInViewport();
  // There is no way on left to take.
  await expect(page.locator('.pk-slide')).toBeHidden();
});

for (const input of ['wheel', 'key', 'press'] as const) {
  test(`a ${input} during the slide lets the page go`, async ({ page, isMobile }) => {
    test.skip(isMobile, 'These stand in for any input here.');
    test.setTimeout(30000);
    await page.goto('/');
    await landKip(page);
    const start = await page.evaluate(() => window.scrollY);
    await page.locator('.pk-slide').click();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(start + 10);
    if (input === 'wheel') await page.mouse.wheel(0, -40);
    if (input === 'key') await page.keyboard.press('Shift');
    if (input === 'press') {
      await page.mouse.down();
      await page.mouse.up();
    }
    await page.waitForTimeout(120);
    const held = await page.evaluate(() => window.scrollY);
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => window.scrollY)).toBe(held);
    // Kip finishes the trip regardless.
    await expect(page.locator('#parkdex')).toHaveAttribute('data-jumped', '', { timeout: 8000 });
  });
}

// Watches, frame by frame from inside the page, how much of the screen the six bands cover at most.
const watchRainbow = (page: Page) =>
  page.evaluate(() => {
    const bands = [...document.querySelectorAll('.wipe__band')];
    const seen = { most: 0 };
    Object.assign(window, { rainbow: seen });
    const look = () => {
      const cover = bands.reduce((sum, band) => {
        const { left, right } = band.getBoundingClientRect();
        const width = Math.max(0, Math.min(window.innerWidth, right) - Math.max(0, left));
        return sum + width / window.innerWidth / bands.length;
      }, 0);
      seen.most = Math.max(seen.most, cover);
      window.requestAnimationFrame(look);
    };
    look();
  });

test('the toy box pours the rainbow across, then shows the page', async ({ page }) => {
  await page.goto('/');
  await jumpTo(page, '.sb-open');
  await expect(page.locator('.sb-box')).toBeVisible();
  await watchRainbow(page);
  await page.locator('.sb-box__open').click();
  await expect(page.locator('.sb-box')).toBeHidden({ timeout: 2000 });
  // Every band has the screen by then, so the change of page can't be seen.
  const most = () =>
    page.evaluate(() => (window as unknown as { rainbow: { most: number } }).rainbow.most);
  await expect.poll(most).toBeGreaterThan(0.97);
  await expect(page.locator('.wipe')).toBeHidden({ timeout: 2000 });
  await expect(page.locator('#sb-title')).toBeInViewport();
  await expect(page.locator('.sb-open video')).toBeInViewport();
});

for (const scene of ['#offbooked', '#play-by-the-sandbox', '#go']) {
  test(`a reload at ${scene} stays exactly where it was`, async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      window.history.scrollRestoration = 'auto';
    });
    await jumpTo(page, scene);
    const top = await page.evaluate(() => window.scrollY);
    await page.waitForTimeout(300);
    await page.addInitScript(() => {
      const seen: number[] = [];
      Object.assign(window, { scrollTrail: seen });
      const look = () => {
        seen.push(Math.round(window.scrollY));
        window.requestAnimationFrame(look);
      };
      look();
    });
    await page.reload();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(top);
    await page.waitForTimeout(700);
    const trail = await page.evaluate(
      () => (window as unknown as { scrollTrail: number[] }).scrollTrail,
    );
    // Once it has been restored, it goes nowhere.
    const restored = trail.indexOf(Math.round(top));
    expect(restored).toBeGreaterThanOrEqual(0);
    expect(new Set(trail.slice(restored)).size).toBe(1);
  });
}

test('a reload at the top of a closed scene leaves it closed', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    window.history.scrollRestoration = 'auto';
  });
  await jumpTo(page, '#offbooked');
  await page.waitForTimeout(300);
  await page.reload();
  await expect(page.locator('#offbooked')).toHaveAttribute('data-waiting', '');
  await expect(page.locator('.rope')).toBeInViewport();
});

test('every scene rests its loops while it is off screen', async ({ page }) => {
  await page.goto('/');
  const scenes = page.locator('[data-loops]');
  await expect(scenes).toHaveCount(4);
  await expect(page.locator('[data-loops]:not([data-resting])')).toHaveCount(0);
  await jumpTo(page, '#parkdex');
  await expect(page.locator('#parkdex')).not.toHaveAttribute('data-resting', '');
  await expect(page.locator('[data-loops]:not([data-resting])')).toHaveCount(1);
});

test('a frame never needs a click to carry on past', async ({ page }) => {
  await page.goto('/');
  for (const { scene } of moments) {
    await jumpTo(page, scene);
    await expect(page.locator(scene)).toHaveAttribute('data-waiting', '');
  }
  const links = await page.locator('main a[href^="http"]').count();
  expect(links).toBeGreaterThan(8);
  await page.evaluate(() => window.scrollTo({ top: 99999, behavior: 'instant' }));
  await expect(page.locator('.contact__mail')).toBeInViewport();
});

const toySettles = (page: Page, toy: Locator) =>
  expect
    .poll(
      async () => {
        const first = await toy.boundingBox();
        await page.waitForTimeout(150);
        const second = await toy.boundingBox();
        return first && second && Math.abs(first.y - second.y) < 0.5 && second.y > 0;
      },
      { timeout: 16000 },
    )
    .toBe(true);

const settledToy = async (page: Page) => {
  await useControl(page, '.sb-open', '.sb-box__open');
  // They drop in once the rainbow has gone.
  await page.waitForTimeout(1800);
  const toy = page.locator('[data-toy]').first();
  await toySettles(page, toy);
  const box = await toy.boundingBox();
  if (!box) throw new Error('The toy has no box');
  return { toy, box };
};

test('a toy can be picked up and thrown', async ({ page, isMobile }) => {
  test.setTimeout(45000);
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
  await expect.poll(async () => (await toy.boundingBox())?.y ?? 0).toBeGreaterThan(box.y - 30);
});

test('a finger can drag a toy, and swiping elsewhere still scrolls', async ({ page, isMobile }) => {
  test.setTimeout(45000);
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
  await expect.poll(async () => (await toy.boundingBox())?.x ?? 0).toBeGreaterThan(box.x + 50);
  await touch('touchEnd', x + 80, y - 60);
  expect(await page.evaluate(() => window.scrollY)).toBe(before);

  // Toys capture their own gestures, and a thrown one keeps sliding along the floor, so wait for
  // them all to stop. The swipe then starts high on the yard itself, well clear of the floor.
  await toySettles(page, toy);
  const toyPositions = () =>
    page.locator('[data-toy]').evaluateAll((toys) =>
      toys.map((element) => {
        const { x, y } = element.getBoundingClientRect();
        return `${Math.round(x)},${Math.round(y)}`;
      }),
    );
  await expect
    .poll(async () => {
      const first = await toyPositions();
      await page.waitForTimeout(250);
      return first.join() === (await toyPositions()).join();
    })
    .toBe(true);
  const start = await page.evaluate(() => {
    const yard = document.querySelector('[data-yard]')?.getBoundingClientRect();
    if (!yard) throw new Error('No yard');
    const lowest = Math.min(yard.bottom, window.innerHeight) - 40;
    for (let top = Math.max(yard.top + 20, 280); top < lowest; top += 20) {
      for (let left = 40; left < window.innerWidth; left += 40) {
        const hit = document.elementFromPoint(left, top);
        if (hit?.closest('[data-yard]') && !hit.closest('[data-toy], a')) return { left, top };
      }
    }
    throw new Error('Nowhere on the yard clear of the toys');
  });
  await touch('touchStart', start.left, start.top);
  for (let step = 1; step <= 6; step += 1) {
    await touch('touchMove', start.left, start.top - step * 40);
  }
  await touch('touchEnd', start.left, start.top - 240);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before + 100);
});

test('the toys are on the Sandbox screen, with no comic or wordmark around them', async ({
  page,
}) => {
  await page.goto('/');
  await useControl(page, '.sb-open', '.sb-box__open');
  await expect(page.locator('.sb-open [data-toy]')).toHaveCount(5);
  await expect(page.locator('.sb-panels, .sb-lot, .sb__yard-title')).toHaveCount(0);
  await expect(page.locator('img[src*="wordmark"], img[src*="panel-"]')).toHaveCount(0);
  await expect(page.locator('.sb-open')).not.toContainText('grab a toy');
  await page.waitForTimeout(1800);
  for (const toy of await page.locator('[data-toy]').all()) {
    await expect(toy).toBeInViewport({ ratio: 0.9, timeout: 4000 });
  }
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

// One test per width: the walk down this page is long enough to need its own time budget.
for (const width of [320, 390, 768, 1024, 1440, 1920]) {
  test(`${width}px doesn't scroll sideways or cut text off`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/');
    await walkThePage(page);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
    expect(await clippedText(page)).toEqual([]);
  });
}

// Whatever a frame has to show must fit inside it, or it can only be seen by leaving the frame.
for (const [width, height] of everySize) {
  test(`every frame fits at ${width}x${height}`, async ({ page }) => {
    test.setTimeout(60000);
    await page.setViewportSize({ width, height });
    await page.goto('/');

    // Each closed screen shows all of itself too.
    await jumpTo(page, '.abn-cover');
    for (const part of ['#abn-title', '.abn-cover__line', '.abn-key']) {
      await expect(page.locator(part), part).toBeInViewport({ ratio: 1 });
    }
    const line = await page.locator('.abn-cover__line').boundingBox();
    const key = await page.locator('.abn-key').boundingBox();
    const title = await page.locator('#abn-title').boundingBox();
    expect(line?.y ?? 0).toBeGreaterThanOrEqual((title?.y ?? 0) + (title?.height ?? 0) - 12);
    expect(key?.y ?? 0).toBeGreaterThanOrEqual((title?.y ?? 0) + (title?.height ?? 0) - 12);

    await useControl(page, '.abn-cover', '.abn-key');
    for (const part of [
      '.abn-show__copy h3',
      '.abn-stars',
      '.abn-show__cta',
      '.abn-show__recap',
      '.abn-browser',
    ]) {
      await expect(page.locator(part), part).toBeInViewport({ ratio: 1, timeout: 4000 });
    }

    await landKip(page);
    // Just under 1, because a fractional phone size can leave a millionth of one off screen.
    for (const stop of await page.locator('[data-stop]').all()) {
      await expect(stop).toBeInViewport({ ratio: 0.995, timeout: 4000 });
    }
    await expect(page.locator('.pk-slide')).toBeInViewport({ ratio: 1 });
    await expect.poll(() => uncoveredPoints(page.locator('.pk-slide'))).toBe(9);

    await page.locator('.pk-slide').click();
    await expect(page.locator('#parkdex')).toHaveAttribute('data-jumped', '', { timeout: 8000 });
    await expect(page.locator('.pk-end__kip')).toBeInViewport({ ratio: 0.9 });
    await expect(page.locator('.pk-sign')).toBeInViewport({ ratio: 1 });
    await expect(page.locator('.pk-end h3')).toBeInViewport({ ratio: 1 });
    for (const link of await page.locator('.pk-end a').all()) {
      await expect(link).toBeInViewport({ ratio: 1 });
      await expect.poll(() => uncoveredPoints(link)).toBe(9);
    }

    await useControl(page, '.sb-open', '.sb-box__open');
    await expect(page.locator('.sb-box')).toBeHidden({ timeout: 3000 });
    await expect(page.locator('#sb-title')).toBeInViewport({ ratio: 1 });
    await expect(page.locator('.sb__screen')).toBeInViewport({ ratio: 0.95 });
    await expect(page.locator('.sb__cta')).toBeInViewport({ ratio: 0.95 });
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
  });
}

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('shows a still, complete page with nothing left to open', async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto('/');
    await expect(page.locator('[data-waiting]')).toHaveCount(0);
    await expect(page.locator('[data-moment-control]:visible')).toHaveCount(0);
    await expect(page.locator('.drape').first()).toBeHidden();
    await expect(page.locator('.wipe')).toBeHidden();
    await expect(page.locator('[data-rider], [data-diver]')).toHaveCount(2);
    await expect(page.locator('[data-rider]')).toBeHidden();
    await expect(page.locator('[data-diver]')).toBeHidden();
    await expect(page.locator('.pk-end__kip')).toBeVisible();
    await expect(page.locator('.abn-show__cta')).toBeVisible();
    await expect(page.locator('.pk-end h3')).toBeVisible();
    await expect(page.locator('[data-stop] h3').first()).toBeVisible();
    await expect(page.locator('.ticket')).toHaveCSS('opacity', '1');
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

  test('the page is left exactly where a scroll stops it', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Settling is the same on touch.');
    await page.goto('/');
    await page.mouse.move(400, 400);
    await page.mouse.wheel(0, 200);
    await page.waitForTimeout(2200);
    expect(await page.evaluate(() => window.scrollY)).toBe(200);
  });

  for (const [option, name] of [
    [2, 'badge'],
    [3, 'board'],
    [8, 'channels'],
  ] as const) {
    test(`hero ${option}, the ${name}, holds still`, async ({ page }) => {
      await page.goto(`/?hero=${option}`);
      await page.waitForTimeout(300);
      const first = await page.locator('[data-hero-slot]').innerHTML();
      // Longer than the channels take to start changing.
      await page.waitForTimeout(4500);
      expect(await page.locator('[data-hero-slot]').innerHTML()).toBe(first);
    });
  }
});

test('without the page script, nothing is hidden or waiting', async ({ page }) => {
  await page.route('**/_astro/*.js', (route) => route.abort());
  await page.goto('/');
  await page.locator('#ob-title').scrollIntoViewIfNeeded();
  for (const part of await page.locator('#ob-title > *').all()) {
    expect(await opacityOf(part)).toBe(1);
  }
  expect(await opacityOf(page.locator('.ticket'))).toBe(1);
  await expect(page.locator('[data-moment-control]:visible')).toHaveCount(0);
  await expect(page.locator('.abn-show__cta')).toBeVisible();
  await expect(page.locator('[data-stop] img').first()).toBeVisible();
  await expect(page.locator('#sb-title')).toBeVisible();
  // Visible isn't enough: the cover's headline stays clear of the site that follows it.
  await page.locator('#abn-title').scrollIntoViewIfNeeded();
  await expect.poll(() => uncoveredPoints(page.locator('#abn-title'))).toBeGreaterThan(0);
});

test('a script that stalls stops holding the scenes closed', async ({ page }) => {
  await page.route('**/_astro/*.js', () => {
    // Never answered.
  });
  await page.goto('/', { waitUntil: 'commit' });
  await expect(page.locator('html')).toHaveClass(/stage/);
  await expect(page.locator('html')).not.toHaveClass(/stage/, { timeout: 8000 });
  await page.locator('.abn-show__cta').scrollIntoViewIfNeeded();
  await expect.poll(() => uncoveredPoints(page.locator('.abn-show__cta'))).toBeGreaterThan(0);
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('every world and link is still there', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('[data-hero-toggle]')).toBeHidden();
    await expect(page.locator('a[href="https://offbooked.com/"]').first()).toBeAttached();
    await page.locator('.wash-list').scrollIntoViewIfNeeded();
    await expect(page.locator('.wash-list li').first()).toBeVisible();
    for (const link of await page.locator('.pk-end a').all()) await expect(link).toBeVisible();
    await page.locator('#ob-title').scrollIntoViewIfNeeded();
    for (const part of await page.locator('#ob-title > *').all()) {
      expect(await opacityOf(part)).toBe(1);
    }
    expect(await opacityOf(page.locator('.ticket'))).toBe(1);
    await expect(page.locator('.drape').first()).toBeHidden();
    await expect(page.locator('.wipe')).toBeHidden();
    await expect(page.locator('[data-moment-control]:visible')).toHaveCount(0);
  });
});

test('unknown routes serve the 404 page', async ({ page }) => {
  const response = await page.goto('/this-route-does-not-exist/');
  expect(response?.status()).toBe(404);
  await expect(page.locator('h1')).toHaveText('Nobody here.');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
});
