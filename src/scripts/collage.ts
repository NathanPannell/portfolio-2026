// Offbooked's ad. Once the curtains open CSS brings the pieces on stage in turn. This shifts the
// finished layers at their own depth under the pointer.

import { reducedMotion } from './motion';

export const startCollage = () => {
  const scene = document.querySelector<HTMLElement>('[data-collage]');
  if (!scene || reducedMotion()) return;

  scene.querySelectorAll<HTMLElement>('[data-depth]').forEach((layer) => {
    layer.style.setProperty('--d', layer.dataset['depth'] ?? '0');
  });

  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  let frame = 0;
  let x = 0;
  let y = 0;
  scene.addEventListener(
    'pointermove',
    (event) => {
      x = event.clientX / window.innerWidth - 0.5;
      y = event.clientY / window.innerHeight - 0.5;
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        scene.style.setProperty('--mx', x.toFixed(3));
        scene.style.setProperty('--my', y.toFixed(3));
      });
    },
    { passive: true },
  );
};
