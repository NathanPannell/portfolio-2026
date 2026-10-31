// The thing to click in each section: a rope, a key, a flag, a toy box. A `[data-moment]` scene waits
// closed until its `[data-moment-control]` is used, and nothing behind one stays out of reach: it
// also opens by itself after a while on screen, when the page scrolls past it, and when a link
// inside it takes focus. Without this script a scene is simply open, so a failure hides nothing.

import { reducedMotion } from './motion';

// How long a closed scene waits on screen, in milliseconds, before opening itself.
const AUTO_OPEN = 6000;
// How far a rope has to come down before it opens the scene, and as far as it goes, in pixels.
const PULL = 70;
const MOST = 150;

const startPull = (handle: HTMLElement, open: () => void) => {
  let start = -1;
  const setPull = (pixels: number) => handle.style.setProperty('--pull', `${pixels}px`);

  handle.addEventListener('pointerdown', (event) => {
    start = event.clientY;
    handle.setPointerCapture(event.pointerId);
  });
  handle.addEventListener('pointermove', (event) => {
    if (start < 0) return;
    const pull = Math.min(MOST, Math.max(0, event.clientY - start));
    setPull(pull);
    if (pull < PULL) return;
    start = -1;
    open();
  });
  const letGo = () => {
    start = -1;
    setPull(0);
  };
  handle.addEventListener('pointerup', letGo);
  handle.addEventListener('pointercancel', letGo);
};

export const startMoments = () => {
  if (reducedMotion()) return;
  const waiting = new Set<HTMLElement>();
  const timers = new Map<HTMLElement, number>();

  const open = (scene: HTMLElement) => {
    if (!waiting.delete(scene)) return;
    window.clearTimeout(timers.get(scene));
    const control = scene.querySelector<HTMLElement>('[data-moment-control]');
    const focused = control === document.activeElement;
    scene.removeAttribute('data-waiting');
    scene.toggleAttribute('data-open', true);
    control?.setAttribute('aria-expanded', 'true');
    // The control is about to leave, so the next Tab carries on from inside the scene.
    if (focused) scene.focus({ preventScroll: true });
    scene.dispatchEvent(new CustomEvent('moment:open'));
  };

  const scenes = Array.from(document.querySelectorAll<HTMLElement>('[data-moment]'));
  for (const scene of scenes) {
    // Already gone by, on a reload or a jump down the page.
    if (scene.getBoundingClientRect().bottom <= 0) {
      scene.toggleAttribute('data-open', true);
      scene.toggleAttribute('data-settled', true);
      continue;
    }
    waiting.add(scene);
    scene.toggleAttribute('data-waiting', true);
    const control = scene.querySelector<HTMLElement>('[data-moment-control]');
    control?.addEventListener('click', () => open(scene));
    if (control?.hasAttribute('data-pull')) startPull(control, () => open(scene));
    scene.addEventListener('focusin', (event) => {
      if (event.target !== control) open(scene);
    });
  }

  const arrivals = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const scene = entry.target as HTMLElement;
        window.clearTimeout(timers.get(scene));
        if (!entry.isIntersecting) continue;
        timers.set(
          scene,
          window.setTimeout(() => open(scene), AUTO_OPEN),
        );
      }
    },
    { rootMargin: '-50% 0px -50% 0px' },
  );
  waiting.forEach((scene) => arrivals.observe(scene));

  let frame = 0;
  const openWhatIsPast = () => {
    frame = 0;
    for (const scene of waiting) {
      if (scene.getBoundingClientRect().bottom <= 0) open(scene);
    }
    if (waiting.size === 0) window.removeEventListener('scroll', schedule);
  };
  const schedule = () => {
    if (!frame) frame = window.requestAnimationFrame(openWhatIsPast);
  };
  window.addEventListener('scroll', schedule, { passive: true });
};
