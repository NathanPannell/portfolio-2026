// Offbooked's collage: layers shift at their own depth under the pointer, and the run-through lines
// light up one at a time as they cross the middle of the screen.

import { reducedMotion } from './scroll';

export const startCollage = () => {
  const collage = document.querySelector<HTMLElement>('[data-collage]');
  const run = document.querySelector<HTMLElement>('[data-lines]');
  if (run) {
    const lines = run.querySelectorAll<HTMLElement>('[data-line]');
    if (reducedMotion()) {
      lines.forEach((line) => line.toggleAttribute('data-on', true));
    } else {
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) entry.target.toggleAttribute('data-on', true);
          }
        },
        { rootMargin: '-45% 0px -35% 0px' },
      );
      lines.forEach((line) => observer.observe(line));
    }
  }

  if (!collage || reducedMotion()) return;
  collage.querySelectorAll<HTMLElement>('[data-depth]').forEach((layer) => {
    layer.style.setProperty('--d', layer.dataset['depth'] ?? '0');
  });

  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  let frame = 0;
  let x = 0;
  let y = 0;
  collage.addEventListener(
    'pointermove',
    (event) => {
      x = event.clientX / window.innerWidth - 0.5;
      y = event.clientY / window.innerHeight - 0.5;
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        collage.style.setProperty('--mx', x.toFixed(3));
        collage.style.setProperty('--my', y.toFixed(3));
      });
    },
    { passive: true },
  );
};
