// How a section lays out its steps: side by side, or one main window rotating through them while the
// whole list stays on screen. The markup is the side-by-side layout, so that is what shows if this
// script never runs. The toggle between the two is a review tool: `?offbooked=rotating` links straight
// to one, and it only exists on staging and local builds. See OPERATIONS.md for how to settle on one.

import { reducedMotion } from './motion';

type Layout = 'side' | 'rotating';

const REVIEW_HOSTS = ['staging.nathanpannell.com', 'localhost', '127.0.0.1'];

// How long each step stays up, in milliseconds: enough to read the longest line and take in its
// picture.
const DWELL = 6000;
// The beat an opening gets before the first step starts counting.
const SETTLE = 1600;
// How long the mouse has to stay on a step to pick it, so that passing over one doesn't.
const HOVER = 120;

const NEXT_KEYS = new Set(['ArrowDown', 'ArrowRight']);
const LAST_KEYS = new Set(['ArrowUp', 'ArrowLeft']);

const asLayout = (value: string | null | undefined): Layout | undefined =>
  value === 'side' || value === 'rotating' ? value : undefined;

const startSet = (set: HTMLElement, review: boolean, onChoose: () => void) => {
  const rows = Array.from(set.querySelectorAll<HTMLElement>('[data-step]'));
  const list = set.querySelector<HTMLElement>('[data-steps-list]');
  const frame = set.querySelector<HTMLElement>('[data-steps-window]');
  const view = set.querySelector<HTMLElement>('[data-steps-view]');
  if (!list || !frame || !view) return;
  const scene = set.closest<HTMLElement>('[data-moment]');
  const toggle = set.querySelector<HTMLElement>('[data-steps-toggle]');
  const choices = Array.from(set.querySelectorAll<HTMLButtonElement>('[data-layout-pick]'));

  const steps = rows.map((row) => ({
    row,
    title: row.querySelector('h3') as HTMLElement,
    picture: row.querySelector('figure') as HTMLElement,
    pick: document.createElement('button'),
  }));

  const held = new Set<string>();
  let count: Animation | undefined;
  let layout: Layout = 'side';
  let now = 0;
  let opened = !scene?.hasAttribute('data-waiting');
  let picked = false;

  const show = (index: number) => {
    now = index;
    set.style.setProperty('--now', String(index));
    steps.forEach(({ row, picture, pick }, at) => {
      row.toggleAttribute('data-current', at === index);
      picture.toggleAttribute('data-current', at === index);
      if (at === index) pick.setAttribute('aria-current', 'step');
      else pick.removeAttribute('aria-current');
    });
  };

  // The count is an animation, not a timer, so that it can pause mid-step and sections can draw it.
  const countDown = (delay = 0) => {
    count?.cancel();
    count = undefined;
    if (layout !== 'rotating' || !opened || picked || reducedMotion()) return;
    count = set.animate({ '--progress': [0, 1] }, { duration: DWELL, delay, fill: 'backwards' });
    count.onfinish = () => {
      show((now + 1) % steps.length);
      countDown();
    };
    if (held.size > 0) count.pause();
  };

  const hold = (reason: string, on: boolean) => {
    if (on) held.add(reason);
    else held.delete(reason);
    if (held.size > 0) count?.pause();
    else count?.play();
  };

  const pickStep = (index: number) => {
    picked = true;
    view.setAttribute('aria-live', 'polite');
    countDown();
    show(index);
  };

  const setLayout = (next: Layout) => {
    layout = next;
    set.dataset['layout'] = next;
    frame.hidden = next !== 'rotating';
    for (const { row, title, picture, pick } of steps) {
      if (next === 'rotating') {
        view.append(picture);
        pick.append(...title.childNodes);
        title.append(pick);
      } else if (title.contains(pick)) {
        row.append(picture);
        title.replaceChildren(...pick.childNodes);
      }
    }
    for (const choice of choices) {
      choice.setAttribute('aria-pressed', String(choice.dataset['layoutPick'] === next));
    }
    picked = false;
    view.setAttribute('aria-live', 'off');
    show(0);
    countDown();
  };

  steps.forEach(({ row, pick }, index) => {
    pick.type = 'button';
    pick.className = 'step__pick';
    pick.addEventListener('click', () => pickStep(index));
    let timer = 0;
    // Movement, not arrival: the mouse that pressed a section's control may be resting right here.
    row.addEventListener('pointermove', (event) => {
      if (event.pointerType !== 'mouse' || layout !== 'rotating' || picked) return;
      if (event.movementX === 0 && event.movementY === 0) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => pickStep(index), HOVER);
    });
    row.addEventListener('pointerleave', () => window.clearTimeout(timer));
  });

  for (const part of [list, frame]) {
    part.addEventListener('pointermove', (event) => {
      if (event.pointerType !== 'mouse') return;
      if (event.movementX !== 0 || event.movementY !== 0) hold('hover', true);
    });
    part.addEventListener('pointerleave', () => hold('hover', false));
  }

  list.addEventListener('focusin', () => hold('focus', true));
  list.addEventListener('focusout', (event) => {
    if (!list.contains(event.relatedTarget as Node | null)) hold('focus', false);
  });
  list.addEventListener('keydown', (event) => {
    const move = NEXT_KEYS.has(event.key) ? 1 : LAST_KEYS.has(event.key) ? -1 : 0;
    if (move === 0 || layout !== 'rotating') return;
    event.preventDefault();
    const index = (now + move + steps.length) % steps.length;
    pickStep(index);
    steps[index]?.pick.focus();
  });

  // Off screen, nothing counts. The rotation itself never asks where the page is.
  new IntersectionObserver(([entry]) => hold('away', !entry?.isIntersecting), {
    threshold: 0.25,
  }).observe(frame);

  const startOn = set.dataset['startOn'] ?? 'moment:open';
  scene?.addEventListener(
    startOn,
    () => {
      opened = true;
      countDown(SETTLE);
    },
    { once: true },
  );

  if (review && toggle) {
    toggle.hidden = false;
    for (const choice of choices) {
      choice.addEventListener('click', () => {
        const next = asLayout(choice.dataset['layoutPick']);
        if (!next || next === layout) return;
        setLayout(next);
        onChoose();
      });
    }
  }

  const name = set.dataset['steps'] ?? '';
  const asked = review
    ? asLayout(new URLSearchParams(window.location.search).get(name))
    : undefined;
  setLayout(asked ?? asLayout(set.dataset['layoutDefault']) ?? 'side');
};

export const startSteps = () => {
  const review = REVIEW_HOSTS.includes(window.location.hostname);
  const sets = Array.from(document.querySelectorAll<HTMLElement>('[data-steps]'));

  // Every choice goes in the address bar, so whatever is on screen is a link to send.
  const writeLink = () => {
    const url = new URL(window.location.href);
    for (const set of sets) {
      url.searchParams.set(set.dataset['steps'] ?? '', set.dataset['layout'] ?? '');
    }
    window.history.replaceState(window.history.state, '', url);
  };

  sets.forEach((set) => startSet(set, review, writeLink));
};
