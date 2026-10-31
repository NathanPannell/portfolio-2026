// Parkdex's side-scrolling level. Vertical scrolling pans the strip, each phone planted along the
// way scores points, and the Plant! button sticks a flag in the ground for fun.

import { onProgress, reducedMotion, remeasure } from './scroll';

const FLAGS = ['#ff5a1f', '#7a3fb0', '#1fa08d', '#f7c948', '#e0483a', '#2b6cd4'];
const KIP = ['KLEEP!', 'Mine now!', 'Sorry, Sam!', 'Nice flag.', 'Again!'];

export const startLevel = () => {
  const track = document.querySelector<HTMLElement>('[data-level]');
  const strip = track?.querySelector<HTMLElement>('[data-strip]');
  if (!track || !strip || reducedMotion()) return;

  const stage = strip.parentElement as HTMLElement;
  const scoreLabel = stage.querySelector<HTMLElement>('[data-score]');
  const kip = stage.querySelector<HTMLElement>('[data-kip]');
  const planted = stage.querySelector<HTMLElement>('[data-planted]');
  const button = stage.querySelector<HTMLButtonElement>('[data-plant]');
  const spots = Array.from(strip.querySelectorAll<HTMLElement>('[data-spot]'));
  if (!scoreLabel || !kip || !planted || !button) return;

  let travel = 0;
  let score = 0;
  let plants = 0;
  let progress = 0;

  const measure = () => {
    const previous = track.style.getPropertyValue('--travel');
    travel = Math.max(0, strip.scrollWidth - window.innerWidth);
    const next = `${travel}px`;
    if (previous === next) return;
    track.style.setProperty('--travel', next);
    // A steady pace: one pixel of scroll moves the level about one pixel.
    track.style.height = `${Math.round(travel * 1.1 + window.innerHeight)}px`;
    remeasure();
  };

  const award = (points: number) => {
    score += points;
    scoreLabel.textContent = String(score);
    const pop = document.createElement('span');
    pop.className = 'pk-points';
    pop.textContent = `+${points}`;
    pop.style.translate = `${Math.round(Math.random() * 60 - 30)}px 0`;
    pop.addEventListener('animationend', () => pop.remove());
    stage.append(pop);
  };

  onProgress(track, (next) => {
    progress = Math.min(1, Math.max(0, (next - 0.08) / 0.84));
    stage.toggleAttribute('data-done', progress > 0.96);
    const screenX = progress * travel + window.innerWidth * 0.72;
    for (const spot of spots) {
      if (spot.hasAttribute('data-reached') || spot.offsetLeft > screenX) continue;
      spot.toggleAttribute('data-reached', true);
      award(12);
    }
  });

  button.addEventListener('click', () => {
    plants += 1;
    award(6);
    const mark = document.createElement('i');
    mark.className = 'pk-mark';
    mark.style.left = `${Math.round(8 + Math.random() * 84)}%`;
    mark.style.setProperty('--flag', FLAGS[plants % FLAGS.length] ?? '#ff5a1f');
    planted.append(mark);
    if (planted.childElementCount > 12) planted.firstElementChild?.remove();
    kip.textContent = KIP[plants % KIP.length] ?? 'KLEEP!';
  });

  // A keyboard user tabbing into the strip should land where the focused link is on screen.
  strip.addEventListener('focusin', (event) => {
    const target = event.target as HTMLElement;
    const block = target.closest<HTMLElement>('.pk-end, .pk-spot, .pk-intro');
    if (!block || travel === 0) return;
    const wanted = 0.08 + Math.min(1, block.offsetLeft / travel) * 0.84;
    const top = track.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: top + wanted * (track.offsetHeight - window.innerHeight) });
  });

  let lastWidth = window.innerWidth;
  window.addEventListener('resize', () => {
    if (window.innerWidth === lastWidth) return;
    lastWidth = window.innerWidth;
    measure();
  });
  window.addEventListener('load', measure);
  measure();
};
