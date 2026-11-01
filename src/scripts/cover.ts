// AI Build Night's cover. Its cursor is where the steps open out from, and its Enter key thoccs.

import { play, thocc } from './sound';

const startKey = (key: HTMLElement) => {
  let struck = false;

  const strike = () => {
    struck = true;
    play(thocc);
  };

  // A mouse can sound on the way down. A finger only counts as a gesture for audio when it lifts,
  // which is the click, and so does the keyboard.
  key.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    strike();
    // After the click, if there is one. A press dragged off the key has none.
    window.addEventListener(
      'pointerup',
      () => {
        window.setTimeout(() => {
          struck = false;
        });
      },
      { once: true },
    );
  });
  key.addEventListener('click', () => {
    if (!struck) strike();
  });
};

export const startCover = () => {
  const cover = document.querySelector<HTMLElement>('[data-cover]');
  const cursor = cover?.querySelector<HTMLElement>('[data-cursor]');
  const key = cover?.querySelector<HTMLElement>('[data-moment-control]');
  if (!cover || !cursor || !key || !cover.hasAttribute('data-waiting')) return;
  startKey(key);

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
