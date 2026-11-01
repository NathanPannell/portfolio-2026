// AI Build Night's cover. Its cursor is where the steps open out from, and its Enter key thoccs.

import { soundOnPress, thocc } from './sound';

export const startCover = () => {
  const cover = document.querySelector<HTMLElement>('[data-cover]');
  const cursor = cover?.querySelector<HTMLElement>('[data-cursor]');
  const key = cover?.querySelector<HTMLElement>('[data-moment-control]');
  if (!cover || !cursor || !key || !cover.hasAttribute('data-waiting')) return;
  soundOnPress(key, thocc);

  const measure = () => {
    if (!cover.hasAttribute('data-waiting')) return;
    const box = cover.getBoundingClientRect();
    const mark = cursor.getBoundingClientRect();
    const sides = [mark.top - box.top, box.right - mark.right, box.bottom - mark.bottom];
    const inset = [...sides, mark.left - box.left].map((side) => `${side.toFixed(1)}px`);
    cover.style.setProperty('--cursor', inset.join(' '));
  };
  measure();
  void document.fonts.ready.then(measure);
  window.addEventListener('resize', measure);
};
