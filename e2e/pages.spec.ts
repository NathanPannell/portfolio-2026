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
          !element.closest('[aria-hidden="true"], .rules__stage, .tape, .marquee') &&
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

const jumpInto = (page: Page, selector: string, progress: number) =>
  page.locator(selector).evaluate((element, at) => {
    const rect = element.getBoundingClientRect();
    const stage = element.querySelector<HTMLElement>('[data-stage]');
    const span = rect.height - (stage?.offsetHeight ?? window.innerHeight);
    window.scrollTo({ top: rect.top + window.scrollY + span * at, behavior: 'instant' });
  }, progress);

test('scrolling opens the curtains, then brings the Offbooked ad on stage', async ({ page }) => {
  await page.goto('/');
  const drape = page.locator('.drape--left');
  const covered = () =>
    drape.evaluate((element) => element.getBoundingClientRect().width / window.innerWidth);
  const onStage = page.locator('[data-collage] [data-at][data-on]');
  await jumpInto(page, '[data-collage]', 0);
  await expect.poll(covered).toBeGreaterThan(0.45);
  await expect(onStage).toHaveCount(0);
  await jumpInto(page, '[data-collage]', 0.26);
  await expect.poll(covered).toBeLessThan(0.05);
  await expect(page.locator('.ticket')).not.toHaveAttribute('data-on', '');
  await jumpInto(page, '[data-collage]', 1);
  await expect(onStage).toHaveCount(await page.locator('[data-collage] [data-at]').count());
  await expect(page.locator('.ticket')).toBeInViewport();
  await expect(page.locator('[data-collage]')).not.toHaveAttribute('data-resting', '');
  // Scrolling back takes the pieces off again.
  await jumpInto(page, '[data-collage]', 0.1);
  await expect(onStage).toHaveCount(0);
});

test('the Offbooked phones keep changing screens', async ({ page }) => {
  await page.goto('/');
  await jumpInto(page, '[data-collage]', 1);
  const handset = page.locator('.handset--1');
  const running = () =>
    handset.evaluate((element) =>
      element
        .getAnimations({ subtree: true })
        .some((animation) => animation.playState === 'running'),
    );
  await expect.poll(running).toBe(true);
  // Out of view, the loops rest.
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await expect(page.locator('[data-collage]')).toHaveAttribute('data-resting', '');
  await expect.poll(running).toBe(false);
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

// Points across a link, kept off its corners and the ticket's notches.
const uncoveredPoints = (locator: Locator) =>
  locator.evaluate((element) => {
    const { left, top, width, height } = element.getBoundingClientRect();
    const points = [0.2, 0.5, 0.8].flatMap((x) =>
      [0.25, 0.5, 0.75].map((y) => [left + width * x, top + height * y] as const),
    );
    return points.filter(([x, y]) => element.contains(document.elementFromPoint(x, y))).length;
  });

test('the Offbooked ticket can be clicked once it lands', async ({ page }) => {
  await page.goto('/');
  await jumpInto(page, '[data-collage]', 1);
  const ticket = page.locator('.ticket');
  await expect(ticket).toHaveAttribute('data-on', '');
  await expect.poll(() => uncoveredPoints(ticket)).toBe(9);
});

test('an address bar never puts the marquee over the ticket', async ({ page }) => {
  // Test browsers have no bar, so stand in for one. The doubled class beats the scoped rule.
  for (const [width, height, bar] of [
    [390, 844, 86],
    [412, 915, 56],
    [844, 390, 56],
    [667, 375, 76],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    await page.addStyleTag({ content: `.ob-stage.ob-stage { --bar: ${bar}px; }` });
    await jumpInto(page, '[data-collage]', 1);
    const ticket = page.locator('.ticket');
    await expect(ticket).toHaveAttribute('data-on', '');
    await expect.poll(() => uncoveredPoints(ticket), `${width}x${height}`).toBe(9);
  }
});

test('the finished ad keeps its headline and ticket clear at every size', async ({ page }) => {
  for (const [width, height] of [
    [320, 640],
    [390, 844],
    [667, 375],
    [760, 760],
    [844, 390],
    [860, 860],
    [1024, 768],
    [1440, 900],
    [1920, 1080],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    await jumpInto(page, '[data-collage]', 1);
    const title = page.locator('#ob-title');
    await expect(page.locator('.ticket')).toHaveAttribute('data-on', '');
    await expect(title).toBeInViewport({ ratio: 1 });
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
    expect(await horizontalOverflow(page), `${width}x${height}`).toBeLessThanOrEqual(0);
  }
});

test('Kip rides the vine down, scores each stop, and plants flags', async ({ page }) => {
  await page.goto('/');
  await jumpInto(page, '[data-descent]', 0);
  await expect(page.locator('#pk-title')).toBeInViewport();
  const score = page.locator('[data-score]');
  await expect(score).toHaveText('0');
  await page.locator('[data-plant]').click();
  await expect(score).toHaveText('6');
  await expect(page.locator('.pk-mark')).toHaveCount(1);

  const stops = page.locator('[data-stop]');
  await expect(stops).toHaveCount(4);
  const riderSpots = new Set<number>();
  const layer = page.locator('[data-layer]').nth(1);
  const start = await layer.evaluate((element) => element.style.transform);
  for (const [index, stop] of (await stops.all()).entries()) {
    await stop.evaluate((element) => {
      const { top, height } = element.getBoundingClientRect();
      window.scrollTo({
        top: top + window.scrollY + height / 2 - window.innerHeight / 2,
        behavior: 'instant',
      });
    });
    await expect(stop.locator('img')).toBeInViewport();
    await expect(stop).toHaveAttribute('data-reached', '');
    await expect(score).toHaveText(String(6 + (index + 1) * 12));
    // Kip stays on screen the whole way down, following the curve of the vine.
    const rider = await page.locator('[data-rider]').boundingBox();
    riderSpots.add(Math.round(rider?.x ?? 0));
    expect(rider?.x ?? -999).toBeGreaterThanOrEqual(-8);
    expect((rider?.x ?? 0) + (rider?.width ?? 9999)).toBeLessThanOrEqual(
      (page.viewportSize()?.width ?? 0) + 8,
    );
  }

  expect(riderSpots.size).toBeGreaterThan(2);
  expect(await layer.evaluate((element) => element.style.transform)).not.toBe(start);

  await jumpInto(page, '[data-descent]', 1);
  await expect(page.locator('.pk-end h3')).toBeInViewport();
  // The button steps aside so it can't sit on top of the links.
  await expect(page.locator('[data-plant]')).toBeHidden();
});

test('foreground leaves stay off the sky and the ground', async ({ page }) => {
  await page.goto('/');
  const front = page.locator('[data-front]');
  await jumpInto(page, '[data-descent]', 0);
  await expect(front).not.toHaveAttribute('data-forest', '');
  await page.locator('[data-stop]').nth(1).scrollIntoViewIfNeeded();
  await expect(front).toHaveAttribute('data-forest', '');
  await jumpInto(page, '[data-descent]', 1);
  await expect(front).not.toHaveAttribute('data-forest', '');
});

// How far the wipe has got: the share of Sandbox's paper that has risen onto the stage.
const paperRisen = (page: Page) =>
  page.locator('[data-paper]').evaluate((element) => {
    const { top, height } = element.getBoundingClientRect();
    const stage = element.parentElement?.getBoundingClientRect();
    return 1 - Math.max(0, top - (stage?.top ?? 0)) / height;
  });

test('the crayon wipe follows the scroll in both directions', async ({ page }) => {
  await page.goto('/');
  const bands = page.locator('[data-band]');
  await expect(bands).toHaveCount(6);
  // How much of the screen's width each band covers.
  const covered = () =>
    bands.evaluateAll((elements) =>
      elements.map((element) => {
        const { left, right } = element.getBoundingClientRect();
        return Math.max(0, Math.min(window.innerWidth, right) - Math.max(0, left));
      }),
    );
  const width = page.viewportSize()?.width ?? 0;
  const none = () => covered().then((spans) => spans.every((span) => span === 0));
  const all = () => covered().then((spans) => spans.every((span) => span >= width));
  await jumpInto(page, '[data-wipe]', 0);
  await expect.poll(none).toBe(true);
  await expect.poll(() => paperRisen(page)).toBeLessThan(0.02);
  await jumpInto(page, '[data-wipe]', 0.66);
  await expect.poll(all).toBe(true);
  await expect.poll(() => paperRisen(page)).toBeLessThan(0.02);
  await jumpInto(page, '[data-wipe]', 1);
  await expect.poll(() => paperRisen(page)).toBeGreaterThan(0.995);
  // Back up, it rolls back the same way.
  await jumpInto(page, '[data-wipe]', 0);
  await expect.poll(() => paperRisen(page)).toBeLessThan(0.02);
  await expect.poll(none).toBe(true);
});

test('a single jump through the wipe still plays it, frame by frame', async ({ page }) => {
  await page.goto('/');
  await jumpInto(page, '[data-wipe]', 0);
  await expect.poll(() => paperRisen(page)).toBeLessThan(0.02);
  const frames = await page.locator('[data-paper]').evaluate(async (element) => {
    const seen: number[] = [];
    const stage = element.parentElement as HTMLElement;
    const track = stage.parentElement as HTMLElement;
    const rect = track.getBoundingClientRect();
    window.scrollTo({
      top: rect.top + window.scrollY + rect.height - stage.offsetHeight,
      behavior: 'instant',
    });
    for (let frame = 0; frame < 60; frame += 1) {
      await new Promise((resolve) => window.requestAnimationFrame(resolve));
      seen.push(element.getBoundingClientRect().top - stage.getBoundingClientRect().top);
    }
    return seen;
  });
  // Copying the scroll position would give one or two values; playing gives a run of them.
  expect(new Set(frames.map((top) => Math.round(top))).size).toBeGreaterThan(5);
  // It only ever rises.
  for (let frame = 1; frame < frames.length; frame += 1) {
    expect(frames[frame] ?? 0).toBeLessThanOrEqual((frames[frame - 1] ?? 0) + 0.5);
  }
  expect(frames.at(-1) ?? 999).toBeLessThan(2);
});

test('a reload part-way through a scene comes back in the right state', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    window.history.scrollRestoration = 'auto';
  });
  await jumpInto(page, '[data-wipe]', 1);
  await expect.poll(() => paperRisen(page)).toBeGreaterThan(0.995);
  await page.reload();
  await expect.poll(() => paperRisen(page)).toBeGreaterThan(0.995);
  await jumpInto(page, '[data-collage]', 1);
  await expect(page.locator('.ticket')).toHaveAttribute('data-on', '');
  await page.reload();
  await expect(page.locator('.ticket')).toHaveAttribute('data-on', '');
  await expect(page.locator('.ticket')).toBeInViewport();
});

test('a reload mid-scene does not play pieces leaving the stage', async ({ page }) => {
  await page.goto('/');
  await jumpInto(page, '[data-collage]', 0.3);
  await expect(page.locator('.ob-stage')).toHaveAttribute('data-sprung', '');
  // Watch the ticket, which isn't due yet, from the first frame after the page takes over.
  await page.addInitScript(() => {
    const seen: number[] = [];
    Object.assign(window, { ticketOpacity: seen });
    const watch = () => {
      const stage = document.querySelector('.ob-stage');
      const ticket = document.querySelector('.ticket');
      if (ticket && stage?.hasAttribute('data-ready')) {
        seen.push(Number(getComputedStyle(ticket).opacity));
      }
      window.requestAnimationFrame(watch);
    };
    window.requestAnimationFrame(watch);
  });
  await page.reload();
  await expect(page.locator('.ob-stage')).toHaveAttribute('data-sprung', '');
  await page.waitForTimeout(200);
  const seen = await page.evaluate(
    () => (window as unknown as { ticketOpacity: number[] }).ticketOpacity,
  );
  expect(seen.length).toBeGreaterThan(0);
  expect(Math.max(...seen)).toBe(0);
});

test('every scene rests its loops while it is off screen', async ({ page }) => {
  await page.goto('/');
  const scenes = page.locator('[data-loops]');
  await expect(scenes).toHaveCount(5);
  await expect(page.locator('[data-loops]:not([data-resting])')).toHaveCount(1);
  await expect(page.locator('[data-hero]')).not.toHaveAttribute('data-resting', '');
  await jumpInto(page, '[data-descent]', 0.5);
  await expect(page.locator('[data-descent]')).not.toHaveAttribute('data-resting', '');
  await expect(page.locator('[data-loops]:not([data-resting])')).toHaveCount(1);
});

test('the wipe joins Parkdex and Sandbox with nothing showing through', async ({ page }) => {
  await page.goto('/');
  await jumpInto(page, '[data-wipe]', 1);
  await expect.poll(() => paperRisen(page)).toBeGreaterThan(0.995);
  const seam = await page.locator('.wipe__stage').evaluate((stage) => {
    const sandbox = document.querySelector('#play-by-the-sandbox') as HTMLElement;
    const ground = document.querySelector('[data-ground]') as HTMLElement;
    const paper = stage.querySelector('[data-paper]') as HTMLElement;
    return {
      gap: sandbox.getBoundingClientRect().top - stage.getBoundingClientRect().bottom,
      paper: getComputedStyle(paper).backgroundColor,
      sandbox: getComputedStyle(sandbox).backgroundColor,
      opening: getComputedStyle(stage).backgroundColor,
      ground: getComputedStyle(ground).getPropertyValue('--floor').trim(),
    };
  });
  expect(Math.abs(seam.gap)).toBeLessThanOrEqual(1);
  expect(seam.paper).toBe(seam.sandbox);
  expect(seam.opening).toBe('rgb(22, 69, 47)');
  expect(seam.ground).toBe('#16452f');
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
  const second = page.locator('.abn-tenets__two');
  await expect
    .poll(() =>
      second.evaluate((element) => {
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
  await page.locator('.pk-end a').first().scrollIntoViewIfNeeded();
  for (const link of await page.locator('.pk-end a').all()) {
    await expect.poll(() => uncoveredPoints(link)).toBe(9);
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
    await expect(page.locator('.wipe')).toBeHidden();
    // The route is plain page content, so nothing is left waiting for a scroll position.
    await expect(page.locator('[data-rider]')).toBeHidden();
    await expect(page.locator('.pk-end h3')).toBeVisible();
    await expect(page.locator('.ticket')).toHaveCSS('opacity', '1');
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

test('without the page script, the Offbooked ad is still all there', async ({ page }) => {
  await page.route('**/_astro/*.js', (route) => route.abort());
  await page.goto('/');
  await page.locator('#ob-title').scrollIntoViewIfNeeded();
  for (const part of await page.locator('#ob-title > *').all()) {
    expect(await opacityOf(part)).toBe(1);
  }
  expect(await opacityOf(page.locator('.ticket'))).toBe(1);
  for (const reveal of await page.locator('[data-reveal]').all()) {
    expect(await opacityOf(reveal)).toBe(1);
  }
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
    for (const link of await page.locator('.pk-end a').all()) await expect(link).toBeVisible();
    await page.locator('#ob-title').scrollIntoViewIfNeeded();
    for (const part of await page.locator('#ob-title > *').all()) {
      expect(await opacityOf(part)).toBe(1);
    }
    expect(await opacityOf(page.locator('.ticket'))).toBe(1);
    await expect(page.locator('.drape').first()).toBeHidden();
    await expect(page.locator('.wipe')).toBeHidden();
  });
});

test('unknown routes serve the 404 page', async ({ page }) => {
  const response = await page.goto('/this-route-does-not-exist/');
  expect(response?.status()).toBe(404);
  await expect(page.locator('h1')).toHaveText('Nobody here.');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
});
