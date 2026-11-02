// One main window rotating through a section's pictures while the whole list stays on screen. The
// markup has every step side by side, so that is what shows if this script never runs. Which sections
// rotate is set by `rotates` on `<Steps>`. See OPERATIONS.md.

import { reducedMotion } from './motion';

// How long each step stays up, in milliseconds: enough to read the longest line and take in its
// picture.
const DWELL = 6000;
// The beat an opening gets before the first step starts counting.
const SETTLE = 1600;
// How long the mouse has to stay on a step to pick it, so that passing over one doesn't.
const HOVER = 120;

const NEXT_KEYS = new Set(['ArrowDown', 'ArrowRight']);
const LAST_KEYS = new Set(['ArrowUp', 'ArrowLeft']);

// Whether the mouse itself just moved, rather than the page moving under it. A mouse that pressed a
// section's control is often left resting right where the window appears.
let mouseMoved = false;

const watchTheMouse = () => {
  let x = -1;
  let y = -1;
  const note = ({ clientX, clientY }: PointerEvent) => {
    mouseMoved = clientX !== x || clientY !== y;
    x = clientX;
    y = clientY;
  };
  for (const type of ['pointerdown', 'pointermove'] as const) {
    window.addEventListener(type, note, { capture: true, passive: true });
  }
};

const startSet = (set: HTMLElement) => {
  const rows = Array.from(set.querySelectorAll<HTMLElement>('[data-step]'));
  const list = set.querySelector<HTMLElement>('[data-steps-list]');
  const frame = set.querySelector<HTMLElement>('[data-steps-window]');
  const view = set.querySelector<HTMLElement>('[data-steps-view]');
  if (!list || !frame || !view) return;
  const scene = set.closest<HTMLElement>('[data-moment]');

  const steps = rows.map((row) => ({
    row,
    title: row.querySelector('h3') as HTMLElement,
    picture: row.querySelector('figure') as HTMLElement,
    pick: document.createElement('button'),
  }));

  const held = new Set<string>();
  let count: Animation | undefined;
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
    if (!opened || picked || reducedMotion()) return;
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

  set.dataset['layout'] = 'rotating';
  frame.hidden = false;
  for (const { title, picture, pick } of steps) {
    view.append(picture);
    pick.append(...title.childNodes);
    title.append(pick);
  }
  view.setAttribute('aria-live', 'off');
  show(0);
  countDown();

  steps.forEach(({ row, pick }, index) => {
    pick.type = 'button';
    pick.className = 'step__pick';
    pick.addEventListener('click', () => pickStep(index));
    let timer = 0;
    row.addEventListener('pointermove', (event) => {
      if (event.pointerType !== 'mouse' || !mouseMoved) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => pickStep(index), HOVER);
    });
    row.addEventListener('pointerleave', () => window.clearTimeout(timer));
  });

  for (const part of [list, frame]) {
    part.addEventListener('pointermove', (event) => {
      if (event.pointerType === 'mouse' && mouseMoved) hold('hover', true);
    });
    part.addEventListener('pointerleave', () => hold('hover', false));
  }

  list.addEventListener('focusin', () => hold('focus', true));
  list.addEventListener('focusout', (event) => {
    if (!list.contains(event.relatedTarget as Node | null)) hold('focus', false);
  });
  list.addEventListener('keydown', (event) => {
    const move = NEXT_KEYS.has(event.key) ? 1 : LAST_KEYS.has(event.key) ? -1 : 0;
    if (move === 0) return;
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    event.preventDefault();
    const index = (now + move + steps.length) % steps.length;
    pickStep(index);
    steps[index]?.pick.focus();
  });

  // Off screen, nothing counts. The rotation itself never asks where the page is.
  new IntersectionObserver(([entry]) => hold('away', !entry?.isIntersecting), {
    threshold: 0.25,
  }).observe(frame);

  scene?.addEventListener(
    'moment:open',
    () => {
      opened = true;
      countDown(SETTLE);
    },
    { once: true },
  );
};

export const startSteps = () => {
  watchTheMouse();
  document.querySelectorAll<HTMLElement>('[data-rotates="true"]').forEach(startSet);
};
