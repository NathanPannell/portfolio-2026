// Offbooked's ad. Once the curtains are open the pieces slam on stage in turn: scroll decides when,
// CSS springs decide how, so a fast scroll still gets the full bounce. Scrolling back takes them
// off again. Layers shift at their own depth under the pointer, and the looping parts rest while
// the stage is out of view.

import { onProgress, reducedMotion } from './scroll';

export const startCollage = () => {
  const track = document.querySelector<HTMLElement>('[data-collage]');
  if (!track || reducedMotion()) return;
  const stage = track.querySelector<HTMLElement>('[data-stage]');
  const pieces = Array.from(track.querySelectorAll<HTMLElement>('[data-at]')).map((piece) => ({
    piece,
    at: Number(piece.dataset['at']),
  }));
  onProgress(track, (progress) => {
    for (const { piece, at } of pieces) piece.toggleAttribute('data-on', progress >= at);
  });

  track.querySelectorAll<HTMLElement>('[data-depth]').forEach((layer) => {
    layer.style.setProperty('--d', layer.dataset['depth'] ?? '0');
  });

  new IntersectionObserver(([entry]) => {
    stage?.toggleAttribute('data-live', entry?.isIntersecting ?? false);
  }).observe(track);

  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  let frame = 0;
  let x = 0;
  let y = 0;
  track.addEventListener(
    'pointermove',
    (event) => {
      x = event.clientX / window.innerWidth - 0.5;
      y = event.clientY / window.innerHeight - 0.5;
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        track.style.setProperty('--mx', x.toFixed(3));
        track.style.setProperty('--my', y.toFixed(3));
      });
    },
    { passive: true },
  );
};
