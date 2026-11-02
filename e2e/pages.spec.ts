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
  for (const id of ['abn-title', 'ob-title', 'pk-title', 'sb-title', 'tp-title', 'go-title']) {
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
    'https://notquitemytempo-sand.vercel.app/',
    'https://play.google.com/store/apps/details?id=app.parkdex',
  ]) {
    expect(hrefs).toContain(url);
  }
  expect(hrefs).not.toContain('https://web.parkdex.app/');
  expect(hrefs.filter((href) => href.includes('/pages/past-nights'))).toEqual([]);
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
  { name: 'Not Quite My Tempo', scene: '.tp', control: '.tp-tap', inside: '.tp__cta' },
] as const;

const TEMPO = 'https://notquitemytempo-sand.vercel.app/';

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

// What each opened section says, in the owner's order, with one real picture to each line.
const explained = [
  {
    name: 'AI Build Night',
    scene: '.abn-cover',
    control: '.abn-key',
    rotates: true,
    steps: [
      'A free night, once a month.',
      'Build something with AI in one night.',
      'Share and learn with other builders.',
      'Grow and support a community in Victoria that can create the next big thing.',
    ],
  },
  {
    name: 'Offbooked',
    scene: '#offbooked',
    control: '.rope',
    rotates: true,
    steps: [
      'Upload your script.',
      'Invite your cast.',
      'Everyone records their lines.',
      'Practise with your castmates’ voices.',
    ],
  },
  {
    name: 'Play by the Sandbox',
    scene: '.sb-open',
    control: '.sb-box__open',
    rotates: false,
    steps: [
      'Sandbox is hosting an event for creatives.',
      'They needed an eye-catching website in a child-like crayon style.',
      'I created a 3D landing page with interactive elements and fun visuals.',
    ],
  },
] as const;

// Every step on screen, its words and picture inside it, and nothing sitting on anything else.
const stepsFit = async (page: Page, scene: string, label: string) => {
  const steps = page.locator(`${scene} [data-step]`);
  await expect(steps.last(), label).toHaveCSS('opacity', '1', { timeout: 6000 });
  // Everything has landed, so nothing below is measured on its way in.
  await page.locator(scene).evaluate((root) =>
    Promise.allSettled(
      root
        .getAnimations({ subtree: true })
        .filter((animation) => animation.effect?.getComputedTiming().iterations !== Infinity)
        // Not the rotation's own count, which only ends by moving on to the next step.
        .filter(
          (animation) => !(animation.effect as KeyframeEffect).target?.matches('[data-steps]'),
        )
        .map((animation) => animation.finished),
    ),
  );
  for (const step of await steps.all()) {
    await expect(step, label).toBeInViewport({ ratio: 0.995 });
  }
  const opened = page.locator(`${scene} [data-steps-window]:visible`);
  // Only its first and last steps' worth of room: a tilted window reaches a little past its box.
  if ((await opened.count()) > 0) await expect(opened, label).toBeInViewport({ ratio: 0.98 });
  const collisions = await page.locator(scene).evaluate((root) => {
    const parts = [
      ...root.querySelectorAll<HTMLElement>(
        '[data-step], [data-steps-window], a[href], .abn-show__lead, .ob-copy h2, .sb__head h2, .pk-slide',
      ),
    ].filter((part) => !part.closest('[inert]') && part.getClientRects().length > 0);
    const hits: string[] = [];
    for (const [index, part] of parts.entries()) {
      const box = part.getBoundingClientRect();
      // A tilted picture's corners reach a little further than the box it was laid out in.
      for (const [selector, slack] of [
        ['h3', 1],
        ['figure', 8],
      ] as const) {
        const { bottom } = part.querySelector(selector)?.getBoundingClientRect() ?? box;
        if (bottom > box.bottom + slack) hits.push(`Spills out: ${part.textContent?.slice(0, 30)}`);
      }
      // Every word stays inside the step it is in.
      const pick = part.querySelector('.step__pick');
      if (pick && pick.scrollWidth > pick.clientWidth + 1) {
        hits.push(`Overruns: ${part.textContent?.slice(0, 30)}`);
      }
      for (const other of parts.slice(index + 1)) {
        const next = other.getBoundingClientRect();
        const apart =
          next.left >= box.right - 1 ||
          box.left >= next.right - 1 ||
          next.top >= box.bottom - 1 ||
          box.top >= next.bottom - 1;
        if (!apart)
          hits.push(`${part.textContent?.slice(0, 20)} on ${other.textContent?.slice(0, 20)}`);
      }
    }
    return hits;
  });
  expect(collisions, label).toEqual([]);
};

for (const { name, scene, control, rotates, steps } of explained) {
  test(`${name} keeps its steps back until it opens`, async ({ page }) => {
    await page.goto('/');
    await jumpTo(page, scene);
    await expect(page.locator(`${scene} .step`).first()).toHaveCSS('opacity', '0');
    await page.locator(control).click();
    await expect(page.locator(`${scene} .step`).last()).toHaveCSS('opacity', '1', {
      timeout: 6000,
    });
  });

  test(`${name} says what it does in numbered steps`, async ({ page }) => {
    await page.goto('/');
    await useControl(page, scene, control);
    const shown = page.locator(`${scene} .step`);
    await expect(shown).toHaveCount(steps.length);
    await stepsFit(page, scene, name);
    const pictures = new Set<string>();
    for (const [index, title] of steps.entries()) {
      await expect(shown.nth(index).locator('h3')).toHaveText(`${index + 1}${title}`);
      const picture = page.locator(`${scene} figure`).nth(index).locator('img, video');
      await expect(picture).toHaveCount(1);
      pictures.add(
        await picture.evaluate((element) =>
          element instanceof HTMLVideoElement
            ? (element.dataset['src'] ?? '')
            : (element as HTMLImageElement).currentSrc,
        ),
      );
    }
    expect(pictures.size).toBe(steps.length);
    if (rotates) return;
    // Nothing is waiting for a timer or a scroll: what is on screen now is all there is.
    const first = await page.locator(`${scene} .steps`).innerHTML();
    await page.waitForTimeout(1500);
    expect(await page.locator(`${scene} .steps`).innerHTML()).toBe(first);
  });
}

const sets = [
  { name: 'abn', scene: '.abn-cover', control: '.abn-key' },
  { name: 'offbooked', scene: '#offbooked', control: '.rope' },
] as const;

const openSet = async (page: Page, { name, scene, control }: (typeof sets)[number]) => {
  await useControl(page, scene, control);
  await expect(page.locator(`[data-steps="${name}"] [data-step]`).last()).toBeInViewport({
    timeout: 6000,
  });
};

// The count is an animation on the set itself, which leaves it to be read, or run to its end.
const counting = (set: Locator) =>
  set.evaluate((element) => element.getAnimations()[0]?.playState ?? 'none');
const finishStep = (set: Locator) =>
  set.evaluate((element) => element.getAnimations()[0]?.finish());

const showing = (set: Locator) =>
  set
    .locator('[data-step]')
    .evaluateAll((rows) => rows.findIndex((row) => row.hasAttribute('data-current')));

const showingPicture = (set: Locator) =>
  set
    .locator('[data-steps-view] figure')
    .evaluateAll((pictures) =>
      pictures.flatMap((picture, index) =>
        getComputedStyle(picture).visibility === 'visible' ? [index] : [],
      ),
    );

test('two sections rotate, and the layouts are settled for good', async ({ page }) => {
  // An old review link does nothing now, and the page leaves the address alone.
  await page.goto('/?abn=side&offbooked=side&parkdex=rotating&sandbox=rotating&tempo=side');
  for (const { name } of sets) {
    await expect(page.locator(`[data-steps="${name}"]`)).toHaveAttribute('data-layout', 'rotating');
  }
  await expect(page.locator('[data-steps-window]')).toHaveCount(2);
  await expect(page.locator('[data-steps]')).toHaveCount(3);
  await expect(page.locator('[data-steps="sandbox"] [data-step] figure')).toHaveCount(3);
  await expect(page.locator('[data-layout-pick], [data-steps-toggle]')).toHaveCount(0);
  await expect(page.locator('.tp [data-step]')).toHaveCount(0);
});

for (const set of sets) {
  test(`${set.name} rotates only once it is open, however long the wait`, async ({ page }) => {
    await page.goto('/');
    const steps = page.locator(`[data-steps="${set.name}"]`);
    await jumpTo(page, set.scene);
    await page.waitForTimeout(500);
    expect(await counting(steps)).toBe('none');
    await openSet(page, set);
    expect(await showing(steps)).toBe(0);
    await expect.poll(() => counting(steps)).toBe('running');
    await finishStep(steps);
    await expect.poll(() => showing(steps)).toBe(1);
    await expect.poll(() => showingPicture(steps)).toEqual([1]);
    await stepsFit(page, set.scene, set.name);
    await expect(steps.locator('[aria-current="step"]')).toHaveCount(1);
    // All the way round and back to the first.
    const total = await steps.locator('[data-step]').count();
    for (let step = 0; step < total; step += 1) {
      await expect.poll(() => counting(steps)).toBe('running');
      const before = await showing(steps);
      await finishStep(steps);
      await expect.poll(() => showing(steps)).toBe((before + 1) % total);
    }
  });

  test(`${set.name} shows every step in its list while it rotates`, async ({ page }) => {
    await page.goto('/');
    await openSet(page, set);
    const steps = page.locator(`[data-steps="${set.name}"]`);
    const rows = steps.locator('[data-step]');
    for (const row of await rows.all()) await expect(row.locator('button')).toBeVisible();
    await expect(steps.locator('[data-steps-view] figure')).toHaveCount(await rows.count());
  });

  test(`${set.name} stops rotating once a step is picked`, async ({ page }) => {
    await page.goto('/');
    await openSet(page, set);
    const steps = page.locator(`[data-steps="${set.name}"]`);
    await expect.poll(() => counting(steps)).toBe('running');
    await steps.locator('.step__pick').nth(2).click();
    await expect.poll(() => showing(steps)).toBe(2);
    await expect.poll(() => showingPicture(steps)).toEqual([2]);
    await expect(steps.locator('.step__pick').nth(2)).toHaveAttribute('aria-current', 'step');
    expect(await counting(steps)).toBe('none');
  });
}

test.describe('with a mouse and keyboard', () => {
  test.skip(({ isMobile }) => isMobile, 'There is no pointer to rest or keys to press.');

  test('it keeps counting under a mouse left where the control was', async ({ page }) => {
    await page.goto('/');
    for (const set of sets) {
      await jumpTo(page, set.scene);
      await page.locator(set.control).click();
      const steps = page.locator(`[data-steps="${set.name}"]`);
      await expect.poll(() => counting(steps)).toBe('running');
      await page.waitForTimeout(300);
      expect(await counting(steps)).toBe('running');
    }
  });

  test('a mouse on the list or the window pauses the count, and leaving resumes it', async ({
    page,
  }) => {
    await page.goto('/');
    await openSet(page, sets[1]);
    const steps = page.locator('[data-steps="offbooked"]');
    await expect.poll(() => counting(steps)).toBe('running');
    await page.locator('#offbooked [data-steps-window]').hover();
    await expect.poll(() => counting(steps)).toBe('paused');
    await page.mouse.move(2, 2);
    await expect.poll(() => counting(steps)).toBe('running');
  });

  test('resting the mouse on a step picks it', async ({ page }) => {
    await page.goto('/');
    await openSet(page, sets[0]);
    const steps = page.locator('[data-steps="abn"]');
    await expect.poll(() => counting(steps)).toBe('running');
    await steps.locator('[data-step]').nth(3).hover();
    await expect.poll(() => showing(steps)).toBe(3);
    expect(await counting(steps)).toBe('none');
    // And any other, after that.
    await steps.locator('[data-step]').nth(1).hover();
    await expect.poll(() => showing(steps)).toBe(1);
  });

  test('a key held with a modifier is left to the browser', async ({ page }) => {
    await page.goto('/');
    await openSet(page, sets[0]);
    const steps = page.locator('[data-steps="abn"]');
    await steps.locator('.step__pick').first().focus();
    await page.keyboard.press('Shift+ArrowDown');
    expect(await showing(steps)).toBe(0);
    expect(await steps.evaluate((element) => element.getAnimations().length)).toBe(1);
  });

  test('focus pauses the count, and keys pick and move between steps', async ({ page }) => {
    await page.goto('/');
    await openSet(page, sets[0]);
    const steps = page.locator('[data-steps="abn"]');
    const picks = steps.locator('.step__pick');
    await expect.poll(() => counting(steps)).toBe('running');
    await picks.nth(1).focus();
    await expect.poll(() => counting(steps)).toBe('paused');
    await page.locator('.abn-show__cta').focus();
    await expect.poll(() => counting(steps)).toBe('running');
    await steps.locator('[data-steps-window]').focus();
    await expect.poll(() => counting(steps)).toBe('paused');
    await page.locator('.abn-show__cta').focus();
    await expect.poll(() => counting(steps)).toBe('running');
    await picks.nth(1).focus();
    await page.keyboard.press('Enter');
    await expect.poll(() => showing(steps)).toBe(1);
    await page.keyboard.press('ArrowDown');
    await expect.poll(() => showing(steps)).toBe(2);
    await expect(picks.nth(2)).toBeFocused();
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowUp');
    await expect.poll(() => showing(steps)).toBe(0);
    expect(await counting(steps)).toBe('none');
  });

  test('the keyboard reaches a step only once the section is open', async ({ page }) => {
    await page.goto('/');
    await jumpTo(page, '#offbooked');
    const steps = page.locator('[data-steps="offbooked"]');
    const closedOff = () => steps.evaluate((set) => (set as HTMLElement).inert);
    expect(await closedOff()).toBe(true);
    await page.locator('.rope').click();
    await expect.poll(closedOff).toBe(false);
  });
});

test('the real dwell moves on by itself, and leaves time to read', async ({ page, isMobile }) => {
  test.skip(isMobile, 'The clock is the same on a phone.');
  test.setTimeout(30000);
  await page.goto('/');
  await openSet(page, sets[1]);
  const steps = page.locator('[data-steps="offbooked"]');
  await page.mouse.move(2, 2);
  await expect.poll(() => counting(steps)).toBe('running');
  const start = Date.now();
  await expect.poll(() => showing(steps), { timeout: 12000 }).toBe(1);
  expect(Date.now() - start).toBeGreaterThan(5000);
});

test('the step showing is marked from its first moment, not only as the count runs', async ({
  page,
}) => {
  await page.goto('/');
  await openSet(page, sets[1]);
  const pick = page.locator('[data-steps="offbooked"] [data-current] .step__pick');
  await expect(pick).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
});

test('off screen, the count waits', async ({ page }) => {
  await page.goto('/');
  await openSet(page, sets[0]);
  const steps = page.locator('[data-steps="abn"]');
  await expect.poll(() => counting(steps)).toBe('running');
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await expect.poll(() => counting(steps)).toBe('paused');
});

// Everything but the window's own picture, so a click lands on a page that says where it went.
const catchSite = (page: Page, url: string) =>
  page.route(`${url}**`, (route) =>
    route.fulfill({ contentType: 'text/html', body: '<title>Arrived</title>' }),
  );

test('any click on the AI Build Night window opens the site, and nothing else there does', async ({
  page,
}) => {
  await catchSite(page, 'https://aibuildnight.ca/');
  await page.goto('/');
  await openSet(page, sets[0]);
  const steps = page.locator('[data-steps="abn"]');
  const frame = steps.locator('[data-steps-window]');
  await expect(frame).toHaveAttribute('href', 'https://aibuildnight.ca/');
  await expect(frame).toHaveAccessibleName('Open the AI Build Night site, aibuildnight.ca');
  await expect(page.locator('.abn-cover a')).toHaveCount(2);
  await expect(page.locator('.abn-cover')).not.toContainText(/Read the recap|Night 00\d/);
  await expect(page.locator('.abn-show__lead')).toContainText(
    'A free night in Victoria to build something real with AI.',
  );
  // Picking a step moves the window on, and stays here.
  await steps.locator('.step__pick').nth(2).click();
  await expect.poll(() => showing(steps)).toBe(2);
  expect(new URL(page.url()).hostname).not.toBe('aibuildnight.ca');
  // Its address bar and its picture are the same link.
  await frame.locator('.steps-window__bar').click();
  await expect(page).toHaveURL('https://aibuildnight.ca/');
  await page.goBack();
  await page.locator('.abn-cover').waitFor();
});

test('the AI Build Night window says it is a link when the mouse comes onto it', async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, 'There is no hover here.');
  await page.goto('/');
  await openSet(page, sets[0]);
  const cue = page.locator('.steps-window__go');
  await page.mouse.move(2, 2);
  await expect(cue).toHaveCSS('opacity', '0');
  await expect(cue).toHaveText('Open aibuildnight.ca ↗');
  await page.locator('[data-steps="abn"] [data-steps-window]').hover();
  await expect(cue).toHaveCSS('opacity', '1');
});

test('the Parkdex stops are the four steps, with the demo leaderboard third', async ({ page }) => {
  await page.goto('/');
  await landKip(page);
  const stops = page.locator('[data-stop]');
  await expect(stops.locator('h3')).toHaveText([
    'Visit a park.',
    'Plant your flag.',
    'Earn points.',
    'Explore your city!',
  ]);
  await expect(stops.nth(2).locator('img')).toHaveAttribute('src', /leaderboard/);
  await expect(stops.nth(2).locator('img')).toHaveAttribute('alt', /demo players/);
});

// How far each stop swings either way, from inside the page, over this many milliseconds.
const swings = (page: Page, milliseconds: number) =>
  page.evaluate(async (length) => {
    const stops = [...document.querySelectorAll<HTMLElement>('[data-stop]')];
    const widest = stops.map(() => 0);
    const start = performance.now();
    while (performance.now() - start < length) {
      await new Promise((frame) => window.requestAnimationFrame(frame));
      stops.forEach((stop, index) => {
        const angle = Math.abs(Number.parseFloat(stop.style.rotate) || 0);
        widest[index] = Math.max(widest[index] ?? 0, angle);
      });
    }
    return widest;
  }, milliseconds);

// Whether, as they swing, any phone leaves the screen or meets the next along its row. Each is
// measured along its own middle, because a tilted phone's box is wider than the phone.
const swingTrouble = (page: Page, milliseconds: number) =>
  page.evaluate(async (length) => {
    const phones = [...document.querySelectorAll<HTMLElement>('[data-stop] figure')];
    const hits = new Set<string>();
    const start = performance.now();
    while (performance.now() - start < length) {
      await new Promise((frame) => window.requestAnimationFrame(frame));
      const spots = phones.map((phone) => {
        const { left, right, top, bottom } = phone.getBoundingClientRect();
        return { x: (left + right) / 2, y: (top + bottom) / 2, half: phone.offsetWidth / 2 };
      });
      spots.forEach(({ x, y, half }, index) => {
        if (x - half < -2 || x + half > window.innerWidth + 2) hits.add(`Off screen: ${index}`);
        const next = spots[index + 1];
        if (!next || Math.abs(next.y - y) > half) return;
        if (x + half > next.x - next.half + 2) hits.add(`Phones meet: ${index}`);
      });
    }
    return [...hits];
  }, milliseconds);

const pushStop = async (page: Page, isMobile: boolean, index: number) => {
  const box = await page.locator('[data-stop]').nth(index).boundingBox();
  if (!box) throw new Error('No stop');
  if (isMobile) {
    await page.touchscreen.tap(box.x + 8, box.y + box.height / 2);
    return;
  }
  await page.mouse.move(box.x - 20, box.y + box.height / 2);
  await page.mouse.move(box.x + box.width + 20, box.y + box.height / 2, { steps: 5 });
};

test('each stop hangs from a vine, sways by itself, and swings when pushed', async ({
  page,
  isMobile,
}) => {
  test.setTimeout(30000);
  await page.goto('/');
  await landKip(page);
  const first = page.locator('[data-stop]').first();
  await expect
    .poll(() => first.evaluate((stop) => getComputedStyle(stop, '::before').backgroundImage))
    .toMatch(/^url\(/);
  // Long enough for the landing to die away, leaving the sway.
  await page.waitForTimeout(6500);
  const idle = await swings(page, 3200);
  for (const angle of idle) {
    expect(angle).toBeGreaterThan(0.02);
    expect(angle).toBeLessThan(2);
  }
  await pushStop(page, isMobile, 1);
  const pushed = await swings(page, 1200);
  expect(pushed[1]).toBeGreaterThan((idle[1] ?? 0) * 1.5);
  expect(pushed[1]).toBeGreaterThan(0.5);
  for (const angle of pushed) expect(angle).toBeLessThan(6.5);
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
  // It dies away again.
  await page.waitForTimeout(6000);
  const after = await swings(page, 1500);
  expect(after[1]).toBeLessThan(pushed[1] ?? 0);
});

// Where the first stop has swung to, a fixed time after landing, on a clock that only moves when told
// to, with a new frame every `frame` milliseconds. Nothing else can differ between two of these.
const swungAfter = async (page: Page, frame: number) => {
  await page.clock.install({ time: 0 });
  await page.clock.pauseAt(1000);
  await page.goto('/');
  await jumpTo(page, '#parkdex');
  await page.locator('.pk-plant').click();
  await page.clock.runFor(4000);
  await expect(page.locator('#parkdex')).toHaveAttribute('data-landed', '');
  await page.waitForTimeout(300);
  // Only from here: Kip's ride lands on a frame too, so slowing it would move the landing.
  await page.evaluate((length) => {
    window.requestAnimationFrame = (draw) =>
      window.setTimeout(() => {
        draw(performance.now());
      }, length);
  }, frame);
  await page.clock.runFor(3000);
  return page
    .locator('[data-stop]')
    .first()
    .evaluate((stop: HTMLElement) => Number.parseFloat(stop.style.rotate));
};

test('a stop swings the same however few frames it gets', async ({
  browser,
  baseURL,
  isMobile,
}) => {
  test.skip(isMobile, 'The clock is the same on a phone.');
  test.setTimeout(40000);
  const [smooth, rough] = await Promise.all(
    [16, 120].map(async (frame) =>
      swungAfter(await browser.newPage({ baseURL: baseURL ?? '' }), frame),
    ),
  );
  expect(smooth).not.toBe(0);
  expect(Math.abs((smooth ?? 0) - (rough ?? 0))).toBeLessThan(0.1);
});

test('swinging stays clear of the screen and of its neighbours at every push', async ({
  page,
  isMobile,
}) => {
  test.setTimeout(30000);
  await page.goto('/');
  await landKip(page);
  // Once they have all dropped in.
  await page.waitForTimeout(2000);
  for (const index of [0, 3, 1, 2]) await pushStop(page, isMobile, index);
  expect(await swingTrouble(page, 2500)).toEqual([]);
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
});

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
  await expect(page.locator('[data-waiting]')).toHaveCount(5);
});

test('the keyboard goes from one closed scene to the next', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Keyboard navigation is a desktop journey.');
  await page.goto('/');
  await page.locator('.abn-key').focus();
  for (const control of ['.rope', '.pk-plant', '.sb-box__open', '.tp-tap']) {
    await page.keyboard.press('Tab');
    await expect(page.locator(control)).toBeFocused();
  }
  await expect(page.locator('[data-waiting]')).toHaveCount(5);
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

test('the opened Offbooked screen keeps the title, the spotlights, the steps and one link', async ({
  page,
}) => {
  await page.goto('/');
  await useControl(page, '#offbooked', '.rope');
  await expect(page.locator('.ticket')).toHaveCSS('opacity', '1', { timeout: 12000 });
  await expect(page.locator('#offbooked a')).toHaveCount(1);
  await expect
    .poll(() => page.locator('.beam--left').evaluate((e) => Number(getComputedStyle(e).opacity)))
    .toBeGreaterThan(0.5);
  await expect(
    page.locator('.voices, .handset, .stamp, .marquee, .script, .slab, .tape, .bubble'),
  ).toHaveCount(0);
});

test('the Offbooked ad does not follow the pointer', async ({ page, isMobile }) => {
  test.skip(isMobile, 'There is no pointer to follow.');
  await page.goto('/');
  await useControl(page, '#offbooked', '.rope');
  const phone = page.locator('#offbooked .step__picture').first();
  await stepsFit(page, '#offbooked', 'Offbooked');
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
  const beam = page.locator('.beam--left');
  const running = () =>
    beam.evaluate((element) =>
      element.getAnimations().some((animation) => animation.playState === 'running'),
    );
  await expect.poll(running).toBe(true);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await expect(page.locator('#offbooked')).toHaveAttribute('data-resting', '');
  await expect.poll(running).toBe(false);
});

test('the ticket is one link to the show', async ({ page }) => {
  await page.goto('/');
  const ticket = page.locator('.ticket');
  await expect(ticket).toHaveAttribute('href', 'https://offbooked.com/');
  await expect(ticket).toContainText('Free in public beta');
  await expect(ticket).toContainText('offbooked.com');
});

test('the Offbooked ticket can be clicked once it lands', async ({ page }) => {
  await page.goto('/');
  await useControl(page, '#offbooked', '.rope');
  const ticket = page.locator('.ticket');
  await expect(ticket).toHaveCSS('opacity', '1', { timeout: 12000 });
  await expect.poll(() => uncoveredPoints(ticket)).toBe(9);
});

const everySize = [
  [1280, 720],
  [1366, 625],
  [320, 480],
  [320, 568],
  [320, 640],
  [390, 844],
  [568, 320],
  [667, 375],
  [600, 1024],
  [760, 760],
  [844, 390],
  [860, 860],
  [1000, 500],
  [1024, 768],
  [1440, 900],
  [1920, 480],
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
    await stepsFit(page, '#offbooked', `${width}x${height}`);
    expect(await horizontalOverflow(page), `${width}x${height}`).toBeLessThanOrEqual(0);
  }
});

test('the steps open out of the cursor', async ({ page }) => {
  await page.goto('/');
  await jumpTo(page, '.abn-cover');
  const cta = page.locator('.abn-show__cta');
  await expect.poll(() => uncoveredPoints(cta)).toBe(0);
  await page.locator('.abn-key').click();
  await expect.poll(() => uncoveredPoints(cta)).toBeGreaterThanOrEqual(8);
});

test('Enter opens onto one simple screen', async ({ page }) => {
  await page.goto('/');
  await useControl(page, '.abn-cover', '.abn-key');
  await expect(page.locator('.abn-show__lead')).toBeInViewport({ ratio: 1, timeout: 4000 });
  await expect(page.locator('.abn-show__lead')).toContainText('I co-run it and built the site.');
  await expect(page.locator('.abn-strip, .abn-browser, .abn-phone, .abn-stars')).toHaveCount(0);
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
  await louder(() => useControl(page, '.tp', '.tp-tap'));
  expect((await heard(page)).contexts).toBe(1);
  expect(errors).toEqual([]);
});

test('the rainbow scratches across on paper, with no note in it', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', noWebAudio);
  await listenForThocc(page);
  await page.goto('/');
  await useControl(page, '.sb-open', '.sb-box__open');
  await expect.poll(() => heard(page).then(({ noises }) => noises)).toBeGreaterThan(7);
  // The lid's one low thud is the only oscillator in the whole press.
  expect((await heard(page)).tones).toBe(1);
});

test('pulling the rope sounds the curtains as well as clicking it', async ({
  page,
  isMobile,
  browserName,
}) => {
  test.skip(isMobile, 'The drag uses the mouse; touch shares its pointer events.');
  test.skip(browserName === 'webkit', noWebAudio);
  await listenForThocc(page);
  await page.goto('/');
  await jumpTo(page, '#offbooked');
  const tassel = await page.locator('.rope__tassel').boundingBox();
  if (!tassel) throw new Error('The rope has no tassel');
  const x = tassel.x + tassel.width / 2;
  const y = tassel.y + tassel.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + 90, { steps: 6 });
  await expect(page.locator('#offbooked')).toHaveAttribute('data-open', '');
  await page.mouse.up();
  await expect.poll(() => heard(page).then(({ noises }) => noises)).toBeGreaterThan(0);
  expect((await heard(page)).contexts).toBe(1);
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
  await useControl(page, '.tp', '.tp-tap');
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

  // The page comes along. Kip drops in from above the screen, and stays on it from then on.
  const height = page.viewportSize()?.height ?? 0;
  let entered = false;
  for (let sample = 0; sample < 8; sample += 1) {
    await page.waitForTimeout(250);
    if (!(await diver.isVisible())) break;
    const box = await diver.boundingBox();
    const top = box?.y ?? 9999;
    expect(top).toBeLessThan(height);
    const showing = top + (box?.height ?? 0) > 0;
    if (entered) expect(showing).toBe(true);
    entered ||= showing;
  }
  expect(entered).toBe(true);
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

for (const scene of ['#offbooked', '#play-by-the-sandbox', '#not-quite-my-tempo', '#go']) {
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
  await expect(scenes).toHaveCount(5);
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

test('the Sandbox screen keeps the steps and its link, with nothing around them', async ({
  page,
}) => {
  await page.goto('/');
  await useControl(page, '.sb-open', '.sb-box__open');
  await expect(page.locator('.sb-open a')).toHaveCount(1);
  await expect(page.locator('.sb-panels, .sb-lot, .sb__yard-title, [data-toy]')).toHaveCount(0);
  await expect(page.locator('img[src*="wordmark"], img[src*="panel-"]')).toHaveCount(0);
  await expect(page.locator('.sb-open')).not.toContainText('grab a toy');
});

// Lands a press at a point in the ring's beat, which is 625 milliseconds long. A real press can't be
// timed this closely from out here, so this moves the ring to meet it.
const pressAt = (page: Page, through: number, type: 'pointerdown' | 'keydown' | 'click') =>
  page.locator('[data-beat]').evaluate(
    (ring, [at, kind]) => {
      const beat = ring.getAnimations()[0];
      const control = ring.closest('button');
      if (!beat || !control) throw new Error('The ring is not running');
      beat.startTime = performance.now() - 625 * 3 - Number(at);
      if (kind === 'pointerdown') control.dispatchEvent(new PointerEvent(kind, { bubbles: true }));
      if (kind === 'keydown') control.dispatchEvent(new KeyboardEvent(kind, { key: ' ' }));
      if (kind === 'click') control.click();
    },
    [through, type] as const,
  );

const letGo = (page: Page) =>
  page.locator('.tp-tap').evaluate((control: HTMLElement) => {
    control.click();
  });

for (const [through, word] of [
  [5, 'Perfect'],
  [70, 'Good'],
  [200, 'Dragging'],
  [425, 'Rushing'],
  [555, 'Good'],
  [600, 'Perfect'],
] as const) {
  test(`a press ${through}ms into the beat is called ${word}, and opens it either way`, async ({
    page,
  }) => {
    await page.goto('/');
    await jumpTo(page, '.tp');
    await pressAt(page, through, 'pointerdown');
    await letGo(page);
    await expect(page.locator('.tp')).toHaveAttribute('data-open', '');
    await expect(page.locator('[data-verdict]')).toHaveText(word);
    await expect(page.locator('[data-verdict-by]')).toHaveText(/^[+-]?\d+ ms$/);
  });
}

for (const type of ['pointerdown', 'keydown'] as const) {
  test(`a ${type} counts from when it lands, not from the click that follows it`, async ({
    page,
  }) => {
    await page.goto('/');
    await jumpTo(page, '.tp');
    await pressAt(page, 5, type);
    await page.waitForTimeout(250);
    await letGo(page);
    await expect(page.locator('[data-verdict]')).toHaveText('Perfect');
  });
}

test('a press with no pointer or key behind it is judged on the click', async ({ page }) => {
  await page.goto('/');
  await jumpTo(page, '.tp');
  await pressAt(page, 200, 'click');
  await expect(page.locator('[data-verdict]')).toHaveText('Dragging');
});

test('a mouse press dragged off the ring is forgotten', async ({ page, isMobile }) => {
  test.skip(isMobile, 'This is a mouse journey.');
  await page.goto('/');
  await jumpTo(page, '.tp');
  await pressAt(page, 5, 'pointerdown');
  await page.evaluate(() =>
    document.body.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })),
  );
  await pressAt(page, 200, 'click');
  await expect(page.locator('[data-verdict]')).toHaveText('Dragging');
});

test('a finger that scrolls away from the ring is forgotten', async ({ page }) => {
  await page.goto('/');
  await jumpTo(page, '.tp');
  await pressAt(page, 5, 'pointerdown');
  await page
    .locator('.tp-tap')
    .evaluate((control) => control.dispatchEvent(new PointerEvent('pointercancel')));
  await pressAt(page, 200, 'click');
  await expect(page.locator('[data-verdict]')).toHaveText('Dragging');
});

test('a right-click on the ring is not a press', async ({ page }) => {
  await page.goto('/');
  await jumpTo(page, '.tp');
  await page.locator('[data-beat]').evaluate((ring) => {
    const beat = ring.getAnimations()[0];
    if (beat) beat.startTime = performance.now() - 625 * 3 - 5;
    ring
      .closest('button')
      ?.dispatchEvent(new PointerEvent('pointerdown', { button: 2, bubbles: true }));
  });
  await pressAt(page, 200, 'click');
  await expect(page.locator('[data-verdict]')).toHaveText('Dragging');
});

test('a press while the ring is resting gets no word it did not earn', async ({ page }) => {
  await page.goto('/');
  await jumpTo(page, '.tp');
  await page.locator('[data-beat]').evaluate(async (ring) => {
    const beat = ring.getAnimations()[0];
    beat?.pause();
    await beat?.ready;
  });
  await letGo(page);
  await expect(page.locator('.tp')).toHaveAttribute('data-open', '');
  await expect(page.locator('[data-verdict]')).toHaveText('');
});

test('a second tap on the ring stays on the ring while the screen clears', async ({ page }) => {
  await page.goto('/');
  await jumpTo(page, '.tp');
  await page.locator('.tp-tap').evaluate((control: HTMLElement) => {
    const { left, top, width, height } = control.getBoundingClientRect();
    control.click();
    const here = document.elementFromPoint(left + width / 2, top + height / 2);
    if (!here?.closest('.tp-closed')) throw new Error('The press went through to the page');
    if (here.closest('.tp-tap')) throw new Error('The ring is gone but still takes presses');
  });
});

test('a real press gets a word', async ({ page }) => {
  await page.goto('/');
  await useControl(page, '.tp', '.tp-tap');
  await expect(page.locator('[data-verdict]')).toHaveText(/^(Perfect|Good|Rushing|Dragging)$/);
});

test('the closed Tempo screen is silent, and its beat only runs on screen', async ({
  page,
  browserName,
}) => {
  test.skip(browserName === 'webkit', noWebAudio);
  await listenForThocc(page);
  await page.goto('/');
  await expect(page.locator('.tp')).toHaveAttribute('data-resting', '');
  await jumpTo(page, '.tp');
  await expect(page.locator('.tp')).not.toHaveAttribute('data-resting', '');
  await page.waitForTimeout(1500);
  expect(await heard(page)).toEqual({ contexts: 0, tones: 0, noises: 0 });
});

test('the verdict clears, and leaves one window on the room, one line and one link', async ({
  page,
}) => {
  await catchSite(page, TEMPO);
  await page.goto('/');
  await useControl(page, '.tp', '.tp-tap');
  await expect(page.locator('.tp-closed')).toBeHidden({ timeout: 3000 });
  await expect(page.locator('.tp [data-step], .tp details, .tp .steps-window')).toHaveCount(0);
  await expect(page.locator('.tp a')).toHaveCount(2);
  await expect(page.locator('.tp__cta')).toHaveAttribute('href', TEMPO);
  await expect(page.locator('.tp__cta')).toHaveText('Play it →');
  await expect(page.locator('.tp__head p')).toHaveText(
    'A four-minute rhythm horror game. Try it yourself.',
  );
  const frame = page.locator('.tp-window');
  await expect(frame).toHaveAttribute('href', TEMPO);
  await expect(frame).toHaveAccessibleName('Play Not Quite My Tempo');
  await frame.click();
  await expect(page).toHaveURL(TEMPO);
});

test('the game keeps its surprises', async ({ page }) => {
  await page.goto('/');
  await useControl(page, '.tp', '.tp-tap');
  await expect(page.locator('.tp-closed')).toBeHidden({ timeout: 3000 });
  const words = await page
    .locator('.tp')
    .evaluate((scene) =>
      [
        scene.textContent,
        ...[...scene.querySelectorAll('[alt], [aria-label]')].flatMap((element) => [
          element.getAttribute('alt'),
          element.getAttribute('aria-label'),
        ]),
        document.querySelector('meta[name="description"]')?.getAttribute('content'),
      ].join(' '),
    );
  expect(words).not.toMatch(/\b(duck|chair|endings?|the nod|fifth name)\b/i);
  await expect(page.locator('[data-wash]', { hasText: 'Not Quite' })).toHaveAttribute(
    'style',
    /tempo-900/,
  );
  await expect(page.locator('.tp img[src*="chair"], .tp img[src*="ending"]')).toHaveCount(0);
});

test('the keyboard reaches the game only once the section is open', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Keyboard navigation is a desktop journey.');
  await page.goto('/');
  await jumpTo(page, '.tp');
  await expect(page.locator('.tp-window')).toHaveJSProperty('inert', true);
  await page.locator('.tp-tap').press('Enter');
  await expect(page.locator('.tp-window')).toHaveJSProperty('inert', false);
});

test('the Tempo loop plays muted, and rests off screen', async ({ page, isMobile }) => {
  await page.goto('/');
  await useControl(page, '.tp', '.tp-tap');
  const video = page.locator('.tp-window video');
  await expect(video).toHaveJSProperty('muted', true);
  await expect(video).toHaveJSProperty('loop', true);
  await expect(video).toHaveAttribute('playsinline', '');
  await expect(video).toHaveJSProperty('paused', false, { timeout: 8000 });
  const size = () =>
    video.evaluate((element) => {
      const { videoWidth, videoHeight } = element as HTMLVideoElement;
      return videoWidth > videoHeight;
    });
  expect(await size()).toBe(!isMobile);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await expect(video).toHaveJSProperty('paused', true);
});

test('the Tempo loop stays unloaded behind a closed screen', async ({ page }) => {
  const asked: string[] = [];
  page.on('request', (request) => asked.push(request.url()));
  await page.goto('/');
  await jumpTo(page, '.tp');
  await page.waitForTimeout(800);
  expect(asked.filter((url) => url.includes('.mp4'))).toEqual([]);
  await page.locator('.tp-tap').click();
  await expect.poll(() => asked.filter((url) => url.includes('.mp4')).length).toBe(1);
});

test('the window says it is a link when the mouse comes onto it', async ({ page, isMobile }) => {
  test.skip(isMobile, 'There is no hover here.');
  await page.goto('/');
  await useControl(page, '.tp', '.tp-tap');
  await expect(page.locator('.tp-closed')).toBeHidden({ timeout: 3000 });
  const cue = page.locator('.tp-window__go');
  await page.mouse.move(2, 2);
  await expect(cue).toHaveCSS('opacity', '0');
  await page.locator('.tp-window').hover();
  await expect(cue).toHaveCSS('opacity', '1');
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

test('a filled row keeps its host off the picture', async ({ page, isMobile }) => {
  test.skip(isMobile, 'On a phone the host sits under the name, and has its own test.');
  await page.goto('/');
  const row = page.locator('[data-wash]').first();
  const host = row.locator('.wash-list__host');
  await row.scrollIntoViewIfNeeded();
  await page.mouse.move(0, 0);
  await expect(host).toHaveCSS('opacity', '1');
  await row.hover();
  await expect(host).toHaveCSS('opacity', '0');
  await page.mouse.move(0, 0);
  await expect(host).toHaveCSS('opacity', '1');
});

test('on a phone, a filled row keeps its host legible under the name', async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, 'Desktop has its own test.');
  await page.goto('/');
  const row = page.locator('[data-wash]').nth(1);
  await row.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    window.scrollTo({
      top: rect.top + window.scrollY - window.innerHeight / 2 + rect.height / 2,
      behavior: 'instant',
    });
  });
  await expect(row).toHaveAttribute('data-active');
  await expect(row.locator('.wash-list__host')).toHaveCSS('opacity', '1');
});

// Where a row's picture ends, from the same offset the row draws it with.
const pictureEnd = (row: Locator) =>
  row.evaluate((element) => {
    const { right } = element.getBoundingClientRect();
    const offset = getComputedStyle(element, '::before').backgroundPositionX.split(',')[2];
    return right - Number(/100% - ([\d.]+)px/.exec(offset ?? '')?.[1]);
  });

// Where each row's subject starts across its picture: the key, the phones, Kip, the marquee, the
// band.
const subjects = [0.59, 0.485, 0.55, 0.466, 0.69];

// Where a row's subject starts on screen, and where its name, host and arrow end.
const rowEdges = (row: Locator, subject: number) =>
  row.evaluate((element, at) => {
    const { right, height } = element.getBoundingClientRect();
    const offset = getComputedStyle(element, '::before').backgroundPositionX.split(',')[2];
    const past = Number(/100% \+ ([\d.]+)px/.exec(offset ?? '')?.[1]);
    const wide = (height * 900) / 280;
    const range = document.createRange();
    range.selectNodeContents(element.querySelector('.wash-list__name') as Element);
    return {
      subject: right + past - wide + wide * at,
      name: range.getBoundingClientRect().right,
      arrow: element.querySelector('svg')?.getBoundingClientRect().right ?? Infinity,
      hostRight: element.querySelector('.wash-list__host')?.getBoundingClientRect().right ?? 0,
      arrowLeft: element.querySelector('svg')?.getBoundingClientRect().left ?? 0,
    };
  }, subject);

for (const width of [320, 360, 390, 412, 445, 640]) {
  test(`at ${width}px an index row keeps its name and arrow off its subject`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/');
    for (const [index, row] of (await page.locator('[data-wash]').all()).entries()) {
      const edges = await rowEdges(row, subjects[index] ?? 0);
      expect(edges.name, `name of row ${index}`).toBeLessThanOrEqual(edges.subject);
      expect(edges.arrow, `arrow of row ${index}`).toBeLessThanOrEqual(edges.subject);
      expect(edges.arrowLeft).toBeGreaterThanOrEqual(edges.hostRight);
    }
  });
}

for (const width of [641, 768, 1024, 1440]) {
  test(`at ${width}px an index row's picture stops short of its arrow`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/');
    for (const row of await page.locator('[data-wash]').all()) {
      const arrow = await row.locator('svg').boundingBox();
      expect(await pictureEnd(row)).toBeLessThanOrEqual(arrow?.x ?? 0);
    }
  });
}

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
  test(`every frame fits at ${width}x${height}`, async ({ page, isMobile }) => {
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
    for (const part of ['.abn-show__lead', '.abn-show__cta']) {
      await expect(page.locator(part), part).toBeInViewport({ ratio: 1, timeout: 4000 });
    }
    await stepsFit(page, '.abn-cover', `AI Build Night at ${width}x${height}`);

    await landKip(page);
    // Just under 1, because a fractional phone size can leave a millionth of one off screen.
    for (const stop of await page.locator('[data-stop]').all()) {
      await expect(stop).toBeInViewport({ ratio: 0.995, timeout: 4000 });
    }
    await expect(page.locator('.pk-slide')).toBeInViewport({ ratio: 1 });
    await expect.poll(() => uncoveredPoints(page.locator('.pk-slide'))).toBe(9);
    // Measured at rest: a tilted box is wider than what's in it. Swinging is measured after.
    const still = await page.addStyleTag({
      content: '[data-stop], [data-stop] figure { rotate: none !important; }',
    });
    await stepsFit(page, '.pk-forest', `Parkdex at ${width}x${height}`);
    await still.evaluate((tag) => (tag as HTMLElement).remove());
    await page.waitForTimeout(1200);
    await pushStop(page, !!isMobile, 1);
    expect(await swingTrouble(page, 1000), `${width}x${height}`).toEqual([]);
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);

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
    await expect(page.locator('.sb__cta')).toBeInViewport({ ratio: 0.95 });
    await stepsFit(page, '.sb-open', `Sandbox at ${width}x${height}`);

    await jumpTo(page, '.tp');
    const closed = ['.tp-closed__name', '.tp-tap', '.tp-closed__hint', '.tp-count'];
    for (const part of closed) {
      await expect(page.locator(part), part).toBeInViewport({ ratio: 1 });
    }
    const boxes = await Promise.all(closed.map((part) => page.locator(part).boundingBox()));
    for (const [index, box] of boxes.entries()) {
      for (const other of boxes.slice(index + 1)) {
        if (!box || !other) throw new Error('A closed part has no box');
        const apart =
          other.x >= box.x + box.width ||
          box.x >= other.x + other.width ||
          other.y >= box.y + box.height ||
          box.y >= other.y + other.height;
        expect(apart, `${closed[index]} at ${width}x${height}`).toBe(true);
      }
    }
    await useControl(page, '.tp', '.tp-tap');
    await expect(page.locator('.tp-closed')).toBeHidden({ timeout: 3000 });
    const opened = ['#tp-title', '.tp__cta', '.tp-window'];
    for (const part of opened) {
      await expect(page.locator(part), part).toBeInViewport({ ratio: 1 });
    }
    const [name, link, frame] = await Promise.all(
      opened.map((part) => page.locator(part).boundingBox()),
    );
    if (!name || !link || !frame) throw new Error('An opened part has no box');
    expect(link.x, `${width}x${height}`).toBeGreaterThanOrEqual(name.x + name.width - 1);
    expect(frame.y, `${width}x${height}`).toBeGreaterThanOrEqual(name.y + name.height - 1);
    expect(frame.y, `${width}x${height}`).toBeGreaterThanOrEqual(link.y + link.height - 1);
    expect(frame.height, `${width}x${height}`).toBeGreaterThan(height * 0.4);
    const tagline = page.locator('.tp__head p');
    if (await tagline.isVisible()) {
      const words = await tagline.boundingBox();
      if (!words) throw new Error('The line has no box');
      expect(words.y + words.height, `${width}x${height}`).toBeLessThanOrEqual(frame.y + 1);
      expect(words.x + words.width, `${width}x${height}`).toBeLessThanOrEqual(link.x + 1);
    }
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
    await expect(page.locator('.tp-closed')).toBeHidden();
    await expect(page.locator('.tp__cta')).toBeVisible();
    // The still, and still the way in. Nothing plays.
    const frame = page.locator('.tp-window');
    await expect(frame).toHaveAttribute('href', TEMPO);
    await frame.scrollIntoViewIfNeeded();
    await expect(frame.locator('img')).toBeVisible();
    await expect
      .poll(() =>
        frame.locator('img').evaluate((image) => (image as HTMLImageElement).naturalWidth),
      )
      .toBeGreaterThan(0);
    await expect(frame.locator('video')).not.toHaveAttribute('src', /./);
    // The stops hang from their vines, and stay put.
    await expect(page.locator('[data-stop]').first()).toHaveCSS('rotate', 'none');
    await expect(page.locator('.ticket')).toHaveCSS('opacity', '1');
    for (const step of await page.locator('.step').all()) {
      await expect(step).toHaveCSS('opacity', '1');
    }
    // Rotating here means a list to pick from: it never moves on by itself.
    const steps = page.locator('[data-steps="abn"]');
    await expect(steps).toHaveAttribute('data-layout', 'rotating');
    await expect(steps.locator('[data-step]')).toHaveCount(4);
    expect(await counting(steps)).toBe('none');
    await steps.locator('.step__pick').nth(1).click();
    await expect.poll(() => showing(steps)).toBe(1);
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
  await expect(page.locator('#tp-title')).toBeVisible();
  await expect(page.locator('.tp-closed')).toBeHidden();
  for (const step of await page.locator('.step').all()) {
    expect(await opacityOf(step)).toBe(1);
  }
  // Every step keeps its own picture, in the order they were written.
  await expect(page.locator('[data-step] figure')).toHaveCount(15);
  await expect(page.locator('[data-steps-window]:visible')).toHaveCount(0);
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
  for (const step of await page.locator('.step').all()) {
    expect(await opacityOf(step)).toBe(1);
  }
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('every world and link is still there', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('a[href="https://offbooked.com/"]').first()).toBeAttached();
    await page.locator('.wash-list').scrollIntoViewIfNeeded();
    await expect(page.locator('.wash-list li').first()).toBeVisible();
    for (const link of await page.locator('.pk-end a').all()) await expect(link).toBeVisible();
    await page.locator('#ob-title').scrollIntoViewIfNeeded();
    for (const part of await page.locator('#ob-title > *').all()) {
      expect(await opacityOf(part)).toBe(1);
    }
    expect(await opacityOf(page.locator('.ticket'))).toBe(1);
    for (const step of await page.locator('.step').all()) {
      expect(await opacityOf(step)).toBe(1);
    }
    await expect(page.locator('.drape').first()).toBeHidden();
    await expect(page.locator('.wipe')).toBeHidden();
    await expect(page.locator('.tp-closed')).toBeHidden();
    await expect(page.locator('.tp__cta')).toBeVisible();
    await expect(page.locator('.tp-window')).toHaveAttribute('href', TEMPO);
    await page.locator('.tp-window').scrollIntoViewIfNeeded();
    await expect(page.locator('.tp-window img')).toBeVisible();
    await expect(page.locator('.tp-window video')).not.toHaveAttribute('src', /./);
    await expect(page.locator('[data-moment-control]:visible')).toHaveCount(0);
  });
});

test('unknown routes serve the 404 page', async ({ page }) => {
  const response = await page.goto('/this-route-does-not-exist/');
  expect(response?.status()).toBe(404);
  await expect(page.locator('h1')).toHaveText('Nobody here.');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
});
