// Parkdex's trip down the vine. The route is ordinary page content, so it scrolls and tabs like any
// other. Kip stays put on screen and follows the vine's curve as it slides past, the forest moves
// at its own speeds behind and in front, each stop scores points, and Plant! sticks a flag in the
// vine wherever Kip is.

import { onProgress, reducedMotion } from './scroll';

const FLAGS = ['#ff5a1f', '#7a3fb0', '#1fa08d', '#f7c948', '#e0483a', '#2b6cd4'];
const KIP = ['KLEEP!', 'Mine now!', 'Nice flag.', 'Again!', 'Sorry, Sam!'];
// As drawn in vine.svg: one full curve is 1200 tall on a tile 460 wide, swinging 84 either way.
const VINE_PERIOD = 1200 / 460;
const VINE_SWING = 84 / 460;

export const startDescent = () => {
  const track = document.querySelector<HTMLElement>('[data-descent]');
  const vine = track?.querySelector<HTMLElement>('[data-vine]');
  const rider = track?.querySelector<HTMLElement>('[data-rider]');
  const canopy = track?.querySelector<HTMLElement>('[data-canopy]');
  const ground = track?.querySelector<HTMLElement>('[data-ground]');
  const stageFront = track?.querySelector<HTMLElement>('[data-front]');
  const scoreLabel = track?.querySelector<HTMLElement>('[data-score]');
  const kip = track?.querySelector<HTMLElement>('[data-kip]');
  const button = track?.querySelector<HTMLButtonElement>('[data-plant]');
  if (!track || !vine || !rider || !canopy || !ground || !stageFront) return;
  if (!scoreLabel || !kip || !button || reducedMotion()) return;

  const layers = Array.from(track.querySelectorAll<HTMLElement>('[data-layer]')).map((element) => ({
    element,
    speed: Number(element.dataset['layer']),
  }));
  const stops = Array.from(track.querySelectorAll<HTMLElement>('[data-stop]'));
  const poses = Array.from(rider.querySelectorAll<HTMLElement>('[data-pose]'));

  let score = 0;
  let plants = 0;

  const award = (points: number) => {
    score += points;
    scoreLabel.textContent = String(score);
    const pop = document.createElement('span');
    pop.className = 'pk-points';
    pop.textContent = `+${points}`;
    pop.style.translate = `${Math.round(Math.random() * 60 - 30)}px 0`;
    // On a timer, because a scene's animations rest while it is off screen.
    window.setTimeout(() => pop.remove(), 900);
    stageFront.append(pop);
  };

  // Where Kip's feet are along the vine, in pixels from the vine's top.
  const riderDepth = () =>
    rider.getBoundingClientRect().top + rider.offsetHeight / 2 - vine.getBoundingClientRect().top;

  const onFrame = () => {
    const height = window.innerHeight;
    const width = vine.offsetWidth;
    const depth = riderDepth();
    const phase = (depth / (width * VINE_PERIOD)) * Math.PI * 2;
    const x = Math.sin(phase) * width * VINE_SWING;
    const lean = Math.cos(phase) * -11;
    rider.style.transform = `translate3d(${x.toFixed(1)}px, 0, 0) rotate(${lean.toFixed(1)}deg)`;

    const travelled = window.scrollY - (track.getBoundingClientRect().top + window.scrollY);
    for (const { element, speed } of layers) {
      // Each layer is two tiles tall and wraps, so a long trip never needs a huge image.
      const tile = element.offsetHeight / 2;
      if (tile === 0) continue;
      const offset = ((Math.max(0, travelled) * speed) % tile) * -1;
      element.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
    }

    const groundTop = ground.getBoundingClientRect().top;
    stageFront.toggleAttribute('data-done', groundTop < height * 0.72);
    stageFront.toggleAttribute(
      'data-forest',
      canopy.getBoundingClientRect().top < height * 0.2 && groundTop > height * 0.8,
    );

    for (const stop of stops) {
      if (stop.hasAttribute('data-reached')) continue;
      if (stop.getBoundingClientRect().top > height * 0.62) continue;
      stop.toggleAttribute('data-reached', true);
      award(12);
    }

    // Kip waves at the sky, then points the way down once the forest closes in.
    const deep = stops[0]?.hasAttribute('data-reached') ?? false;
    poses.forEach((pose, index) => pose.toggleAttribute('data-on', index === (deep ? 1 : 0)));
  };

  button.addEventListener('click', () => {
    plants += 1;
    award(6);
    const mark = document.createElement('i');
    mark.className = 'pk-mark';
    mark.style.top = `${Math.round(riderDepth())}px`;
    mark.style.left = `${50 + Math.sin((riderDepth() / (vine.offsetWidth * VINE_PERIOD)) * Math.PI * 2) * VINE_SWING * 100}%`;
    mark.style.setProperty('--flag', FLAGS[plants % FLAGS.length] ?? '#ff5a1f');
    vine.append(mark);
    if (vine.childElementCount > 12) vine.firstElementChild?.remove();
    kip.textContent = KIP[plants % KIP.length] ?? 'KLEEP!';
  });

  // Safari can leave a pinned button off screen when it takes keyboard focus. Clicks focus it too,
  // and must not move the page out from under the pointer.
  button.addEventListener('focus', () => {
    if (!button.matches(':focus-visible')) return;
    const { top } = track.getBoundingClientRect();
    if (top > 0) window.scrollTo({ top: top + window.scrollY, behavior: 'instant' });
  });

  onProgress(track, onFrame);
  window.addEventListener('resize', onFrame);
  onFrame();
};
