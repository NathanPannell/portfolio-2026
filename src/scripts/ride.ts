// Parkdex's ride. Planting the flag sends Kip down the vine on a timer: the sky lifts away, the forest
// moves at its own speeds behind and in front, and Kip follows the vine's curve all the way to the
// clearing, where each stop swings in. A second button sends Kip on down to the park at the bottom
// of the vine with the page following, and off the end. Arriving there by scrolling plays the end of
// that trip, so Kip always makes the jump.

import { jump as jumpSound, plant as plantSound, play, ride as rideSound, slide } from './sound';

const FLAG = '#ff5a1f';
// As drawn in vine.svg: one full curve is 1200 tall on a tile 460 wide, swinging 84 either way.
const VINE_PERIOD = 1200 / 460;
const VINE_SWING = 84 / 460;
// How long the ride takes, and the beat the flag gets before it starts, in milliseconds.
const RIDE = 2800;
const BEAT = 520;
// The slide on down, and the jump off the end, in milliseconds.
const SLIDE = 2200;
const JUMP = 720;
// How high the jump goes above the higher of its two ends, in pixels.
const HOP = 90;

const clamp = (value: number) => Math.min(1, Math.max(0, value));
const ease = (value: number) => (value < 0.5 ? 4 * value ** 3 : 1 - (-2 * value + 2) ** 3 / 2);

const startSlide = (
  trip: HTMLElement,
  vine: HTMLElement,
  forest: HTMLElement,
  swing: (depth: number) => number,
) => {
  const ground = trip.querySelector<HTMLElement>('[data-ground]');
  const end = trip.querySelector<HTMLElement>('[data-vine-end]');
  const diver = trip.querySelector<HTMLElement>('[data-diver]');
  const spot = trip.querySelector<HTMLElement>('[data-kip-spot]');
  const button = trip.querySelector<HTMLElement>('[data-slide]');
  if (!ground || !end || !diver || !spot || !button) return undefined;
  const poses = Array.from(diver.querySelectorAll<HTMLElement>('[data-pose]'));
  let gone = false;

  const sectionY = (element: HTMLElement) =>
    element.getBoundingClientRect().top - trip.getBoundingClientRect().top;

  // In the section's own pixels, where Kip's middle is on the vine.
  const place = (y: number) => {
    const size = diver.offsetHeight;
    const depth = forest.offsetTop + y;
    const x = vine.getBoundingClientRect().left - trip.getBoundingClientRect().left;
    const left = x + vine.offsetWidth / 2 + swing(depth) - size / 2;
    diver.style.transform = `translate3d(${left.toFixed(1)}px, ${(y - size / 2).toFixed(1)}px, 0)`;
    return left;
  };

  // The vine carries on down here at the same point in its curve.
  const line = () => {
    const tile = vine.offsetWidth * VINE_PERIOD;
    const shift = (forest.offsetTop + sectionY(ground)) % tile;
    end.style.backgroundPositionY = `${(-shift).toFixed(1)}px`;
  };

  const jump = (heard: boolean) => {
    if (heard) play(jumpSound(JUMP / 1000));
    const size = diver.offsetHeight;
    const fromY = sectionY(end) + end.offsetHeight;
    const fromX = place(fromY);
    const box = spot.getBoundingClientRect();
    const area = trip.getBoundingClientRect();
    const toX = box.left - area.left + (box.width - size) / 2;
    const toY = box.top - area.top + (box.height - size) / 2;
    poses.forEach((pose, index) => pose.toggleAttribute('data-on', index === 0));
    const start = performance.now();
    const step = (now: number) => {
      const elapsed = clamp((now - start) / JUMP);
      const arc = 1 - (2 * elapsed - 1) ** 2;
      const x = fromX + (toX - fromX) * elapsed;
      const y = fromY - size / 2 + (toY - fromY + size / 2) * elapsed - arc * HOP;
      const turn = elapsed * 360;
      diver.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${turn.toFixed(0)}deg)`;
      if (elapsed < 1) {
        window.requestAnimationFrame(step);
        return;
      }
      trip.removeAttribute('data-diving');
      trip.toggleAttribute('data-jumped', true);
    };
    window.requestAnimationFrame(step);
  };

  // Down the vine from `from` to its end. With `follow`, the page comes too, until any input.
  const dive = (from: number, follow: boolean) => {
    gone = true;
    // The button is about to leave, so the next Tab carries on from where this trip ends.
    if (document.activeElement === button) ground.focus({ preventScroll: true });
    trip.toggleAttribute('data-diving', true);
    poses.forEach((pose, index) => pose.toggleAttribute('data-on', index === 1));
    const to = sectionY(end) + end.offsetHeight;
    const pageFrom = window.scrollY;
    const pageTo = ground.getBoundingClientRect().top + window.scrollY;
    // Only the trip someone asked for makes a sound. Arriving by scrolling is silent.
    if (follow) play(slide(SLIDE / 1000));
    const start = performance.now();
    const width = window.innerWidth;
    let following = follow;
    const letGo = () => {
      following = false;
    };
    // A turned phone has a different page, and the old target means nothing on it.
    const onResize = () => {
      if (window.innerWidth !== width) letGo();
    };
    const events = ['wheel', 'touchstart', 'keydown', 'pointerdown'];
    if (follow) {
      events.forEach((type) => {
        window.addEventListener(type, letGo, { passive: true, once: true });
      });
      window.addEventListener('resize', onResize, { passive: true });
    }
    const step = (now: number) => {
      const elapsed = clamp((now - start) / (follow ? SLIDE : SLIDE / 2));
      const eased = ease(elapsed);
      place(from + (to - from) * eased);
      if (following) {
        window.scrollTo({ top: pageFrom + (pageTo - pageFrom) * eased, behavior: 'instant' });
      }
      if (elapsed < 1) {
        window.requestAnimationFrame(step);
        return;
      }
      events.forEach((type) => {
        window.removeEventListener(type, letGo);
      });
      window.removeEventListener('resize', onResize);
      jump(follow);
    };
    window.requestAnimationFrame(step);
  };

  trip.addEventListener('moment:open', line);
  window.addEventListener('resize', line);

  button.addEventListener('click', () => {
    if (gone) return;
    // From just above the top of the screen, once Kip has a size to measure.
    trip.toggleAttribute('data-diving', true);
    dive(-trip.getBoundingClientRect().top - diver.offsetHeight, true);
  });

  const arrival = new IntersectionObserver(
    ([entry]) => {
      if (!entry?.isIntersecting) return;
      arrival.disconnect();
      if (!gone) dive(sectionY(ground), false);
    },
    { threshold: 0.5 },
  );
  // From the landing, not the press: the park appears as the flag goes in, and a visitor part way
  // down the screen can have it in view for a moment before the page frames itself.
  return () => arrival.observe(ground);
};

export const startRide = () => {
  const trip = document.querySelector<HTMLElement>('[data-trip]');
  const world = trip?.querySelector<HTMLElement>('[data-world]');
  const forest = trip?.querySelector<HTMLElement>('[data-forest-floor]');
  const vine = trip?.querySelector<HTMLElement>('[data-vine]');
  const rider = trip?.querySelector<HTMLElement>('[data-rider]');
  if (!trip || !world || !forest || !vine || !rider || !trip.hasAttribute('data-waiting')) return;

  const layers = Array.from(trip.querySelectorAll<HTMLElement>('[data-layer]')).map((element) => ({
    element,
    speed: Number(element.dataset['layer']),
  }));
  const poses = Array.from(rider.querySelectorAll<HTMLElement>('[data-pose]'));
  let landed = false;

  // How far Kip is off the vine's centre line at this depth, in pixels.
  const swing = (depth: number) => {
    const width = vine.offsetWidth;
    return Math.sin((depth / (width * VINE_PERIOD)) * Math.PI * 2) * width * VINE_SWING;
  };

  const watchTheGround = startSlide(trip, vine, forest, swing);

  // Where Kip is along the vine, in pixels from the vine's top.
  const riderDepth = () =>
    rider.getBoundingClientRect().top + rider.offsetHeight / 2 - vine.getBoundingClientRect().top;

  const place = (travelled: number) => {
    world.style.transform = `translate3d(0, ${(-travelled).toFixed(1)}px, 0)`;
    const depth = riderDepth();
    const phase = (depth / (vine.offsetWidth * VINE_PERIOD)) * Math.PI * 2;
    const lean = Math.cos(phase) * -11;
    const x = swing(depth);
    rider.style.transform = `translate3d(${x.toFixed(1)}px, 0, 0) rotate(${lean.toFixed(1)}deg)`;
    for (const { element, speed } of layers) {
      // Each layer is two tiles tall and wraps, so it can pass at any speed.
      const tile = element.offsetHeight / 2;
      if (tile === 0) continue;
      const offset = ((travelled * speed) % tile) * -1;
      element.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
    }
  };

  const land = () => {
    landed = true;
    place(forest.offsetTop);
    trip.removeAttribute('data-riding');
    trip.toggleAttribute('data-landed', true);
    trip.dispatchEvent(new CustomEvent('moment:landed'));
    watchTheGround?.();
  };

  const ride = () => {
    const distance = forest.offsetTop;
    const start = performance.now();
    play(rideSound(RIDE / 1000));
    trip.toggleAttribute('data-riding', true);
    // Kip waves at the sky, then points the way down.
    poses.forEach((pose, index) => pose.toggleAttribute('data-on', index === 1));
    const step = (now: number) => {
      const elapsed = clamp((now - start) / RIDE);
      place(ease(elapsed) * distance);
      if (elapsed < 1) window.requestAnimationFrame(step);
      else land();
    };
    window.requestAnimationFrame(step);
  };

  const plant = () => {
    play(plantSound);
    const mark = document.createElement('i');
    mark.className = 'pk-mark';
    const depth = riderDepth();
    mark.style.top = `${Math.round(depth)}px`;
    mark.style.left = `${50 + (swing(depth) / vine.offsetWidth) * 100}%`;
    mark.style.setProperty('--flag', FLAG);
    vine.append(mark);
    window.setTimeout(ride, BEAT);
  };

  place(0);
  trip.addEventListener('moment:open', plant);

  window.addEventListener('resize', () => {
    if (!trip.hasAttribute('data-riding')) place(landed ? forest.offsetTop : 0);
  });
};
