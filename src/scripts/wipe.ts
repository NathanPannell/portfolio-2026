// The crayon wipe into Play by the Sandbox. It has its own pinned stage, so nothing underneath can
// show through, and the bands chase the scroll position instead of copying it: a fast flick or a
// wheel jump still plays the whole thing, it just plays faster.

import { onProgress, reducedMotion } from './scroll';

const clamp = (value: number) => Math.min(1, Math.max(0, value));
// Roughly how long, in milliseconds, the bands take to close most of the gap to the scroll position.
const CHASE = 110;

export const startWipe = () => {
  const track = document.querySelector<HTMLElement>('[data-wipe]');
  const paper = track?.querySelector<HTMLElement>('[data-paper]');
  if (!track || !paper || reducedMotion()) return;
  const bands = Array.from(track.querySelectorAll<HTMLElement>('[data-band]'));

  let target = 0;
  let shown = 0;
  let frame = 0;
  let before = 0;

  const draw = () => {
    bands.forEach((band, index) => {
      const direction = index % 2 === 0 ? -1 : 1;
      const start = index * 0.085;
      const covered = clamp((shown - start) / 0.25);
      const eased = 1 - (1 - covered) ** 2;
      // Clear of the screen at rest: the band, plus its ragged edge and the crayon drawing it.
      band.style.transform = `translate3d(calc(${(1 - eased) * direction} * (100% + 34vmin)), 0, 0)`;
    });
    // The paper arrives over a finished rainbow, and ends exactly as Sandbox's own background.
    const rise = clamp((shown - 0.68) / 0.3);
    paper.style.transform = `translate3d(0, ${(1 - rise * rise * (3 - 2 * rise)) * 102}%, 0)`;
  };

  const chase = (now: number) => {
    const elapsed = Math.min(50, now - before);
    before = now;
    shown += (target - shown) * (1 - Math.exp(-elapsed / CHASE));
    if (Math.abs(target - shown) < 0.002) shown = target;
    draw();
    frame = shown === target ? 0 : window.requestAnimationFrame(chase);
  };

  onProgress(track, (next) => {
    target = next;
    if (frame) return;
    before = performance.now();
    frame = window.requestAnimationFrame(chase);
  });
  draw();
};
