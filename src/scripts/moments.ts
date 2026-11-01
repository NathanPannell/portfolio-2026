// The thing to press in each section: a key, a rope, a flag, a toy box. A `[data-moment]` scene stays
// closed until its `[data-moment-control]` is used, and nothing else opens it. What it opens onto is
// marked `[data-opens]` and stays out of reach of the keyboard until then. If this script fails or
// stalls, SiteLayout stands the stages down, and under reduced motion there never is a stage: both
// leave every scene open, as plain page content.

import { reducedMotion } from './motion';

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
  // Keeps the stages SiteLayout set up before the first paint, or brings them back if this script
  // arrived too late for them.
  const root = document.documentElement;
  root.toggleAttribute('data-moments', true);
  root.classList.add('stage');

  const open = (scene: HTMLElement) => {
    if (!scene.hasAttribute('data-waiting')) return;
    const control = scene.querySelector<HTMLElement>('[data-moment-control]');
    const focused = control === document.activeElement;
    scene.removeAttribute('data-waiting');
    scene.toggleAttribute('data-open', true);
    scene.querySelectorAll<HTMLElement>('[data-opens]').forEach((part) => {
      part.inert = false;
    });
    control?.setAttribute('aria-expanded', 'true');
    if (control) control.tabIndex = -1;
    // The control is about to leave, so the next Tab carries on from inside the scene.
    if (focused) scene.focus({ preventScroll: true });
    scene.dispatchEvent(new CustomEvent('moment:open', { bubbles: true }));
  };

  for (const scene of document.querySelectorAll<HTMLElement>('[data-moment]')) {
    scene.toggleAttribute('data-waiting', true);
    scene.querySelectorAll<HTMLElement>('[data-opens]').forEach((part) => {
      part.inert = true;
    });
    const control = scene.querySelector<HTMLElement>('[data-moment-control]');
    control?.addEventListener('click', () => open(scene));
    if (control?.hasAttribute('data-pull')) startPull(control, () => open(scene));
  }
};
